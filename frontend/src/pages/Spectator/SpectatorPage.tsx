import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGamePolling } from '../../hooks/useGamePolling';
import { useSound } from '../../hooks/useSound';
import { GameBoard } from '../../components/GameBoard/GameBoard';
import './SpectatorPage.css';

function shortAddr(a: string) {
  return a?.length > 12 ? a.slice(0, 6) + '…' + a.slice(-4) : a;
}

export default function SpectatorPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { play, isSoundEnabled, toggle } = useSound();
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

  const { gameState, loading, error } = useGamePolling(gameId ?? '', 3000);
  const prevAttacksRef = useRef<number>(0);

  // Detect new attacks and play sounds
  useEffect(() => {
    if (!gameState) return;
    const totalAttacks = (gameState.attackLog ?? []).length;
    if (totalAttacks > prevAttacksRef.current) {
      const last = gameState.attackLog![totalAttacks - 1];
      if (last?.hit) play('hit');
      else play('miss');
      prevAttacksRef.current = totalAttacks;
    }
  }, [gameState, play]);

  // Game over sound
  const prevStatusRef = useRef<string>('');
  useEffect(() => {
    if (!gameState) return;
    if (gameState.status === 'finished' && prevStatusRef.current !== 'finished') {
      play('victory');
    }
    prevStatusRef.current = gameState.status ?? '';
  }, [gameState, play]);

  const handleToggleSound = () => {
    const next = toggle();
    setSoundOn(next);
  };

  const p1 = gameState?.players?.[0] ?? 'Player 1';
  const p2 = gameState?.players?.[1] ?? 'Player 2';

  return (
    <div className="spec-page">
      {/* Top bar */}
      <div className="spec-topbar">
        <button className="spec-back" onClick={() => navigate('/')}>
          ← Home
        </button>
        <div className="spec-title">
          👁 Spectating Game #{(gameId ?? '').slice(-6)}
        </div>
        <div className="spec-controls">
          <button
            className="spec-sound-btn"
            onClick={handleToggleSound}
            title={soundOn ? 'Mute' : 'Unmute'}
          >
            {soundOn ? '🔊' : '🔇'}
          </button>
        </div>
      </div>

      {/* Status banner */}
      {gameState && (
        <div className={`spec-status spec-status--${gameState.status}`}>
          {gameState.status === 'placement'   && '⚓ Ships being placed…'}
          {gameState.status === 'battle'      && `⚔️ Battle in progress — ${shortAddr(gameState.currentTurn ?? '')} to attack`}
          {gameState.status === 'finished'    && `🏆 ${shortAddr(gameState.winner ?? '')} wins!`}
        </div>
      )}

      {loading && !gameState && (
        <div className="spec-loading">
          <div className="spec-spinner" />
          <p>Connecting to game…</p>
        </div>
      )}

      {error && <div className="spec-error">{error}</div>}

      {/* Boards */}
      {gameState && (
        <div className="spec-boards">
          <div className="spec-board-wrap">
            <div className="spec-player-label">
              {shortAddr(p1)}
              {gameState.currentTurn === p1 && <span className="spec-turn-dot" />}
            </div>
            <GameBoard
              cells={gameState.p1Board ?? Array(100).fill('empty')}
              interactive={false}
              onCellClick={() => {}}
              label="p1"
            />
          </div>
          <div className="spec-vs">VS</div>
          <div className="spec-board-wrap">
            <div className="spec-player-label">
              {shortAddr(p2)}
              {gameState.currentTurn === p2 && <span className="spec-turn-dot" />}
            </div>
            <GameBoard
              cells={gameState.p2Board ?? Array(100).fill('empty')}
              interactive={false}
              onCellClick={() => {}}
              label="p2"
            />
          </div>
        </div>
      )}

      {/* Attack log */}
      {gameState?.attackLog && gameState.attackLog.length > 0 && (
        <div className="spec-log">
          <div className="spec-log-title">📋 Attack Log</div>
          <div className="spec-log-list">
            {[...gameState.attackLog].reverse().slice(0, 20).map((entry, i) => (
              <div key={i} className={`spec-log-entry ${entry.hit ? 'log-hit' : 'log-miss'}`}>
                <span className="log-icon">{entry.hit ? '💥' : '💨'}</span>
                <span className="log-player">{shortAddr(entry.attacker)}</span>
                <span className="log-cell">{String.fromCharCode(65 + entry.col)}{entry.row + 1}</span>
                <span className="log-result">{entry.hit ? 'HIT' : 'MISS'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
