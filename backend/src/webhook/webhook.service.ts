import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHmac, timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { GameEvent, GameEventType } from './game-event.entity';
import { EventsGateway } from '../events/events.gateway';

interface MxNotifierTx {
  hash: string;
  receiver: string;
  sender: string;
  function?: string;
  events?: Array<{ identifier: string; topics: string[]; data?: string }>;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly secret: string;

  constructor(
    @InjectRepository(GameEvent)
    private readonly repo: Repository<GameEvent>,
    private readonly gateway: EventsGateway,
    private readonly cfg: ConfigService,
  ) {
    this.secret = cfg.getOrThrow<string>('WEBHOOK_SECRET');
  }

  // ── HMAC-SHA256 signature verification ──────────────────────────────────────
  verifySignature(rawBody: Buffer, signature: string): void {
    const expected = createHmac('sha256', this.secret)
      .update(rawBody)
      .digest('hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    const actualBuf = Buffer.from(signature.replace(/^sha256=/, ''), 'hex');
    if (
      expectedBuf.length !== actualBuf.length ||
      !timingSafeEqual(expectedBuf, actualBuf)
    ) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  // ── Main handler ─────────────────────────────────────────────────────────────
  async handleTransactions(txs: MxNotifierTx[]): Promise<void> {
    for (const tx of txs) {
      try {
        await this.processTx(tx);
      } catch (err) {
        this.logger.error(`Error processing tx ${tx.hash}: ${err}`);
      }
    }
  }

  private async processTx(tx: MxNotifierTx): Promise<void> {
    const eventType = this.resolveEventType(tx);
    const { gameId, row, col, result } = this.extractContext(tx);

    const entity = this.repo.create({
      txHash: tx.hash,
      contractAddress: tx.receiver,
      callerAddress: tx.sender,
      eventType,
      gameId,
      row,
      col,
      result,
      payload: { function: tx.function, events: tx.events } as any,
    });

    await this.repo.save(entity);

    // Broadcast via WebSocket to all connected clients
    this.gateway.broadcast(eventType, {
      txHash: tx.hash,
      gameId,
      row,
      col,
      result,
      caller: tx.sender,
    });

    this.logger.log(`[${eventType}] tx=${tx.hash} gameId=${gameId ?? '-'}`);
  }

  private resolveEventType(tx: MxNotifierTx): GameEventType {
    const fn = tx.function ?? '';
    const map: Record<string, GameEventType> = {
      createGame:     'gameCreated',
      joinGame:       'gameJoined',
      placeShips:     'shipsPlaced',
      attack:         'attacked',
      withdraw:       'withdrawn',
      mintShip:       'shipMinted',
      upgradeShip:    'shipUpgraded',
      stake:          'staked',
      unstake:        'unstaked',
      claimRewards:   'rewardsClaimed',
    };
    return map[fn] ?? 'unknown';
  }

  private extractContext(tx: MxNotifierTx): {
    gameId?: number;
    row?: number;
    col?: number;
    result?: string;
  } {
    // Topics are base64-encoded. Parse known events from mx-notifier payload.
    const attackEvent = tx.events?.find(e => e.identifier === 'attackResult');
    if (attackEvent?.topics?.length >= 4) {
      const [gameIdB64, rowB64, colB64, resultB64] = attackEvent.topics;
      return {
        gameId: parseInt(Buffer.from(gameIdB64, 'base64').toString('hex'), 16),
        row:    parseInt(Buffer.from(rowB64,    'base64').toString('hex'), 16),
        col:    parseInt(Buffer.from(colB64,    'base64').toString('hex'), 16),
        result: Buffer.from(resultB64, 'base64').toString('utf8'),
      };
    }
    const gameEvent = tx.events?.find(e =>
      ['gameCreated','gameJoined','shipsPlaced','gameWon'].includes(e.identifier)
    );
    if (gameEvent?.topics?.[0]) {
      const gameId = parseInt(
        Buffer.from(gameEvent.topics[0], 'base64').toString('hex'), 16
      );
      return { gameId };
    }
    return {};
  }
}
