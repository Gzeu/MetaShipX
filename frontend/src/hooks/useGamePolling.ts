/**
 * useGamePolling — real-time game state sync
 *
 * Strategy:
 *   • Adaptive interval: 2s when it's the player's turn, 5s otherwise
 *   • Exponential back-off on consecutive errors (max 30s)
 *   • Stops polling when game is finished or component unmounts
 *   • Exposes `lastUpdated` timestamp for UI freshness indicator
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { battleshipService, GameState } from '../services/battleship.service';

export type PollingStatus = 'idle' | 'polling' | 'error' | 'stopped';

export interface UseGamePollingResult {
  gameState:   GameState | null;
  status:      PollingStatus;
  lastUpdated: number | null;   // Date.now() of last successful fetch
  errorCount:  number;
  forceRefresh: () => void;
}

const BASE_INTERVAL_MY_TURN  = 2_000;   // 2 s  — fast when player must act
const BASE_INTERVAL_WAITING  = 5_000;   // 5 s  — slower when waiting
const MAX_BACK_OFF           = 30_000;  // 30 s cap
const FINISHED_PHASES        = new Set(['Finished', 'Cancelled', 'WaitingForPlayer']);

export function useGamePolling(
  gameId: number | null,
  myAddress: string,
): UseGamePollingResult {
  const [gameState,   setGameState]   = useState<GameState | null>(null);
  const [status,      setStatus]      = useState<PollingStatus>('idle');
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [errorCount,  setErrorCount]  = useState(0);

  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef   = useRef(true);
  const errorRef     = useRef(0);       // shadow state for back-off calc
  const gameStateRef = useRef<GameState | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const scheduleNext = useCallback((interval: number) => {
    clearTimer();
    timerRef.current = setTimeout(() => poll(), interval); // eslint-disable-line
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const poll = useCallback(async () => {
    if (!mountedRef.current || gameId === null) return;

    try {
      const state = await battleshipService.getGameState(gameId);
      if (!mountedRef.current) return;

      errorRef.current = 0;
      setErrorCount(0);
      setGameState(state);
      setLastUpdated(Date.now());
      setStatus('polling');
      gameStateRef.current = state;

      // Stop when game over
      if (FINISHED_PHASES.has(state.phase)) {
        setStatus('stopped');
        return;
      }

      // Adaptive interval based on whose turn it is
      const isMyTurn =
        state.phase === 'PlayerATurn' && state.playerA?.toLowerCase() === myAddress.toLowerCase() ||
        state.phase === 'PlayerBTurn' && state.playerB?.toLowerCase() === myAddress.toLowerCase();

      scheduleNext(isMyTurn ? BASE_INTERVAL_MY_TURN : BASE_INTERVAL_WAITING);
    } catch {
      if (!mountedRef.current) return;
      errorRef.current += 1;
      setErrorCount(errorRef.current);
      setStatus('error');

      // Exponential back-off: 5s, 10s, 20s, 30s, 30s...
      const backOff = Math.min(
        BASE_INTERVAL_WAITING * Math.pow(2, errorRef.current - 1),
        MAX_BACK_OFF,
      );
      scheduleNext(backOff);
    }
  }, [gameId, myAddress, scheduleNext]);

  const forceRefresh = useCallback(() => {
    clearTimer();
    poll();
  }, [poll]);

  // Start / restart polling when gameId changes
  useEffect(() => {
    mountedRef.current = true;
    if (gameId === null) {
      setStatus('idle');
      return;
    }
    setStatus('polling');
    poll();

    return () => {
      mountedRef.current = false;
      clearTimer();
    };
  }, [gameId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { gameState, status, lastUpdated, errorCount, forceRefresh };
}
