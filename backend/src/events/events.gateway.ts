import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ── Client joins a game room ──────────────────────────────────────────────
  @SubscribeMessage('join:game')
  handleJoinGame(
    @MessageBody() gameId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`game:${gameId}`);
    this.logger.log(`${client.id} joined game:${gameId}`);
    return { ok: true };
  }

  // ── Client joins as spectator ─────────────────────────────────────────────
  @SubscribeMessage('join:spectate')
  handleJoinSpectate(
    @MessageBody() gameId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`spectate:${gameId}`);
    this.logger.log(`${client.id} spectating game:${gameId}`);
    // Acknowledge with spectator count
    const room = this.server.sockets.adapter.rooms.get(`spectate:${gameId}`);
    this.broadcastToGame(gameId, 'game:spectator_count', { count: room?.size ?? 1 });
    return { ok: true };
  }

  // ── Client joins lobby ────────────────────────────────────────────────────
  @SubscribeMessage('join:lobby')
  handleJoinLobby(@ConnectedSocket() client: Socket) {
    client.join('lobby');
    return { ok: true };
  }

  // ── Server → rooms ────────────────────────────────────────────────────────
  broadcastToGame(gameId: string, event: string, data: unknown) {
    this.server.to(`game:${gameId}`).emit(event, data);
  }

  broadcastToSpectators(gameId: string, event: string, data: unknown) {
    this.server.to(`spectate:${gameId}`).emit(event, data);
  }

  broadcastToLobby(event: string, data: unknown) {
    this.server.to('lobby').emit(event, data);
  }
}
