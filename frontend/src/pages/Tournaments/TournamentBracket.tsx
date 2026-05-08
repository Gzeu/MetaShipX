import React, { useEffect, useState } from 'react';
import { getTournamentBracket, BracketMatch, TournamentRound } from '../../services/tournament.service';
import './TournamentBracket.css';

interface Props {
  tournamentId: string;
  onBack: () => void;
}

function shortAddr(addr: string) {
  if (!addr || addr === 'TBD') return 'TBD';
  if (addr.length <= 10) return addr;
  return addr.slice(0, 5) + '…' + addr.slice(-5);
}

function BracketMatchCard({ match }: { match: BracketMatch }) {
  const p1Won = match.winner === match.player1;
  const p2Won = match.winner === match.player2;
  return (
    <div className={`bm-card ${match.status}`}>
      <div className={`bm-player ${p1Won ? 'bm-winner' : p2Won ? 'bm-loser' : ''}`}>
        <span className="bm-addr">{shortAddr(match.player1)}</span>
        {p1Won && <span className="bm-crown">👑</span>}
      </div>
      <div className="bm-vs">vs</div>
      <div className={`bm-player ${p2Won ? 'bm-winner' : p1Won ? 'bm-loser' : ''}`}>
        <span className="bm-addr">{shortAddr(match.player2 || 'TBD')}</span>
        {p2Won && <span className="bm-crown">👑</span>}
      </div>
      {match.status === 'completed' && match.winner && (
        <div className="bm-result">Winner: {shortAddr(match.winner)}</div>
      )}
      {match.status === 'active' && (
        <div className="bm-live">🔴 LIVE</div>
      )}
    </div>
  );
}

export default function TournamentBracket({ tournamentId, onBack }: Props) {
  const [rounds, setRounds] = useState<TournamentRound[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTournamentBracket(tournamentId).then(r => {
      setRounds(r);
      setLoading(false);
    });
  }, [tournamentId]);

  if (loading) return (
    <div className="bracket-loading">
      <div className="bracket-spinner" />
      <p>Loading bracket…</p>
    </div>
  );

  return (
    <div className="bracket-page">
      <div className="bracket-topbar">
        <button className="bracket-back" onClick={onBack}>← Back</button>
        <h2 className="bracket-title">Tournament #{tournamentId.slice(-6)}</h2>
      </div>
      <div className="bracket-rounds">
        {rounds.map((round, ri) => (
          <div key={ri} className="bracket-round">
            <div className="bracket-round-label">{round.label}</div>
            <div className="bracket-matches">
              {round.matches.map((match, mi) => (
                <BracketMatchCard key={mi} match={match} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
