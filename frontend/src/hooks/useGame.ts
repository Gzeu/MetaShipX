import { useState, useCallback } from 'react';
import {
  createGame,
  joinGame,
  placeShips,
  attack,
  withdraw,
  getGameState,
  GameState,
  AttackResult,
  ShipPlacement,
} from '../services/battleship.service';

export type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk';

export interface UseGameReturn {
  gameId: number | null;
  gameState: GameState | null;
  myBoard: CellState[][];
  opponentBoard: CellState[][];
  loading: boolean;
  error: string | null;
  handleCreateGame: (betEgld: string) => Promise<void>;
  handleJoinGame: (gId: number, betEgld: string) => Promise<void>;
  handlePlaceShips: (ships: ShipPlacement[]) => Promise<void>;
  handleAttack: (x: number, y: number) => Promise<AttackResult | null>;
  handleWithdraw: () => Promise<void>;
  refreshGameState: () => Promise<void>;
  setMyBoard: React.Dispatch<React.SetStateAction<CellState[][]>>;
}

const emptyBoard = (): CellState[][] =>
  Array.from({ length: 10 }, () => Array(10).fill('empty'));

export function useGame(): UseGameReturn {
  const [gameId, setGameId] = useState<number | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myBoard, setMyBoard] = useState<CellState[][]>(emptyBoard());
  const [opponentBoard, setOpponentBoard] = useState<CellState[][]>(emptyBoard());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshGameState = useCallback(async () => {
    if (gameId === null) return;
    try {
      const state = await getGameState(gameId);
      setGameState(state);
    } catch (e: any) {
      setError(e.message);
    }
  }, [gameId]);

  const handleCreateGame = useCallback(async (betEgld: string) => {
    setLoading(true); setError(null);
    try {
      await createGame(betEgld);
      // Game ID will be extracted from transaction result in production
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleJoinGame = useCallback(async (gId: number, betEgld: string) => {
    setLoading(true); setError(null);
    try {
      await joinGame(gId, betEgld);
      setGameId(gId);
      await getGameState(gId).then(setGameState);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePlaceShips = useCallback(async (ships: ShipPlacement[]) => {
    if (gameId === null) return;
    setLoading(true); setError(null);
    try {
      // Update local board to show ship positions
      const board = emptyBoard();
      ships.forEach((s) => {
        for (let i = 0; i < s.length; i++) {
          const r = s.isVertical ? s.x + i : s.x;
          const c = s.isVertical ? s.y : s.y + i;
          if (r < 10 && c < 10) board[r][c] = 'ship';
        }
      });
      setMyBoard(board);
      await placeShips(gameId, ships);
      await refreshGameState();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [gameId, refreshGameState]);

  const handleAttack = useCallback(async (x: number, y: number): Promise<AttackResult | null> => {
    if (gameId === null) return null;
    setLoading(true); setError(null);
    try {
      await attack(gameId, x, y);
      // Optimistic update — will be confirmed on next poll
      setOpponentBoard((prev) => {
        const next = prev.map((row) => [...row]);
        // Mark as hit (will be corrected by state poll)
        next[x][y] = 'hit';
        return next;
      });
      await refreshGameState();
      return 'Hit'; // Actual result comes from tx events
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [gameId, refreshGameState]);

  const handleWithdraw = useCallback(async () => {
    if (gameId === null) return;
    setLoading(true); setError(null);
    try {
      await withdraw(gameId);
      setGameState(null);
      setGameId(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  return {
    gameId, gameState, myBoard, opponentBoard, loading, error,
    handleCreateGame, handleJoinGame, handlePlaceShips,
    handleAttack, handleWithdraw, refreshGameState, setMyBoard,
  };
}
