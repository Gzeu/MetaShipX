/**
 * MetaShipX — Game TypeScript Types
 */

import { CellState } from '../utils/board';

export type GamePhase =
  | 'WaitingForOpponent'
  | 'PlacingShips'
  | 'InProgress'
  | 'Finished';

export type AttackResult = 'Hit' | 'Miss' | 'Sunk' | 'GameOver';

export interface GameState {
  gameId: string;
  creator: string;
  opponent: string | null;
  bet: string;           // raw EGLD denomination
  phase: GamePhase;
  currentTurn: number;   // 0 = creator, 1 = opponent
  winner: string | null;
  winnerShipNonce: number;
  tournamentId: number;
  tournamentMatchId: number;
}

export interface ShipData {
  cells: number[];
  hits: number;
  length: number;
  sunk: boolean;
}

export interface PlacedShip {
  type: string;
  nonce: number;         // NFT nonce
  x: number;
  y: number;
  length: number;
  isVertical: boolean;
  cells: number[];
}

export interface BoardState {
  myGrid: CellState[][];
  enemyGrid: CellState[][];
  myShips: PlacedShip[];
}

export interface AttackEvent {
  gameId: string;
  attacker: string;
  x: number;
  y: number;
  result: AttackResult;
  timestamp: number;
}

export interface GameListItem {
  gameId: string;
  creator: string;
  bet: string;
  phase: GamePhase;
  createdAt: number;
}
