import { useState, useEffect, useCallback } from 'react';
import { fetchAllTournaments, fetchTournament, Tournament } from '../services/tournament.service';

// ── List hook ────────────────────────────────────────────────────────────────

export function useTournamentList() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllTournaments();
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

// ── Detail hook ───────────────────────────────────────────────────────────────

export function useTournamentDetail(id: string | null) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) { setTournament(null); return; }
    setLoading(true);
    fetchTournament(parseInt(id))
      .then(setTournament)
      .finally(() => setLoading(false));
  }, [id]);

  return { tournament, loading };
}
