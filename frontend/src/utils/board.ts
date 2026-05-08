// ─── Board utilities ────────────────────────────────────────────────────────

export const BOARD_SIZE = 10;

export type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk';

export interface Cell {
  state: CellState;
  shipId?: string;
}

export type Board = Cell[][];

export const EMPTY_BOARD: Board = Array.from({ length: BOARD_SIZE }, () =>
  Array.from({ length: BOARD_SIZE }, () => ({ state: 'empty' as CellState }))
);

export function createBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ({ state: 'empty' as CellState }))
  );
}

export const COLS = ['A','B','C','D','E','F','G','H','I','J'];
export const ROWS = [1,2,3,4,5,6,7,8,9,10];

export function cellLabel(row: number, col: number): string {
  return `${COLS[col]}${ROWS[row]}`;
}

export interface Ship {
  id: string;
  type: ShipType;
  size: number;
  positions: [number, number][];
  orientation: 'H' | 'V';
  sunk?: boolean;
}

export type ShipType = 'Destroyer' | 'Submarine' | 'Cruiser' | 'Battleship' | 'Carrier';

export const SHIP_SIZES: Record<ShipType, number> = {
  Destroyer:  2,
  Submarine:  3,
  Cruiser:    3,
  Battleship: 4,
  Carrier:    5,
};

export const SHIP_LIST: ShipType[] = [
  'Carrier', 'Battleship', 'Cruiser', 'Submarine', 'Destroyer',
];

export function canPlace(
  board: Board,
  row: number,
  col: number,
  size: number,
  orientation: 'H' | 'V'
): boolean {
  for (let i = 0; i < size; i++) {
    const r = orientation === 'V' ? row + i : row;
    const c = orientation === 'H' ? col + i : col;
    if (r >= BOARD_SIZE || c >= BOARD_SIZE) return false;
    if (board[r][c].state !== 'empty') return false;
  }
  return true;
}

export function placeShipOnBoard(
  board: Board,
  ship: Ship
): Board {
  const next = board.map(r => r.map(c => ({ ...c })));
  for (const [r, c] of ship.positions) {
    next[r][c] = { state: 'ship', shipId: ship.id };
  }
  return next;
}

export function applyAttack(
  board: Board,
  row: number,
  col: number,
  result: 'hit' | 'miss' | 'sunk'
): Board {
  const next = board.map(r => r.map(c => ({ ...c })));
  next[row][col].state = result === 'miss' ? 'miss' : result === 'sunk' ? 'sunk' : 'hit';
  return next;
}

export function serializePositions(ships: Ship[]): string {
  // Encodes all ship positions as hex string for on-chain submission
  // Format: each cell as 1 byte (row << 4 | col), ships separated
  return ships
    .flatMap(s => s.positions.map(([r, c]) => ((r << 4) | c).toString(16).padStart(2, '0')))
    .join('');
}
