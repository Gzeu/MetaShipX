import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { LeaderboardEntry } from '../types';

interface UseLeaderboardReturn {
  entries: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  lastUpdated: Date | null;
}

const REFRESH_INTERVAL_MS = 30_000;

export function useLeaderboard(limit = 50): UseLeaderboardReturn {
  const [entries, setEntries]         = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<LeaderboardEntry[]>(`/api/leaderboard?limit=${limit}`);
      setEntries(data);
      setLastUpdated(new Date());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch leaderboard');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void fetch();
    const id = setInterval(() => void fetch(), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetch]);

  return { entries, loading, error, refresh: fetch, lastUpdated };
}
