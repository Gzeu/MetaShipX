import { useEffect, useRef, useState } from 'react';
import { spectatorService } from '../services/spectator.service';
import { SpectatorAttackEvent, SpectatorMatch } from '../types/spectator';

export function useSpectator(gameId?: string) {
  const [matches, setMatches] = useState<SpectatorMatch[]>([]);
  const [events, setEvents] = useState<SpectatorAttackEvent[]>([]);
  const [spectators, setSpectators] = useState(0);
  const [loading, setLoading] = useState(true);
  const cleanupRef = useRef<(() => void) | null>(null);

  const refreshMatches = async () => {
    const data = await spectatorService.getLiveMatches();
    setMatches(data);
  };

  const refreshEvents = async (id: string) => {
    const history = await spectatorService.getMatchEvents(id);
    setEvents(history);
  };

  // Subscribe to real-time events when gameId changes
  useEffect(() => {
    if (!gameId) return;

    cleanupRef.current?.();
    setEvents([]);

    const unsub = spectatorService.watchGame(
      gameId,
      (event) => setEvents((prev) => [...prev, event]),
      (count) => setSpectators(count)
    );
    cleanupRef.current = unsub;

    return () => unsub();
  }, [gameId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { await refreshMatches(); }
      finally { setLoading(false); }
    })();
  }, []);

  return { matches, events, spectators, loading, refreshMatches, refreshEvents };
}
