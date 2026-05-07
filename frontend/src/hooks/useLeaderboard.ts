import { useState, useEffect, useCallback } from 'react';
import {
  fetchLeaderboard,
  fetchPlayerRank,
  LeaderboardCategory,
  LeaderboardEntry,
} from '../services/leaderboard.service';

interface UseLeaderboardResult {
  entries: LeaderboardEntry[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  category: LeaderboardCategory;
  page: number;
  setCategory: (c: LeaderboardCategory) => void;
  setPage: (p: number) => void;
  refresh: () => void;
  playerRank: { rank: number; total: number } | null;
}

export function useLeaderboard(playerAddress?: string): UseLeaderboardResult {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<LeaderboardCategory>('winRate');
  const [page, setPage] = useState(1);
  const [playerRank, setPlayerRank] = useState<{ rank: number; total: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [result, rank] = await Promise.all([
        fetchLeaderboard(category, page, 10),
        playerAddress ? fetchPlayerRank(playerAddress, category) : Promise.resolve(null),
      ]);
      setEntries(result.entries);
      setTotal(result.total);
      setHasMore(result.hasMore);
      setPlayerRank(rank);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [category, page, playerAddress]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 when category changes
  const handleSetCategory = useCallback((c: LeaderboardCategory) => {
    setCategory(c);
    setPage(1);
  }, []);

  return { entries, total, hasMore, loading, error, category, page, setCategory: handleSetCategory, setPage, refresh: load, playerRank };
}
