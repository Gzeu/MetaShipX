import { useState, useEffect, useCallback } from 'react';
import { getLeaderboard, getPlayerRank, LeaderboardEntry } from '../services/leaderboard.service';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';

export interface UseLeaderboardResult {
  entries: LeaderboardEntry[];
  myEntry: LeaderboardEntry | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  refreshedAt: Date | null;
}

export function useLeaderboard(top = 50, autoRefreshMs = 30_000): UseLeaderboardResult {
  const { address } = useGetAccountInfo();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myEntry, setMyEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLeaderboard(top);
      setEntries(data);
      setRefreshedAt(new Date());
      if (address) {
        const mine = data.find(e => e.address === address) ??
          await getPlayerRank(address);
        setMyEntry(mine ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [address, top]);

  // Initial load
  useEffect(() => { refresh(); }, [refresh]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefreshMs) return;
    const id = setInterval(refresh, autoRefreshMs);
    return () => clearInterval(id);
  }, [refresh, autoRefreshMs]);

  return { entries, myEntry, loading, error, refresh, refreshedAt };
}
