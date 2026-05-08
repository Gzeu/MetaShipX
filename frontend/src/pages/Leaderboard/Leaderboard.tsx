import React, { useEffect, useState } from 'react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { getLeaderboard, LeaderboardEntry } from '../../services/leaderboard.service';
import './Leaderboard.css';

const MEDALS = ['🥇', '🥈', '🥉'];

function shortAddr(addr: string) {
  if (addr.length <= 12) return addr;
  return addr.slice(0, 6) + '…' + addr.slice(-6);
}

export default function Leaderboard() {
  const { address: myAddress } = useGetAccountInfo();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await getLeaderboard(50);
    setEntries(data);
    setRefreshedAt(new Date());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const myEntry = entries.find(e => e.address === myAddress);

  return (
    <div className="lb-page">
      <div className="lb-header">
        <div>
          <h1 className="lb-title">🏆 Global Leaderboard</h1>
          {refreshedAt && (
            <p className="lb-refresh">Updated {refreshedAt.toLocaleTimeString()}</p>
          )}
        </div>
        <button className="lb-refresh-btn" onClick={load} disabled={loading}>
          {loading ? '⟳ Loading…' : '⟳ Refresh'}
        </button>
      </div>

      {myEntry && (
        <div className="lb-my-rank">
          <span className="lb-my-rank-label">Your rank</span>
          <span className="lb-my-rank-value">#{myEntry.rank}</span>
          <span className="lb-my-rank-stat">{myEntry.wins}W · {myEntry.losses}L · {myEntry.winRate}% WR</span>
        </div>
      )}

      <div className="lb-table-wrapper">
        {loading ? (
          <div className="lb-skeleton">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="lb-skeleton-row" />
            ))}
          </div>
        ) : (
          <table className="lb-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Wins</th>
                <th>Losses</th>
                <th>Win Rate</th>
                <th>Total Wagered</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr
                  key={e.address}
                  className={[
                    'lb-row',
                    e.rank <= 3 ? 'lb-row--top' : '',
                    e.address === myAddress ? 'lb-row--me' : '',
                  ].join(' ')}
                >
                  <td className="lb-rank">
                    {e.rank <= 3 ? MEDALS[e.rank - 1] : `#${e.rank}`}
                  </td>
                  <td className="lb-addr">
                    {shortAddr(e.address)}
                    {e.address === myAddress && <span className="lb-you"> (you)</span>}
                  </td>
                  <td className="lb-wins">{e.wins}</td>
                  <td className="lb-losses">{e.losses}</td>
                  <td>
                    <div className="lb-wr-bar">
                      <div
                        className="lb-wr-fill"
                        style={{ width: `${e.winRate}%` }}
                      />
                      <span className="lb-wr-text">{e.winRate}%</span>
                    </div>
                  </td>
                  <td className="lb-wager">{e.totalWagered} EGLD</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
