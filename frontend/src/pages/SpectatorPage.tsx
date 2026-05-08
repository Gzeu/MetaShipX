import { useState } from 'react';
import { useSpectator } from '../hooks/useSpectator';
import { SpectatorBoard } from '../components/SpectatorBoard/SpectatorBoard';
import { formatEgld, shortenAddress, timeAgo } from '../utils/format';
import { SpectatorMatch } from '../types/spectator';

export default function SpectatorPage() {
  const [selectedGame, setSelectedGame] = useState<SpectatorMatch | null>(null);
  const { matches, events, loading, refreshEvents } = useSpectator(selectedGame?.gameId);

  const handleWatch = (match: SpectatorMatch) => {
    setSelectedGame(match);
    void refreshEvents(match.gameId);
  };

  return (
    <div className="spectator-page">
      <header className="spectator-page__header">
        <h1>Spectator Mode</h1>
        <p>Watch live matches in real-time. Your board position is never revealed to spectators.</p>
      </header>

      <div className="spectator-page__layout">
        {/* Match list */}
        <aside className="spectator-page__sidebar">
          <h2>Live Matches ({matches.length})</h2>
          {loading && <p className="spectator-page__loading">Connecting...</p>}
          {matches.map((match) => (
            <button
              key={match.gameId}
              className={`spectator-card${selectedGame?.gameId === match.gameId ? ' spectator-card--active' : ''}`}
              onClick={() => handleWatch(match)}
            >
              <div className="spectator-card__ids">
                <span>{shortenAddress(match.creator)}</span>
                <span className="spectator-card__vs">vs</span>
                <span>{shortenAddress(match.opponent)}</span>
              </div>
              <div className="spectator-card__meta">
                <span className="spectator-card__bet">{formatEgld(match.bet)}</span>
                <span className="spectator-card__viewers">👁 {match.spectators}</span>
              </div>
            </button>
          ))}
        </aside>

        {/* Live board */}
        <main className="spectator-page__main">
          {selectedGame ? (
            <>
              <div className="spectator-page__boards">
                <SpectatorBoard
                  events={events.filter((e) => e.attacker === selectedGame.creator)}
                  label={`${shortenAddress(selectedGame.opponent)}'s board`}
                />
                <SpectatorBoard
                  events={events.filter((e) => e.attacker === selectedGame.opponent)}
                  label={`${shortenAddress(selectedGame.creator)}'s board`}
                />
              </div>
              <div className="spectator-page__feed">
                <h3>Attack feed</h3>
                {events.length === 0 && <p>No moves yet.</p>}
                {[...events].reverse().map((ev, i) => (
                  <div key={i} className={`feed-item feed-item--${ev.result.toLowerCase()}`}>
                    <strong>{ev.result}</strong>
                    <span>{shortenAddress(ev.attacker)} → ({ev.x}, {ev.y})</span>
                    <small>{timeAgo(ev.timestamp)}</small>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="spectator-page__empty">
              <div className="spectator-page__empty-icon">🔭</div>
              <p>Select a live match to watch</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
