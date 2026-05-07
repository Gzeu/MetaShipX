import React from 'react';
import './tournament-badge.css';

interface Props {
  tournamentId: number;
  matchId: number;
}

export const TournamentBadge: React.FC<Props> = ({ tournamentId, matchId }) => (
  <div className="tournament-badge">
    <span className="tournament-badge__icon">🏆</span>
    <span>Turneu #{tournamentId}</span>
    <span className="tournament-badge__sep">·</span>
    <span>Meci #{matchId}</span>
  </div>
);
