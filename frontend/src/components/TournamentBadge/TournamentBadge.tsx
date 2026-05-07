import React from 'react';
import './tournament-badge.css';

interface Props {
  tournamentId: number;
  matchId: number;
}

export const TournamentBadge: React.FC<Props> = ({ tournamentId, matchId }) => (
  <span className="tournament-badge" title={`Tournament #${tournamentId} — Match #${matchId}`}>
    🏆 Tournament #{tournamentId}
    <span className="tournament-badge__match">Match {matchId}</span>
  </span>
);

export default TournamentBadge;
