import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { GameBoard } from '../../components/GameBoard/GameBoard';
import { useGame } from '../../hooks/useGame';
import { playHit, playMiss, playSunk, playVictory, playDefeat, playPlacement } from '../../utils/sounds';
import './GamePage.css';

type Phase = 'placement' | 'battle' | 'finished';

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { address } = useGetAccountInfo();
  const { gameState, attack, placeShips, loading, error } = useGame(gameId ?? '');

  const [phase, setPhase] = useState<Phase>('placement');
  const [hitAnimations, setHitAnimations] = useState<{ row: number; col: number; type: 'hit' | 'miss' }[]>([]);
  const [lastTurn, setLastTurn] = useState<string>('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!gameState) return;
    if (gameState.status === 'placement') setPhase('placement');
    else if (gameState.status === 'battle') setPhase('battle');
    else if (gameState.status === 'finished') {
      setPhase('finished');
      if (gameState.winner === address) playVictory();
      else playDefeat();
    }
  }, [gameState?.status]);

  const showToast = (msg: string) => {
    setLastTurn(msg);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2200);
  };

  const handleCellClick = useCallback(async (row: number, col: number) => {
    if (phase !== 'battle') return;
    if (gameState?.currentTurn !== address) return;
    const result = await attack(row, col);
    const isHit = result?.hit ?? false;
    const isSunk = result?.sunk ?? false;
    if (isSunk) {
      playSunk();
      showToast(`💀 Ship sunk at ${String.fromCharCode(65 + col)}${row + 1}!`);
    } else if (isHit) {
      playHit();
      showToast(`💥 Hit at ${String.fromCharCode(65 + col)}${row + 1}!`);
    } else {
      playMiss();
      showToast(`💧 Miss at ${String.fromCharCode(65 + col)}${row + 1}`);
    }
    const type = isHit ? 'hit' : 'miss';
    setHitAnimations(prev => [...prev, { row, col, type }]);
    setTimeout(() => setHitAnimations(prev => prev.filter(a => !(a.row === row && a.col === col))), 1400);
  }, [phase, gameState, address, attack]);

  const handlePlaceShips = async (ships: number[][]) => {
    playPlacement();
    await placeShips(ships);
  };

  const isMyTurn = gameState?.currentTurn === address;
  const opponent = gameState?.players?.find((p: string) => p !== address);

  return (
    <div className="game-page">
      <div className="game-header">
        <button className="game-back" onClick={() => navigate('/lobby')}>← Lobby</button>
        <div className="game-id">Game #{(gameId ?? '').slice(-6)}</div>
        <div className={`game-phase-badge phase-${phase}`}>
          {phase === 'placement' && '📍 Place Ships'}
          {phase === 'battle' && (isMyTurn ? '⚔️ Your Turn' : "⏳ Opponent's Turn")}
          {phase === 'finished' && (gameState?.winner === address ? '🏆 Victory!' : '💀 Defeated')}
        </div>
      </div>

      {toastVisible && lastTurn && (
        <div className={`game-toast ${
          lastTurn.includes('Hit') || lastTurn.includes('sunk') ? 'toast-hit' : 'toast-miss'
        }`}>
          {lastTurn}
        </div>
      )}

      {error && <div className="game-error">{error}</div>}

      <div className="game-boards">
        <div className="game-board-wrap">
          <div className="game-board-label">Your Fleet</div>
          <GameBoard
            cells={gameState?.myBoard ?? Array(100).fill('empty')}
            interactive={phase === 'placement'}
            onCellClick={() => {}}
            label="my"
          />
          {phase === 'placement' && (
            <div className="game-placement-info">
              <p className="gpi-hint">Place your 5 ships, then confirm.</p>
              <button
                className="game-btn-primary"
                onClick={() => handlePlaceShips([])}
                disabled={loading}
              >
                {loading ? 'Placing…' : 'Confirm Placement'}
              </button>
            </div>
          )}
        </div>

        <div className="game-board-wrap">
          <div className="game-board-label">
            {opponent ? `${opponent.slice(0, 6)}…` : 'Waiting for opponent'}
          </div>
          <GameBoard
            cells={gameState?.opponentBoard ?? Array(100).fill('empty')}
            interactive={phase === 'battle' && isMyTurn}
            onCellClick={handleCellClick}
            animations={hitAnimations}
            label="opponent"
          />
          {phase === 'battle' && !isMyTurn && (
            <div className="game-waiting">
              <div className="game-waiting-dot" />
              Waiting for opponent…
            </div>
          )}
          {phase === 'battle' && (
            <a
              href={`/spectate/${gameId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="game-spectate-link"
            >
              👁 Share spectator link
            </a>
          )}
        </div>
      </div>

      {phase === 'finished' && (
        <div className="game-over-overlay">
          <div className="game-over-card">
            <div className="game-over-icon">
              {gameState?.winner === address ? '🏆' : '💀'}
            </div>
            <h2 className="game-over-title">
              {gameState?.winner === address ? 'Victory!' : 'Defeated'}
            </h2>
            <p className="game-over-sub">
              {gameState?.winner === address
                ? `You won ${gameState?.wager ?? '?'} EGLD!`
                : 'Better luck next time.'}
            </p>
            <div className="game-over-actions">
              <button className="game-btn-primary" onClick={() => navigate('/lobby')}>Play Again</button>
              <button className="game-btn-secondary" onClick={() => navigate('/leaderboard')}>Leaderboard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
