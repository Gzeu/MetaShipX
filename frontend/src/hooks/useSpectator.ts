import { useEffect, useState } from 'react';
import { spectatorService } from '../services/spectator.service';
import { SpectatorAttackEvent, SpectatorMatch } from '../types/spectator';

export function useSpectator(gameId?: string) {
  const [matches, setMatches] = useState<SpectatorMatch[]>([]);
  const [events, setEvents] = useState<SpectatorAttackEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshMatches = async () => {
    const data = await spectatorService.getLiveMatches();
    setMatches(data);
  };

  const refreshEvents = async (id: string) => {
    const data = await spectatorService.getMatchEvents(id);
    setEvents(data);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await refreshMatches();
        if (gameId) await refreshEvents(gameId);
      } finally {
        setLoading(false);
      }
    })();
  }, [gameId]);

  return { matches, events, loading, refreshMatches, refreshEvents };
}
