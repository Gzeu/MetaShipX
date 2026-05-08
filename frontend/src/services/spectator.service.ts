import { io, Socket } from 'socket.io-client';
import { SpectatorMatch, SpectatorAttackEvent } from '../types/spectator';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001';

const mockListings: SpectatorMatch[] = [
  {
    gameId: 'game-1001',
    creator: 'erd1alpha...1234',
    opponent: 'erd1beta...5678',
    bet: '500000000000000000',
    phase: 'InProgress',
    spectators: 18,
    currentTurn: 1,
    winner: null,
  },
  {
    gameId: 'game-1002',
    creator: 'erd1capt...9999',
    opponent: 'erd1fleet...7777',
    bet: '1000000000000000000',
    phase: 'InProgress',
    spectators: 33,
    currentTurn: 0,
    winner: null,
  },
];

export class SpectatorService {
  private socket: Socket | null = null;
  private listeners = new Map<string, (event: SpectatorAttackEvent) => void>();

  async getLiveMatches(): Promise<SpectatorMatch[]> {
    return Promise.resolve(mockListings);
  }

  async getMatchEvents(gameId: string): Promise<SpectatorAttackEvent[]> {
    return Promise.resolve([]);
  }

  /**
   * Connect to the spectator WebSocket namespace and subscribe to a game room.
   * Calls onAttack callback whenever a new attack event arrives.
   */
  watchGame(
    gameId: string,
    onAttack: (event: SpectatorAttackEvent) => void,
    onCount?: (count: number) => void
  ): () => void {
    if (!this.socket) {
      this.socket = io(`${BACKEND_URL}/spectator`, { transports: ['websocket'] });
    }

    this.socket.emit('watch', { gameId });

    const attackHandler = (event: SpectatorAttackEvent) => {
      if (event.gameId === gameId) onAttack(event);
    };
    const countHandler = (data: { gameId: string; count: number }) => {
      if (data.gameId === gameId) onCount?.(data.count);
    };

    this.socket.on('attack_event', attackHandler);
    this.socket.on('spectator_count', countHandler);
    this.listeners.set(gameId, attackHandler);

    // Return cleanup / unsubscribe function
    return () => {
      this.socket?.emit('stop_watch', { gameId });
      this.socket?.off('attack_event', attackHandler);
      this.socket?.off('spectator_count', countHandler);
      this.listeners.delete(gameId);
    };
  }
}

export const spectatorService = new SpectatorService();
