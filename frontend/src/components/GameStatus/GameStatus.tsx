import React from 'react';
import './GameStatus.css';

interface Props {
  phase: string;
  isMyTurn: boolean;
  isFinished: boolean;
  didWin: boolean;
  playerA: string;
  playerB?: string | null;
  myAddress: string;
}

function shortAddr(a: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '—';
}

const PHASE_META: Record<string, { label: string; color: string; icon: string }> = {
  Waiting:       { label: 'Waiting for opponent',  color: 'var(--gs-yellow)', icon: '⏳' },
  PlacingShips:  { label: 'Place your ships',       color: 'var(--gs-blue)',   icon: '🚢' },
  PlayerATurn:   { label: 'Player A attacking',     color: 'var(--gs-green)',  icon: '🎯' },
  PlayerBTurn:   { label: 'Player B attacking',     color: 'var(--gs-green)',  icon: '🎯' },
  Finished:      { label: 'Game over',              color: 'var(--gs-gray)',   icon: '🏁' },
  Loading:       { label: 'Loading…',               color: 'var(--gs-gray)',   icon: '⏳' },
};

export const GameStatus: React.FC<Props> = ({
  phase, isMyTurn, isFinished, didWin, playerA, playerB, myAddress,
}) => {
  const meta = PHASE_META[phase] ?? PHASE_META.Loading;

  return (
    <div className="gs">
      <div className="gs__phase" style={{ '--gs-accent': meta.color } as React.CSSProperties}>
        <span className="gs__phase-icon">{meta.icon}</span>
        <span className="gs__phase-label">{meta.label}</span>
        {!isFinished && (
          <span className={`gs__turn-badge ${
            isMyTurn ? 'gs__turn-badge--mine' : 'gs__turn-badge--theirs'
          }`}>
            {isMyTurn ? 'YOUR TURN' : 'WAITING'}
          </span>
        )}
        {isFinished && (
          <span className={`gs__turn-badge ${
            didWin ? 'gs__turn-badge--win' : 'gs__turn-badge--loss'
          }`}>
            {didWin ? '🏆 WIN' : '💀 LOSS'}
          </span>
        )}
      </div>

      <div className="gs__players">
        <div className={`gs__player ${
          playerA?.toLowerCase() === myAddress?.toLowerCase() ? 'gs__player--me' : ''
        }`}>
          <span className="gs__player-label">Player A</span>
          <span className="gs__player-addr">{shortAddr(playerA)}</span>
          {(phase === 'PlayerATurn') && <span className="gs__player-dot" />}
        </div>

        <span className="gs__vs">⚔</span>

        <div className={`gs__player ${
          playerB && playerB?.toLowerCase() === myAddress?.toLowerCase() ? 'gs__player--me' : ''
        }`}>
          <span className="gs__player-label">Player B</span>
          <span className="gs__player-addr">{playerB ? shortAddr(playerB) : '—'}</span>
          {(phase === 'PlayerBTurn') && <span className="gs__player-dot" />}
        </div>
      </div>
    </div>
  );
};

export default GameStatus;
