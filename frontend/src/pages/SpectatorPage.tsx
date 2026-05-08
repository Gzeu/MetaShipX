import { useState } from 'react';
import { useSpectator } from '../hooks/useSpectator';
import { formatEgld, shortenAddress, timeAgo } from '../utils/format';

export default function SpectatorPage() {
  const [selectedGameId, setSelectedGameId] = useState<string | undefined>();
  const { matches, events, loading, refreshEvents } = useSpectator(selectedGameId);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Spectator Mode</h1>
      <p>Watch live matches in read-only mode with real-time attack feed.</p>
      {loading ? <p>Loading live matches...</p> : null}
      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1.2fr 1fr', marginTop: '1rem' }}>
        <div>
          {matches.map((match) => (
            <div key={match.gameId} style={{ border: '1px solid #2d3748', borderRadius: 16, padding: '1rem', background: '#111827', marginBottom: '1rem' }}>
              <h3>{match.gameId}</h3>
              <p>{shortenAddress(match.creator)} vs {shortenAddress(match.opponent)}</p>
              <p>Bet: {formatEgld(match.bet)} · Spectators: {match.spectators}</p>
              <button onClick={() => { setSelectedGameId(match.gameId); void refreshEvents(match.gameId); }}>
                Watch live
              </button>
            </div>
          ))}
        </div>
        <div style={{ border: '1px solid #2d3748', borderRadius: 16, padding: '1rem', background: '#0f172a' }}>
          <h2>Live feed {selectedGameId ? `· ${selectedGameId}` : ''}</h2>
          {events.length === 0 ? <p>Select a match to view events.</p> : null}
          {events.map((event, index) => (
            <div key={`${event.gameId}-${event.timestamp}-${index}`} style={{ padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <strong>{event.result}</strong>
              <p>{shortenAddress(event.attacker)} attacked ({event.x}, {event.y})</p>
              <small>{timeAgo(event.timestamp)}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
