import { useState, useEffect, useCallback } from 'react';
import { Tournament, BracketMatch, fetchTournaments, fetchTournament } from '../services/tournament.service';

export function useTournamentList() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTournaments();
      setTournaments(data);
    } catch (e: any) {
      setError(e?.message ?? 'Eroare la încărcarea turneelor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { tournaments, loading, error, refresh: load };
}

export function useTournamentDetail(id: string | null) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTournament(id);
      setTournament(data);
    } catch (e: any) {
      setError(e?.message ?? 'Eroare la încărcarea turneului');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  return { tournament, loading, error, refresh: load };
}
