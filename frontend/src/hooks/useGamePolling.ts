/**
 * useGamePolling — real-time game state sync
 *
 * Strategy (Supernova-tuned, 600 ms block time):
 *   • MY_TURN:  600 ms — matches block cadence, player sees result in ≤1 block
 *   • WAITING:  1 500 ms — aggressive but not spammy while opponent acts
 *   • Back-off cap: 10 s (was 30 s — long gaps feel broken at 600 ms blocks)
 *   • Stops polling when game is finished or component unmounts
 *   • Exposes `lastUpdated` timestamp for UI freshness indicator
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { battleshipService, GameState } from '../services/battleship.service';

export type PollingStatus = 'idle' | 'polling' | 'error' | 'stopped';

export interface UseGamePollingResult {
  gameState:    GameState | null;
  status:       PollingStatus;
  lastUpdated:  number | null;   // Date.now() of last successful fetch
  errorCount:   number;
  forceRefresh: () => void;
}

// ── Supernova intervals (600 ms block time) ──────────────────────────────────
// MY_TURN: poll every block so the player's own tx confirmation appears
// immediately — no waiting a full second after the chain confirms.
const BASE_INTERVAL_MY_TURN = 600;    // ms — 1 block
// WAITING: half a second more than a block. Catches the opponent's move
// within ~2 blocks without hammering the RPC.
const BASE_INTERVAL_WAITING = 1_500;  // ms — ~2.5 blocks
// Back-off cap: 10 s. At 600 ms blocks a 30 s gap looks like the game froze.
const MAX_BACK_OFF          = 10_000; // ms

const FINISHED_PHASES = new Set(['Finished', 'Cancelled', 'WaitingForPlayer']);

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
  const errorRef     = useRef(0);
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

      if (FINISHED_PHASES.has(state.phase)) {
        setStatus('stopped');
        return;
      }

      // Adaptive interval: fast when it's our turn, moderate when waiting
      const isMyTurn =
        (state.phase === 'PlayerATurn' && state.playerA?.toLowerCase() === myAddress.toLowerCase()) ||
        (state.phase === 'PlayerBTurn' && state.playerB?.toLowerCase() === myAddress.toLowerCase());

      scheduleNext(isMyTurn ? BASE_INTERVAL_MY_TURN : BASE_INTERVAL_WAITING);
    } catch {
      if (!mountedRef.current) return;
      errorRef.current += 1;
      setErrorCount(errorRef.current);
      setStatus('error');

      // Exponential back-off: 1.5 s → 3 s → 6 s → 10 s (capped)
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
