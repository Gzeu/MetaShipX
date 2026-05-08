import React, { useState } from 'react';
import { useLeaderboard, LeaderboardEntry } from '../hooks/useLeaderboard';
import './Leaderboard.css';

function shortAddress(addr: string): string {
  if (addr.length <= 13) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatEgld(raw: string): string {
  try {
    const val = BigInt(raw);
    const egld = Number(val) / 1e18;
    return egld.toFixed(2);
  } catch {
    return '0.00';
  }
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const { entries, loading, error, refresh, lastUpdated } = useLeaderboard(50);
  const [filter, setFilter] = useState<'all' | 'top10'>('all');

  const displayed = filter === 'top10' ? entries.slice(0, 10) : entries;

  return (
    <main className="leaderboard-page">
      <header className="leaderboard-header">
        <div>
          <h1 className="leaderboard-title">⚓ Leaderboard</h1>
          {lastUpdated && (
            <p className="leaderboard-updated">Updated {lastUpdated.toLocaleTimeString()}</p>
          )}
        </div>
        <div className="leaderboard-controls">
          <button
            className={`lb-filter-btn${filter === 'all' ? ' active' : ''}`}
            onClick={() => setFilter('all')}
          >All</button>
          <button
            className={`lb-filter-btn${filter === 'top10' ? ' active' : ''}`}
            onClick={() => setFilter('top10')}
          >Top 10</button>
          <button className="lb-refresh-btn" onClick={refresh} disabled={loading} aria-label="Refresh leaderboard">
            {loading ? '⟳' : '↻'}
          </button>
        </div>
      </header>

      {error && (
        <div className="leaderboard-error" role="alert">
          <p>⚠ {error}</p>
          <button onClick={refresh}>Retry</button>
        </div>
      )}

      {loading && entries.length === 0 ? (
        <div className="leaderboard-skeleton">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="lb-skeleton-row">
              <span className="skeleton" style={{ width: 32 }} />
              <span className="skeleton" style={{ width: 160 }} />
              <span className="skeleton" style={{ width: 60 }} />
              <span className="skeleton" style={{ width: 60 }} />
              <span className="skeleton" style={{ width: 80 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="leaderboard-table-wrap">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Address</th>
                <th>Wins</th>
                <th>Losses</th>
                <th>Win Rate</th>
                <th>Games</th>
                <th>Earned (EGLD)</th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 && !loading && (
                <tr><td colSpan={7} className="lb-empty">No data yet — be the first to play!</td></tr>
              )}
              {displayed.map((e: LeaderboardEntry) => (
                <tr key={e.address} className={e.rank <= 3 ? 'lb-row--medal' : ''}>
                  <td className="lb-rank">
                    {e.rank <= 3 ? MEDALS[e.rank - 1] : e.rank}
                  </td>
                  <td className="lb-address" title={e.address}>
                    <a
                      href={`https://devnet-explorer.multiversx.com/accounts/${e.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {shortAddress(e.address)}
                    </a>
                  </td>
                  <td className="lb-wins">{e.wins}</td>
                  <td className="lb-losses">{e.losses}</td>
                  <td>
                    <div className="lb-winrate">
                      <span>{e.winRate}%</span>
                      <div className="lb-winrate-bar">
                        <div className="lb-winrate-fill" style={{ width: `${e.winRate}%` }} />
                      </div>
                    </div>
                  </td>
                  <td>{e.totalGames}</td>
                  <td className="lb-earned">{formatEgld(e.totalEarned)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
