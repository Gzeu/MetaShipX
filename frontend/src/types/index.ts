// ─── Game ────────────────────────────────────────────────────────────────────
export type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk';

export interface Cell {
  row: number;
  col: number;
  state: CellState;
}

export type BoardGrid = CellState[][];

export interface PlacedShip {
  id: string;
  type: ShipType;
  size: number;
  cells: Array<{ row: number; col: number }>;
  hits: number;
  sunk: boolean;
}

export type ShipType = 'Destroyer' | 'Submarine' | 'Cruiser' | 'Battleship' | 'Carrier';

export type GameStatus = 0 | 1 | 2 | 3; // Created | Active | Finished | Cancelled

export interface GameState {
  gameId: string;
  status: GameStatus;
  player1: string;
  player2: string;
  currentTurn: string;
  wager: string;          // EGLD denomination
  myBoard: BoardGrid;
  opponentBoard: BoardGrid;
  myShips: PlacedShip[];
  winner: string | null;
  lastMoveAt: number | null;
  turnTimeoutSec: number;
}

// ─── NFT ─────────────────────────────────────────────────────────────────────
export interface ShipMetadata {
  nonce: number;
  shipType: ShipType;
  name: string;
  level: number;
  wins: number;
  owner: string;
  mintedAt: number;
}

// ─── Staking ─────────────────────────────────────────────────────────────────
export interface StakingInfo {
  stakedAmount: string;   // EGLD denomination
  pendingRewards: string;
  stakedAt: number;       // timestamp ms
  apr: number;            // basis points e.g. 2000 = 20%
  rewardPool: string;
  totalStaked: string;
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────
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

// ─── Tournament ──────────────────────────────────────────────────────────────
export type TournamentStatus = 'upcoming' | 'registration' | 'active' | 'finished';

export interface BracketMatch {
  matchId: string;
  round: number;
  player1: string | null;
  player2: string | null;
  winner: string | null;
  gameId: string | null;
}

export interface Tournament {
  id: string;
  name: string;
  status: TournamentStatus;
  entryFee: string;
  prizePool: string;
  maxPlayers: number;
  currentPlayers: number;
  players: string[];
  startTime: number;
  endTime: number | null;
  winner: string | null;
  bracket: BracketMatch[];
}

// ─── API ─────────────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: number;
  cached?: boolean;
}
