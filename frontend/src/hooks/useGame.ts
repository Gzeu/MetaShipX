import { useState, useCallback } from 'react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import * as battleshipService from '../services/battleship.service';
import type { GameState, BoardGrid, CellState, PlacedShip, ShipType } from '../types';
import { BOARD_SIZE, SHIP_SIZES } from '../utils/constants';

function emptyBoard(): BoardGrid {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill('empty') as CellState[]);
}

interface UseGameReturn {
  gameState: GameState | null;
  loading: boolean;
  error: string | null;
  placedShips: PlacedShip[];
  isMyTurn: boolean;
  // actions
  createGame: (wagerEgld: string) => Promise<void>;
  joinGame: (gameId: string, wagerEgld: string) => Promise<void>;
  placeShip: (type: ShipType, row: number, col: number, horizontal: boolean) => boolean;
  submitPlacement: () => Promise<void>;
  attack: (row: number, col: number) => Promise<void>;
  refresh: (gameId: string) => Promise<void>;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
}

export function useGame(): UseGameReturn {
  const { account } = useGetAccountInfo();
  const address = account.address;

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [placedShips, setPlacedShips] = useState<PlacedShip[]>([]);

  const isMyTurn = gameState?.currentTurn === address;

  const run = useCallback(async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  const createGame = useCallback(async (wagerEgld: string) => {
    await run(() => battleshipService.createGame(address, wagerEgld));
  }, [address, run]);

  const joinGame = useCallback(async (gameId: string, wagerEgld: string) => {
    await run(() => battleshipService.joinGame(address, gameId, wagerEgld));
  }, [address, run]);

  // Returns false if placement is invalid
  const placeShip = useCallback((type: ShipType, row: number, col: number, horizontal: boolean): boolean => {
    const size = SHIP_SIZES[type];
    const cells: Array<{ row: number; col: number }> = [];
    for (let i = 0; i < size; i++) {
      const r = horizontal ? row : row + i;
      const c = horizontal ? col + i : col;
      if (r >= BOARD_SIZE || c >= BOARD_SIZE) return false;
      cells.push({ row: r, col: c });
    }
    // Collision check
    const occupied = new Set(placedShips.flatMap(s => s.cells.map(cell => `${cell.row},${cell.col}`)));
    if (cells.some(cell => occupied.has(`${cell.row},${cell.col}`))) return false;

    const ship: PlacedShip = {
      id: `${type}-${Date.now()}`,
      type,
      size,
      cells,
      hits: 0,
      sunk: false,
    };
    setPlacedShips(prev => [...prev, ship]);
    return true;
  }, [placedShips]);

  const submitPlacement = useCallback(async () => {
    if (!gameState) return;
    await run(() => battleshipService.placeShips(address, gameState.gameId, placedShips));
  }, [address, gameState, placedShips, run]);

  const attack = useCallback(async (row: number, col: number) => {
    if (!gameState) return;
    // Optimistic update
    setGameState(prev => {
      if (!prev) return prev;
      const board = prev.opponentBoard.map(r => [...r]) as BoardGrid;
      board[row][col] = 'miss'; // will be corrected on next poll
      return { ...prev, opponentBoard: board };
    });
    await run(() => battleshipService.attack(address, gameState.gameId, row, col));
  }, [address, gameState, run]);

  const refresh = useCallback(async (gameId: string) => {
    const state = await run(() => battleshipService.getGameState(address, gameId));
    if (state) setGameState(state);
  }, [address, run]);

  return {
    gameState, loading, error, placedShips, isMyTurn,
    createGame, joinGame, placeShip, submitPlacement, attack, refresh, setGameState,
  };
}
