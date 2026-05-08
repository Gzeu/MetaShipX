export interface SpectatorMatch {
  gameId: string;
  creator: string;
  opponent: string;
  bet: string;
  phase: 'WaitingForOpponent' | 'PlacingShips' | 'InProgress' | 'Finished';
  spectators: number;
  currentTurn: number;
  winner?: string | null;
}

export interface SpectatorAttackEvent {
  gameId: string;
  x: number;
  y: number;
  result: 'Hit' | 'Miss' | 'Sunk' | 'GameOver';
  attacker: string;
  timestamp: number;
}
