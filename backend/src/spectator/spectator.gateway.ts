import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface WatchPayload {
  gameId: string;
}

interface StopPayload {
  gameId: string;
}

export interface BroadcastAttackPayload {
  gameId: string;
  x: number;
  y: number;
  result: 'Hit' | 'Miss' | 'Sunk' | 'GameOver';
  attacker: string;
  timestamp: number;
}

/**
 * SpectatorGateway — read-only WebSocket room per game.
 *
 * Clients join a room named `spectate:{gameId}` and receive
 * broadcasted attack events. They never receive private ship positions.
 *
 * The game service calls broadcastAttack() after each on-chain attack
 * is confirmed (via blockchain event listener or tx callback).
 */
@WebSocketGateway({ namespace: '/spectator', cors: { origin: '*' } })
export class SpectatorGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  // track spectator count per game
  private spectatorCount = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    console.log(`[Spectator] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    // Remove from all rooms on disconnect
    this.spectatorCount.forEach((clients, gameId) => {
      if (clients.delete(client.id) && clients.size === 0) {
        this.spectatorCount.delete(gameId);
      }
    });
  }

  @SubscribeMessage('watch')
  handleWatch(@MessageBody() payload: WatchPayload, @ConnectedSocket() client: Socket) {
    const room = `spectate:${payload.gameId}`;
    client.join(room);

    if (!this.spectatorCount.has(payload.gameId)) {
      this.spectatorCount.set(payload.gameId, new Set());
    }
    this.spectatorCount.get(payload.gameId)!.add(client.id);

    client.emit('spectator_count', {
      gameId: payload.gameId,
      count: this.spectatorCount.get(payload.gameId)!.size,
    });
    console.log(`[Spectator] ${client.id} watching game ${payload.gameId}`);
  }

  @SubscribeMessage('stop_watch')
  handleStopWatch(@MessageBody() payload: StopPayload, @ConnectedSocket() client: Socket) {
    const room = `spectate:${payload.gameId}`;
    client.leave(room);
    this.spectatorCount.get(payload.gameId)?.delete(client.id);
  }

  /**
   * Called by GameService after attack is confirmed on-chain.
   * Broadcasts to all spectators of the game.
   * IMPORTANT: Never include private grid data in this payload.
   */
  broadcastAttack(payload: BroadcastAttackPayload): void {
    const room = `spectate:${payload.gameId}`;
    this.server.to(room).emit('attack_event', payload);
  }

  getSpectatorCount(gameId: string): number {
    return this.spectatorCount.get(gameId)?.size ?? 0;
  }
}
