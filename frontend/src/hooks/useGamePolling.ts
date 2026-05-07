import { useEffect, useRef } from 'react';
import type { GamePhase } from '../types/game.types';

const POLL_INTERVALS: Record<string, number> = {
  WaitingForOpponent: 5000,
  PlacingShips: 4000,
  InProgress: 3000,
};

/**
 * Polls `refreshFn` at an interval determined by the current game phase.
 * Stops automatically when phase is Finished or undefined.
 */
export function useGamePolling(
  refreshFn: () => Promise<void>,
  phase: GamePhase | undefined
): void {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshRef = useRef(refreshFn);
  refreshRef.current = refreshFn;

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!phase || phase === 'Finished') return;

    const interval = POLL_INTERVALS[phase] ?? 5000;
    // Initial fetch immediately
    refreshRef.current();
    timerRef.current = setInterval(() => refreshRef.current(), interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);
}
