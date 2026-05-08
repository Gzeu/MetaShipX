/**
 * ABI-derived TypeScript types for all MetaShipX smart contracts.
 * These mirror the on-chain struct definitions exactly.
 */

// ============================================================
// Battleship Contract
// ============================================================

export type CellState = 'Empty' | 'Ship' | 'Hit' | 'Miss';
export type GameStatus = 'WaitingForPlayers' | 'PlacingShips' | 'InProgress' | 'Finished' | 'Cancelled';

export interface GameState {
  gameId: number;
  player1: string;
  player2: string | null;
  currentTurn: string | null;
  status: GameStatus;
  betAmount: string;       // wei
  winner: string | null;
  createdAt: number;       // unix timestamp
  lastMoveAt: number;
}

export interface AttackResult {
  row: number;
  col: number;
  hit: boolean;
  sunk: boolean;
  gameOver: boolean;
  winner: string | null;
}

// ============================================================
// NFT / SFT Contract
// ============================================================

export type ShipType = 'Destroyer' | 'Submarine' | 'Cruiser' | 'Battleship' | 'Carrier';
export type ShipRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export interface ShipMetadata {
  nonce: number;
  shipType: ShipType;
  name: string;
  level: number;        // 1-10
  wins: number;
  rarity: ShipRarity;
  mintedAt: number;
  owner: string;
}

export interface MintPrice {
  Destroyer:  string; // wei
  Submarine:  string;
  Cruiser:    string;
  Battleship: string;
  Carrier:    string;
}

// ============================================================
// Staking Contract
// ============================================================

export interface StakeInfo {
  address: string;
  amount: string;        // wei
  stakedAt: number;      // unix timestamp
  lastClaimedAt: number;
}

export interface StakingGlobals {
  totalStaked: string;   // wei
  rewardPool: string;    // wei
  aprBps: number;        // basis points (2000 = 20%)
}

// ============================================================
// Tournament Contract
// ============================================================

export type TournamentStatus = 'Open' | 'InProgress' | 'Finished' | 'Cancelled';

export interface Tournament {
  id: number;
  name: string;
  entryFee: string;      // wei
  prizePool: string;     // wei
  maxPlayers: number;
  currentPlayers: number;
  status: TournamentStatus;
  winner: string | null;
  createdAt: number;
}
