export interface LeaderboardEntry {
  rank: number;
  address: string;
  wins: number;
  losses: number;
  totalEarned: string; // wei string
}

export interface GlobalStats {
  totalGames: number;
  totalPlayers: number;
  totalVolumeEgld: string;
}

export interface PlayerStats {
  address: string;
  wins: number;
  losses: number;
  totalGames: number;
  totalEarned: string;
  winRate: number; // 0-100
}

export interface Tournament {
  id: number;
  name: string;
  entryFee: string;    // wei string
  prizePool: string;   // wei string
  maxPlayers: number;
  currentPlayers: number;
  status: 'Open' | 'InProgress' | 'Finished' | 'Cancelled';
  winner: string | null;
}

export interface ApiResponse<T> {
  data?: T;
  success: boolean;
  error?: string;
  meta?: {
    page?: number;
    total?: number;
    cached?: boolean;
  };
}

export interface WsMessage {
  type: 'attack' | 'game_over' | 'player_joined' | 'turn_change' | 'connected' | 'error';
  gameId: string;
  payload?: unknown;
  timestamp?: number;
}
