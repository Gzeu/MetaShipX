import { useState, useCallback } from 'react';
import {
  battleshipService,
  AttackResult,
} from '../services/battleship.service';
import type { ShipPlacement, GameStateView, CellState } from '../types/game.types';

const emptyBoard = (): CellState[][] =>
  Array.from({ length: 10 }, () => Array(10).fill('empty'));

export interface UseGameReturn {
  gameState: GameStateView | null;
  myBoard: CellState[][];
  opponentBoard: CellState[][];
  isLoading: boolean;
  error: string | null;
  refreshGame: () => Promise<void>;
  setMyBoard: React.Dispatch<React.SetStateAction<CellState[][]>>;
  setOpponentBoard: React.Dispatch<React.SetStateAction<CellState[][]>>;
}

/**
 * useGame — fetches and holds state for a specific game by ID.
 * Used by GamePage.tsx which owns the action handlers directly.
 */
export function useGame(gameId: number): UseGameReturn {
  const [gameState, setGameState] = useState<GameStateView | null>(null);
  const [myBoard, setMyBoard] = useState<CellState[][]>(emptyBoard());
  const [opponentBoard, setOpponentBoard] = useState<CellState[][]>(emptyBoard());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshGame = useCallback(async () => {
    if (!gameId && gameId !== 0) return;
    setIsLoading(true);
    try {
      const raw = await battleshipService.getGameState(gameId);
      // Map service GameState → GameStateView (canonicalize nulls → undefined)
      const view: GameStateView = {
        creator: raw.creator,
        opponent: raw.opponent ?? undefined,
        bet: raw.bet,
        phase: raw.phase as GameStateView['phase'],
        currentTurn: raw.currentTurn,
        winner: raw.winner ?? undefined,
      };
      setGameState(view);
    } catch (e: any) {
      setError(e?.message ?? 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  return { gameState, myBoard, opponentBoard, isLoading, error, refreshGame, setMyBoard, setOpponentBoard };
}
