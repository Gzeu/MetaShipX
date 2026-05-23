/**
 * MetaShipX AI Bot Service
 * Three difficulty levels:
 *   Easy   — pure random (no memory)
 *   Medium — Hunt/Target algorithm (industry standard Battleship AI)
 *   Hard   — Probability Density Map (optimal strategy)
 */

export type Difficulty = 'easy' | 'medium' | 'hard';
export type CellState = 'empty' | 'miss' | 'hit' | 'sunk';

export interface BotState {
  difficulty: Difficulty;
  /** 10x10 grid of what the bot knows about the player's board */
  knownBoard: CellState[][];
  /** Cells the bot has already attacked */
  attacked: Set<string>;
  /** Hunt mode: list of adjacent cells to try after a hit */
  huntStack: [number, number][];
  /** Last hit for direction locking */
  lastHit: [number, number] | null;
  /** Direction locked after 2+ hits in a row */
  direction: 'h' | 'v' | null;
}

export function createBotState(difficulty: Difficulty): BotState {
  return {
    difficulty,
    knownBoard: Array.from({ length: 10 }, () => Array(10).fill('empty')),
    attacked: new Set(),
    huntStack: [],
    lastHit: null,
    direction: null,
  };
}

/** Record result of bot's last attack */
export function recordAttackResult(
  state: BotState,
  row: number,
  col: number,
  result: 'miss' | 'hit' | 'sunk'
): BotState {
  const next = { ...state, knownBoard: state.knownBoard.map(r => [...r]), huntStack: [...state.huntStack] };
  next.knownBoard[row][col] = result;

  if (result === 'hit') {
    if (state.lastHit) {
      const [lr, lc] = state.lastHit;
      if (lr === row) next.direction = 'h';
      else if (lc === col) next.direction = 'v';
    }
    next.lastHit = [row, col];
    // Push adjacent cells onto hunt stack
    const adj = getAdjacent(row, col).filter(([r, c]) => !state.attacked.has(`${r},${c}`));
    if (next.direction === 'h') {
      next.huntStack = adj.filter(([r]) => r === row);
    } else if (next.direction === 'v') {
      next.huntStack = adj.filter(([, c]) => c === col);
    } else {
      next.huntStack = [...next.huntStack, ...adj];
    }
  } else if (result === 'sunk') {
    next.huntStack = [];
    next.lastHit = null;
    next.direction = null;
  }

  return next;
}

/** Get the next attack coordinate based on difficulty */
export function getNextAttack(state: BotState): [number, number] {
  switch (state.difficulty) {
    case 'easy': return randomAttack(state);
    case 'medium': return huntTargetAttack(state);
    case 'hard': return probabilityAttack(state);
  }
}

function randomAttack(state: BotState): [number, number] {
  const available = getAllAvailable(state);
  return available[Math.floor(Math.random() * available.length)];
}

function huntTargetAttack(state: BotState): [number, number] {
  // Target mode: use hunt stack if we have hits to follow
  while (state.huntStack.length > 0) {
    const [r, c] = state.huntStack[state.huntStack.length - 1];
    if (!state.attacked.has(`${r},${c}`)) return [r, c];
    state.huntStack.pop();
  }
  // Hunt mode: attack on parity grid (checkerboard) for efficiency
  const parity = getAllAvailable(state).filter(([r, c]) => (r + c) % 2 === 0);
  if (parity.length > 0) return parity[Math.floor(Math.random() * parity.length)];
  return randomAttack(state);
}

function probabilityAttack(state: BotState): [number, number] {
  const density = buildProbabilityMap(state);
  let best: [number, number] = [0, 0];
  let max = -1;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (!state.attacked.has(`${r},${c}`) && density[r][c] > max) {
        max = density[r][c];
        best = [r, c];
      }
    }
  }
  return best;
}

function buildProbabilityMap(state: BotState): number[][] {
  const density = Array.from({ length: 10 }, () => Array(10).fill(0));
  const shipSizes = [5, 4, 3, 3, 2]; // Standard Battleship fleet

  for (const size of shipSizes) {
    // Horizontal placements
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c <= 10 - size; c++) {
        const cells: [number, number][] = Array.from({ length: size }, (_, i) => [r, c + i]);
        if (canPlaceShip(state, cells)) cells.forEach(([cr, cc]) => density[cr][cc]++);
      }
    }
    // Vertical placements
    for (let r = 0; r <= 10 - size; r++) {
      for (let c = 0; c < 10; c++) {
        const cells: [number, number][] = Array.from({ length: size }, (_, i) => [r + i, c]);
        if (canPlaceShip(state, cells)) cells.forEach(([cr, cc]) => density[cr][cc]++);
      }
    }
  }
  return density;
}

function canPlaceShip(state: BotState, cells: [number, number][]): boolean {
  return cells.every(([r, c]) => state.knownBoard[r][c] !== 'miss' && state.knownBoard[r][c] !== 'sunk');
}

function getAllAvailable(state: BotState): [number, number][] {
  const result: [number, number][] = [];
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 10; c++)
      if (!state.attacked.has(`${r},${c}`)) result.push([r, c]);
  return result;
}

function getAdjacent(row: number, col: number): [number, number][] {
  return ([
    [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1],
  ] as [number, number][]).filter(([r, c]) => r >= 0 && r < 10 && c >= 0 && c < 10);
}
