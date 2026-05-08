import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { GameBoard } from '../../components/GameBoard/GameBoard';
import { useGame } from '../../hooks/useGame';
import './GamePage.css';

type Phase = 'placement' | 'battle' | 'finished';

const SHIP_DEFS = [
  { type: 'Carrier',    size: 5 },
  { type: 'Battleship', size: 4 },
  { type: 'Cruiser',    size: 3 },
  { type: 'Submarine',  size: 3 },
  { type: 'Destroyer',  size: 2 },
];

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { address } = useGetAccountInfo();
  const { gameState, attack, placeShips, loading, error } = useGame(gameId ?? '');

  const [phase, setPhase] = useState<Phase>('placement');
  const [placedShips, setPlacedShips] = useState<number[][]>([]);
  const [hitAnimations, setHitAnimations] = useState<{ row: number; col: number; type: 'hit' | 'miss' }[]>([]);
  const [lastTurn, setLastTurn] = useState<string>('');

  // Derive phase from game state
  useEffect(() => {
    if (!gameState) return;
    if (gameState.status === 'placement') setPhase('placement');
    else if (gameState.status === 'battle') setPhase('battle');
    else if (gameState.status === 'finished') setPhase('finished');
  }, [gameState]);

  const handleCellClick = useCallback(async (row: number, col: number) => {
    if (phase !== 'battle') return;
    if (gameState?.currentTurn !== address) return;
    const result = await attack(row, col);
    const type = result?.hit ? 'hit' : 'miss';
    setHitAnimations(prev => [...prev, { row, col, type }]);
    setLastTurn(type === 'hit' ? `💥 Hit at ${String.fromCharCode(65 + col)}${row + 1}!` : `💨 Miss at ${String.fromCharCode(65 + col)}${row + 1}`);
    setTimeout(() => setHitAnimations(prev => prev.filter(a => !(a.row === row && a.col === col))), 1200);
  }, [phase, gameState, address, attack]);

  const handlePlaceShips = async () => {
    if (placedShips.length < 5) return;
    await placeShips(placedShips);
  };

  const isMyTurn = gameState?.currentTurn === address;
  const opponent = gameState?.players?.find(p => p !== address);

  return (
    <div className="game-page">
      {/* Header */}
      <div className="game-header">
        <button className="game-back" onClick={() => navigate('/lobby')}>← Lobby</button>
        <div className="game-id">Game #{(gameId ?? '').slice(-6)}</div>
        <div className={`game-phase-badge phase-${phase}`}>
          {phase === 'placement' && '📍 Place Ships'}
          {phase === 'battle' && (isMyTurn ? '⚔️ Your Turn' : '⏳ Opponent\'s Turn')}
          {phase === 'finished' && (gameState?.winner === address ? '🏆 Victory!' : '💀 Defeated')}
        </div>
      </div>

      {/* Last action toast */}
      {lastTurn && (
        <div className={`game-toast ${lastTurn.includes('Hit') ? 'toast-hit' : 'toast-miss'}`}>
          {lastTurn}
        </div>
      )}

      {/* Error */}
      {error && <div className="game-error">{error}</div>}

      {/* Boards */}
      <div className="game-boards">
        {/* My board */}
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
              <p className="gpi-hint">Place your 5 ships on the board, then confirm.</p>
              <button
                className="game-btn-primary"
                onClick={handlePlaceShips}
                disabled={loading}
              >
                {loading ? 'Placing…' : 'Confirm Placement'}
              </button>
            </div>
          )}
        </div>

        {/* Opponent board */}
        <div className="game-board-wrap">
          <div className="game-board-label">
            {opponent ? `Opponent: ${opponent.slice(0, 6)}…` : 'Waiting for opponent'}
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
        </div>
      </div>

      {/* Finished overlay */}
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
