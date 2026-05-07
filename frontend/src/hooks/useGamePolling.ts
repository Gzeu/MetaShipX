import { useEffect, useRef } from 'react';

type Phase = 'WaitingForOpponent' | 'PlacingShips' | 'InProgress' | 'Finished' | undefined;

/**
 * Polls `refreshFn` at an interval determined by the current game phase.
 * - WaitingForOpponent: every 5s
 * - PlacingShips:       every 4s
 * - InProgress:         every 3s
 * - Finished / other:   stops polling
 */
export function useGamePolling(refreshFn: () => Promise<void>, phase: Phase) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const intervalMs: Record<string, number> = {
      WaitingForOpponent: 5_000,
      PlacingShips:       4_000,
      InProgress:         3_000,
    };

    if (!phase || !intervalMs[phase]) return;

    timerRef.current = setInterval(() => {
      refreshFn().catch(console.error);
    }, intervalMs[phase]);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, refreshFn]);
}
