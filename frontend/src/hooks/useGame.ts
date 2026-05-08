import { useState, useCallback, useRef } from 'react';
import type { CellState, AttackResult } from '../components/GameBoard/GameBoard';
import * as BattleshipService from '../services/battleship.service';

type GameStatus = 'idle' | 'waiting' | 'placing' | 'active' | 'finished';

interface GameState {
  gameId: number | null;
  status: GameStatus;
  myBoard: CellState[];
  enemyBoard: CellState[];
  isMyTurn: boolean;
  winner: string | null;
  bet: string;
  lastAttack: AttackResult | null;
  loading: boolean;
  error: string | null;
}

const EMPTY_BOARD = (): CellState[] => Array(100).fill('empty');

export function useGame(myAddress: string) {
  const [state, setState] = useState<GameState>({
    gameId: null,
    status: 'idle',
    myBoard: EMPTY_BOARD(),
    enemyBoard: EMPTY_BOARD(),
    isMyTurn: false,
    winner: null,
    bet: '0',
    lastAttack: null,
    loading: false,
    error: null,
  });

  const attackLock = useRef(false);

  const setLoading = (loading: boolean) =>
    setState((s) => ({ ...s, loading }));

  const setError = (error: string | null) =>
    setState((s) => ({ ...s, error }));

  // ── Create / Join ──────────────────────────────────────────────────────────
  const createGame = useCallback(
    async (bet: string) => {
      setLoading(true);
      setError(null);
      try {
        const sessionId = await BattleshipService.createGame(myAddress, bet);
        setState((s) => ({ ...s, status: 'waiting', bet, loading: false }));
        return sessionId;
      } catch (e: any) {
        setError(e?.message ?? 'createGame failed');
        setLoading(false);
      }
    },
    [myAddress]
  );

  const joinGame = useCallback(
    async (gameId: number, bet: string) => {
      setLoading(true);
      setError(null);
      try {
        const sessionId = await BattleshipService.joinGame(myAddress, gameId, bet);
        setState((s) => ({ ...s, gameId, status: 'placing', bet, loading: false }));
        return sessionId;
      } catch (e: any) {
        setError(e?.message ?? 'joinGame failed');
        setLoading(false);
      }
    },
    [myAddress]
  );

  // ── Place ships ────────────────────────────────────────────────────────────
  const placeShips = useCallback(
    async (shipPositions: number[][]) => {
      if (!state.gameId) return;
      setLoading(true);
      try {
        // Optimistic: mark cells as 'ship'
        const nextBoard = [...state.myBoard];
        shipPositions.forEach(([r, c]) => { nextBoard[r * 10 + c] = 'ship'; });
        setState((s) => ({ ...s, myBoard: nextBoard }));
        const sessionId = await BattleshipService.placeShips(
          myAddress,
          state.gameId,
          shipPositions
        );
        setState((s) => ({ ...s, status: 'active', isMyTurn: true, loading: false }));
        return sessionId;
      } catch (e: any) {
        setError(e?.message ?? 'placeShips failed');
        setLoading(false);
      }
    },
    [myAddress, state.gameId, state.myBoard]
  );

  // ── Attack ─────────────────────────────────────────────────────────────────
  const handleAttack = useCallback(
    async (row: number, col: number) => {
      if (!state.gameId || !state.isMyTurn || attackLock.current) return;
      const idx = row * 10 + col;
      if (state.enemyBoard[idx] !== 'empty') return;

      attackLock.current = true;
      setLoading(true);
      setError(null);

      // Optimistic update — mark as 'miss' until confirmed
      const nextEnemy = [...state.enemyBoard];
      nextEnemy[idx] = 'miss';
      setState((s) => ({ ...s, enemyBoard: nextEnemy, isMyTurn: false }));

      try {
        const sessionId = await BattleshipService.attack(
          myAddress,
          state.gameId,
          row,
          col
        );

        // Poll for confirmed result (in production, use WebSocket event)
        const confirmed = await BattleshipService.pollAttackResult(
          state.gameId,
          row,
          col,
          sessionId
        );

        const result: AttackResult['result'] = confirmed?.result ?? 'miss';
        const gameOver = confirmed?.gameOver ?? false;
        const iWon = confirmed?.winner === myAddress;

        // Update board with confirmed result
        const confirmedEnemy = [...state.enemyBoard];
        confirmedEnemy[idx] = result === 'sunk' ? 'sunk' : result;

        const attackResult: AttackResult = {
          row, col, result,
          isMyAttack: true,
          gameOver,
          iWon,
        };

        setState((s) => ({
          ...s,
          enemyBoard: confirmedEnemy,
          isMyTurn: !gameOver && result === 'miss' ? false : !gameOver,
          status: gameOver ? 'finished' : 'active',
          winner: iWon ? myAddress : gameOver ? 'opponent' : null,
          lastAttack: attackResult,
          loading: false,
        }));
      } catch (e: any) {
        // Rollback optimistic update
        const rolled = [...state.enemyBoard];
        rolled[idx] = 'empty';
        setState((s) => ({
          ...s,
          enemyBoard: rolled,
          isMyTurn: true,
          error: e?.message ?? 'Attack failed',
          loading: false,
        }));
      } finally {
        attackLock.current = false;
      }
    },
    [myAddress, state.gameId, state.isMyTurn, state.enemyBoard]
  );

  // ── Receive enemy attack (called from WebSocket handler) ───────────────────
  const receiveEnemyAttack = useCallback(
    (row: number, col: number, result: AttackResult['result']) => {
      const idx = row * 10 + col;
      const nextBoard = [...state.myBoard];
      nextBoard[idx] = result === 'sunk' ? 'sunk' : result;

      const attackResult: AttackResult = {
        row, col, result,
        isMyAttack: false,
      };

      setState((s) => ({
        ...s,
        myBoard: nextBoard,
        isMyTurn: true,
        lastAttack: attackResult,
      }));
    },
    [state.myBoard]
  );

  const resetGame = useCallback(() => {
    setState({
      gameId: null,
      status: 'idle',
      myBoard: EMPTY_BOARD(),
      enemyBoard: EMPTY_BOARD(),
      isMyTurn: false,
      winner: null,
      bet: '0',
      lastAttack: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    createGame,
    joinGame,
    placeShips,
    handleAttack,
    receiveEnemyAttack,
    resetGame,
  };
}
