import { useState, useEffect, useCallback } from 'react';

export interface LeaderEntry {
  address: string;
  wins: number;
  egldWon: string;
  rank: number;
}

const API_BASE = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';
const CACHE_TTL = 60_000; // 1 minute

let _cache: LeaderEntry[] = [];
let _cacheTs = 0;

export function useLeaderboard(limit = 50) {
  const [entries, setEntries] = useState<LeaderEntry[]>(_cache);
  const [loading, setLoading] = useState(_cache.length === 0);
  const [error, setError]     = useState<string | null>(null);

  const fetch = useCallback(async (force = false) => {
    if (!force && _cache.length > 0 && Date.now() - _cacheTs < CACHE_TTL) {
      setEntries(_cache);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await window.fetch(`${API_BASE}/leaderboard/top?limit=${limit}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      _cache = json.data ?? [];
      _cacheTs = Date.now();
      setEntries(_cache);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { fetch(); }, [fetch]);

  return { entries, loading, error, refetch: () => fetch(true) };
}
