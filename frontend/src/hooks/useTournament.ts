import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { Tournament } from '../types';

interface UseTournamentReturn {
  tournaments: Tournament[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  createTournament: (payload: CreateTournamentPayload) => Promise<Tournament>;
  joinTournament: (id: string, address: string) => Promise<Tournament>;
  getTournament: (id: string) => Tournament | undefined;
}

export interface CreateTournamentPayload {
  name: string;
  entryFee: string;
  maxPlayers: number;
  startTime: number;
}

const REFRESH_INTERVAL_MS = 15_000;

export function useTournament(): UseTournamentReturn {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Tournament[]>('/api/tournaments');
      setTournaments(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch tournaments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
    const id = setInterval(() => void fetchAll(), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchAll]);

  const createTournament = useCallback(async (payload: CreateTournamentPayload): Promise<Tournament> => {
    const t = await api.post<Tournament>('/api/tournaments', payload);
    setTournaments(prev => [...prev, t]);
    return t;
  }, []);

  const joinTournament = useCallback(async (id: string, address: string): Promise<Tournament> => {
    const t = await api.post<Tournament>(`/api/tournaments/${id}/join`, { address });
    setTournaments(prev => prev.map(x => x.id === id ? t : x));
    return t;
  }, []);

  const getTournament = useCallback(
    (id: string) => tournaments.find(t => t.id === id),
    [tournaments],
  );

  return { tournaments, loading, error, refresh: fetchAll, createTournament, joinTournament, getTournament };
}
