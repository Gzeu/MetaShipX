export interface LeaderboardEntry {
  rank: number;
  address: string;
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
  totalWagered: string;
  totalEarned: string;
}

export type TournamentStatus = 'upcoming' | 'registration' | 'active' | 'finished';

export interface Tournament {
  id: string;
  name: string;
  status: TournamentStatus;
  entryFee: string;       // EGLD denomination string
  prizePool: string;      // EGLD denomination string
  maxPlayers: number;
  currentPlayers: number;
  players: string[];      // bech32 addresses
  startTime: number;      // unix timestamp ms
  endTime: number | null;
  winner: string | null;
  bracket: BracketMatch[];
}

export interface BracketMatch {
  matchId: string;
  round: number;
  player1: string | null;
  player2: string | null;
  winner: string | null;
  gameId: string | null;
}

export interface GlobalStats {
  totalGames: number;
  totalPlayers: number;
  totalVolume: string;    // EGLD denomination
  activePlayers24h: number;
}

export interface PlayerStats {
  address: string;
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
  totalWagered: string;
  totalEarned: string;
  rank: number | null;
  shipsMinted: number;
  stakingBalance: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: number;
  cached?: boolean;
}

export interface ApiError {
  success: false;
  error: string;
  statusCode: number;
}
