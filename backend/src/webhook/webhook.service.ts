import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventsGateway } from '../events/events.gateway';
import { GameEvent } from './game-event.entity';

// ─── MultiversX transaction webhook payload ───────────────────────────────────
export interface MxTxWebhookPayload {
  txHash: string;
  status: 'success' | 'fail' | 'pending';
  receiver: string;         // smart contract address
  sender: string;
  data: string;             // base64 encoded calldata
  timestamp: number;
  events?: MxLogEvent[];
}

export interface MxLogEvent {
  identifier: string;       // e.g. "attackFired", "gameCreated"
  topics: string[];         // base64 encoded topics
  data?: string;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly eventsGateway: EventsGateway,
    @InjectRepository(GameEvent)
    private readonly gameEventRepo: Repository<GameEvent>,
  ) {}

  async handleTransaction(payload: MxTxWebhookPayload): Promise<void> {
    if (payload.status !== 'success') return;

    const events = payload.events ?? [];

    for (const event of events) {
      await this.processEvent(event, payload);
    }
  }

  private async processEvent(
    event: MxLogEvent,
    tx: MxTxWebhookPayload,
  ): Promise<void> {
    this.logger.log(`Processing event: ${event.identifier} | tx: ${tx.txHash}`);

    // Decode base64 topics
    const topics = event.topics.map(t => Buffer.from(t, 'base64').toString());

    switch (event.identifier) {
      case 'gameCreated': {
        const [gameId, player1, betHex] = topics;
        const payload = { gameId, player1, bet: parseInt(betHex, 16) / 1e18, txHash: tx.txHash };
        await this.persist('gameCreated', gameId, payload, tx.txHash);
        this.eventsGateway.broadcastToLobby('game:created', payload);
        break;
      }

      case 'playerJoined': {
        const [gameId, player2] = topics;
        const payload = { gameId, player2, txHash: tx.txHash };
        await this.persist('playerJoined', gameId, payload, tx.txHash);
        this.eventsGateway.broadcastToGame(gameId, 'game:player_joined', payload);
        this.eventsGateway.broadcastToSpectators(gameId, 'spectator:player_joined', payload);
        break;
      }

      case 'shipsPlaced': {
        const [gameId, player] = topics;
        const payload = { gameId, player, txHash: tx.txHash };
        await this.persist('shipsPlaced', gameId, payload, tx.txHash);
        this.eventsGateway.broadcastToGame(gameId, 'game:ships_placed', payload);
        break;
      }

      case 'attackFired': {
        const [gameId, attacker, rowHex, colHex, resultHex] = topics;
        const row    = parseInt(rowHex, 16);
        const col    = parseInt(colHex, 16);
        const result = this.decodeAttackResult(parseInt(resultHex, 16));
        const payload = { gameId, attacker, row, col, result, txHash: tx.txHash };
        await this.persist('attackFired', gameId, payload, tx.txHash);
        // Broadcast to players (with sensitive result)
        this.eventsGateway.broadcastToGame(gameId, 'game:attack', payload);
        // Broadcast to spectators (same data — spectators see everything)
        this.eventsGateway.broadcastToSpectators(gameId, 'spectator:attack', payload);
        break;
      }

      case 'shipSunk': {
        const [gameId, victim, shipTypeHex] = topics;
        const shipType = this.decodeShipType(parseInt(shipTypeHex, 16));
        const payload = { gameId, victim, shipType, txHash: tx.txHash };
        await this.persist('shipSunk', gameId, payload, tx.txHash);
        this.eventsGateway.broadcastToGame(gameId, 'game:ship_sunk', payload);
        this.eventsGateway.broadcastToSpectators(gameId, 'spectator:ship_sunk', payload);
        break;
      }

      case 'gameEnded': {
        const [gameId, winner, rewardHex] = topics;
        const reward = parseInt(rewardHex, 16) / 1e18;
        const payload = { gameId, winner, reward, txHash: tx.txHash };
        await this.persist('gameEnded', gameId, payload, tx.txHash);
        this.eventsGateway.broadcastToGame(gameId, 'game:ended', payload);
        this.eventsGateway.broadcastToSpectators(gameId, 'spectator:game_ended', payload);
        this.eventsGateway.broadcastToLobby('game:ended', { gameId, winner });
        break;
      }

      default:
        this.logger.debug(`Unhandled event: ${event.identifier}`);
    }
  }

  private async persist(
    type: string,
    gameId: string,
    data: object,
    txHash: string,
  ): Promise<void> {
    try {
      await this.gameEventRepo.save(
        this.gameEventRepo.create({ type, gameId, data, txHash }),
      );
    } catch (err) {
      this.logger.error(`Failed to persist event ${type}`, err);
    }
  }

  private decodeAttackResult(code: number): string {
    const map: Record<number, string> = { 0: 'miss', 1: 'hit', 2: 'sunk', 3: 'win' };
    return map[code] ?? 'unknown';
  }

  private decodeShipType(code: number): string {
    const map: Record<number, string> = {
      0: 'Destroyer', 1: 'Submarine', 2: 'Cruiser', 3: 'Battleship', 4: 'Carrier',
    };
    return map[code] ?? 'Unknown';
  }
}
