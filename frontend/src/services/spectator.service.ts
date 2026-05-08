import { SpectatorMatch, SpectatorAttackEvent } from '../types/spectator';

const liveMatches: SpectatorMatch[] = [
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

const liveEvents: Record<string, SpectatorAttackEvent[]> = {
  'game-1001': [
    { gameId: 'game-1001', x: 3, y: 4, result: 'Hit', attacker: 'erd1alpha...1234', timestamp: Math.floor(Date.now() / 1000) - 50 },
    { gameId: 'game-1001', x: 6, y: 2, result: 'Miss', attacker: 'erd1beta...5678', timestamp: Math.floor(Date.now() / 1000) - 25 },
  ],
  'game-1002': [
    { gameId: 'game-1002', x: 8, y: 8, result: 'Sunk', attacker: 'erd1capt...9999', timestamp: Math.floor(Date.now() / 1000) - 40 },
  ],
};

export class SpectatorService {
  async getLiveMatches(): Promise<SpectatorMatch[]> {
    return Promise.resolve(liveMatches);
  }

  async getMatchEvents(gameId: string): Promise<SpectatorAttackEvent[]> {
    return Promise.resolve(liveEvents[gameId] || []);
  }

  async watchGame(gameId: string): Promise<{ success: boolean; gameId: string }> {
    return Promise.resolve({ success: true, gameId });
  }
}

export const spectatorService = new SpectatorService();
