export type GamePhase =
  | 'WaitingForOpponent'
  | 'PlacingShips'
  | 'InProgress'
  | 'Finished';

export interface ShipPlacement {
  shipIndex: number;
  x: number;
  y: number;
  length: number;
  isVertical: boolean;
}

export type CellState =
  | 'empty'
  | 'ship'
  | 'hit'
  | 'miss'
  | 'sunk';

export interface BoardCell {
  state: CellState;
  shipIndex?: number;
}

export interface GameStateView {
  creator: string;
  opponent?: string;
  bet: string;
  phase: GamePhase;
  currentTurn: number;
  winner?: string;
  tournamentId?: number;
  tournamentMatchId?: number;
  myShipsAlive?: number;
  oppShipsAlive?: number;
}
