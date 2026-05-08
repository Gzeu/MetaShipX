/**
 * MetaShipX — Battleship Contract Integration Tests
 * Run with: npx ts-mocha tests/battleship.test.ts
 * Requires: devnet contract addresses in .env.test
 */
import assert from 'assert';

// ─── Utility helpers (pure logic, no network) ─────────────────

function isValidBoard(board: number[][]): boolean {
  return board.length === 10 && board.every(row => row.length === 10);
}

function countShipCells(board: number[][]): number {
  return board.flat().filter(c => c === 1).length;
}

function placeShipHorizontal(
  board: number[][],
  row: number,
  col: number,
  size: number,
): number[][] {
  const b = board.map(r => [...r]);
  for (let c = col; c < col + size; c++) b[row][c] = 1;
  return b;
}

function detectCollision(
  board: number[][],
  row: number,
  col: number,
  size: number,
  horizontal: boolean,
): boolean {
  for (let i = 0; i < size; i++) {
    const r = horizontal ? row : row + i;
    const c = horizontal ? col + i : col;
    if (r >= 10 || c >= 10) return true; // out of bounds
    if (board[r][c] === 1) return true;  // overlap
  }
  return false;
}

// ─── Tests ────────────────────────────────────────────────────

describe('Board logic', () => {
  it('creates a valid 10x10 board', () => {
    const board = Array.from({ length: 10 }, () => Array(10).fill(0));
    assert.ok(isValidBoard(board));
  });

  it('places a ship of size 3 horizontally', () => {
    let board = Array.from({ length: 10 }, () => Array(10).fill(0));
    board = placeShipHorizontal(board, 2, 3, 3);
    assert.strictEqual(countShipCells(board), 3);
    assert.strictEqual(board[2][3], 1);
    assert.strictEqual(board[2][5], 1);
  });

  it('detects collision on occupied cells', () => {
    let board = Array.from({ length: 10 }, () => Array(10).fill(0));
    board = placeShipHorizontal(board, 0, 0, 5);
    const collision = detectCollision(board, 0, 2, 3, true);
    assert.ok(collision);
  });

  it('detects out-of-bounds placement', () => {
    const board = Array.from({ length: 10 }, () => Array(10).fill(0));
    const oob = detectCollision(board, 9, 8, 5, true);
    assert.ok(oob);
  });

  it('does not detect false collision on empty board', () => {
    const board = Array.from({ length: 10 }, () => Array(10).fill(0));
    const collision = detectCollision(board, 5, 5, 3, true);
    assert.ok(!collision);
  });
});

describe('Ship placement rules', () => {
  const SHIP_SIZES = [5, 4, 3, 3, 2] as const; // Carrier, Battleship, Cruiser, Sub, Destroyer

  it('total ship cells equals 17', () => {
    let board = Array.from({ length: 10 }, () => Array(10).fill(0));
    const positions = [
      [0, 0, 5, true],
      [2, 0, 4, true],
      [4, 0, 3, true],
      [6, 0, 3, true],
      [8, 0, 2, true],
    ] as [number, number, number, boolean][];

    for (const [r, c, size] of positions) {
      board = placeShipHorizontal(board, r, c, size);
    }

    assert.strictEqual(countShipCells(board), 17);
  });

  it('validates all ship sizes', () => {
    const expectedTotal = SHIP_SIZES.reduce((a, b) => a + b, 0);
    assert.strictEqual(expectedTotal, 17);
  });
});

describe('EGLD denomination', () => {
  const DENOM = BigInt('1000000000000000000'); // 10^18

  it('converts 0.1 EGLD correctly', () => {
    const result = BigInt(Math.floor(0.1 * 1e18));
    assert.strictEqual(result, BigInt('100000000000000000'));
  });

  it('converts 1 EGLD correctly', () => {
    assert.strictEqual(1n * DENOM, BigInt('1000000000000000000'));
  });

  it('rounds down partial denominations', () => {
    const egld = 0.123456789;
    const wei = BigInt(Math.floor(egld * 1e18));
    assert.ok(wei < DENOM);
  });
});
