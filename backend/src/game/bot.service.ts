import { Injectable } from '@nestjs/common';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface BotState {
  difficulty: Difficulty;
  attacked: boolean[][];       // cells already attacked
  hitStack: [number, number][]; // unresolved hits (medium/hard)
  probabilityMap: number[][];   // hard mode density map
}

@Injectable()
export class BotService {
  createBot(difficulty: Difficulty): BotState {
    return {
      difficulty,
      attacked: Array.from({ length: 10 }, () => new Array(10).fill(false)),
      hitStack: [],
      probabilityMap: this.initProbabilityMap(),
    };
  }

  getNextMove(state: BotState): [number, number] {
    switch (state.difficulty) {
      case 'easy':   return this.randomMove(state);
      case 'medium': return this.huntTargetMove(state);
      case 'hard':   return this.probabilityMove(state);
    }
  }

  recordResult(state: BotState, row: number, col: number, hit: boolean): void {
    state.attacked[row][col] = true;
    if (hit) {
      if (state.difficulty !== 'easy') state.hitStack.push([row, col]);
      if (state.difficulty === 'hard') this.boostNeighbors(state, row, col);
    }
    if (state.difficulty === 'hard') state.probabilityMap[row][col] = 0;
  }

  // ── EASY ──────────────────────────────────────────────────────────────────
  private randomMove(state: BotState): [number, number] {
    const available: [number, number][] = [];
    for (let r = 0; r < 10; r++)
      for (let c = 0; c < 10; c++)
        if (!state.attacked[r][c]) available.push([r, c]);
    return available[Math.floor(Math.random() * available.length)];
  }

  // ── MEDIUM: classic hunt/target ───────────────────────────────────────────
  private huntTargetMove(state: BotState): [number, number] {
    while (state.hitStack.length > 0) {
      const [hr, hc] = state.hitStack[state.hitStack.length - 1];
      const neighbors = this.getNeighbors(state, hr, hc);
      if (neighbors.length > 0)
        return neighbors[Math.floor(Math.random() * neighbors.length)];
      state.hitStack.pop();
    }
    return this.randomMove(state);
  }

  // ── HARD: probability density map ─────────────────────────────────────────
  private probabilityMove(state: BotState): [number, number] {
    let maxP = -1;
    let best: [number, number] = [0, 0];
    for (let r = 0; r < 10; r++)
      for (let c = 0; c < 10; c++)
        if (!state.attacked[r][c] && state.probabilityMap[r][c] > maxP) {
          maxP = state.probabilityMap[r][c];
          best = [r, c];
        }
    return best;
  }

  private initProbabilityMap(): number[][] {
    return Array.from({ length: 10 }, (_, r) =>
      Array.from({ length: 10 }, (_, c) =>
        Math.min(r, 9 - r) + Math.min(c, 9 - c) + 1
      )
    );
  }

  private boostNeighbors(state: BotState, row: number, col: number): void {
    this.getNeighbors(state, row, col).forEach(([r, c]) => {
      state.probabilityMap[r][c] += 5;
    });
  }

  private getNeighbors(state: BotState, row: number, col: number): [number, number][] {
    return ([[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]] as [number, number][])
      .filter(([r, c]) => r >= 0 && r < 10 && c >= 0 && c < 10 && !state.attacked[r][c]);
  }
}
