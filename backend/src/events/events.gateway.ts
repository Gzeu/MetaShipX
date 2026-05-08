import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL || '*', credentials: true },
  namespace: '/ws',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Client joins a game room to receive targeted events
  @SubscribeMessage('joinGame')
  handleJoinGame(
    @MessageBody() gameId: string,
    @ConnectedSocket() client: Socket,
  ): void {
    client.join(`game:${gameId}`);
    this.logger.log(`Client ${client.id} joined room game:${gameId}`);
  }

  @SubscribeMessage('leaveGame')
  handleLeaveGame(
    @MessageBody() gameId: string,
    @ConnectedSocket() client: Socket,
  ): void {
    client.leave(`game:${gameId}`);
  }

  // ── Broadcast helpers ──────────────────────────────────────────────────────

  broadcast(event: string, data: unknown): void {
    this.server.emit(event, data);
  }

  broadcastToGame(gameId: number | string, event: string, data: unknown): void {
    this.server.to(`game:${gameId}`).emit(event, data);
  }
}
