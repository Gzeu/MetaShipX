/**
 * MetaShipX — Board & Ship Utilities
 */

export const BOARD_SIZE = 10;
export const SHIP_LENGTHS: Record<string, number> = {
  Destroyer: 2,
  Submarine: 3,
  Cruiser: 3,
  Battleship: 4,
  Carrier: 5,
};

export type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk';

export interface PlacedShip {
  type: string;
  x: number;
  y: number;
  length: number;
  isVertical: boolean;
  cells: number[];
}

/**
 * Encode (x, y) cell coordinate to flat index.
 */
export function encodeCell(x: number, y: number): number {
  return x * BOARD_SIZE + y;
}

/**
 * Decode flat cell index to (x, y) coordinate.
 */
export function decodeCell(cell: number): [number, number] {
  return [Math.floor(cell / BOARD_SIZE), cell % BOARD_SIZE];
}

/**
 * Get all cell indices occupied by a ship.
 */
export function getShipCells(ship: Omit<PlacedShip, 'cells'>): number[] {
  const cells: number[] = [];
  for (let step = 0; step < ship.length; step++) {
    const cx = ship.isVertical ? ship.x + step : ship.x;
    const cy = ship.isVertical ? ship.y : ship.y + step;
    cells.push(encodeCell(cx, cy));
  }
  return cells;
}

/**
 * Check if a ship placement is valid (in bounds, no overlaps).
 */
export function isValidPlacement(
  ship: Omit<PlacedShip, 'cells'>,
  existingCells: Set<number>
): boolean {
  const cells = getShipCells(ship);
  for (const cell of cells) {
    const [x, y] = decodeCell(cell);
    if (x >= BOARD_SIZE || y >= BOARD_SIZE || x < 0 || y < 0) return false;
    if (existingCells.has(cell)) return false;
  }
  return true;
}

/**
 * Build an empty 10×10 board state.
 */
export function emptyBoard(): CellState[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill('empty') as CellState[]
  );
}

/**
 * Column label (0→'A', 1→'B', ...)
 */
export function colLabel(col: number): string {
  return String.fromCharCode(65 + col);
}
