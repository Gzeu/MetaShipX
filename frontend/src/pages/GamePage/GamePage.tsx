import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { GameBoard } from '../../components/GameBoard/GameBoard';
import { useGame } from '../../hooks/useGame';
import { useSounds } from '../../audio/useSounds';
import './GamePage.css';

type Phase = 'placement' | 'waiting' | 'battle' | 'ended';

export const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { address } = useGetAccountInfo();
  const sounds = useSounds();

  const {
    gameState,
    myBoard,
    enemyBoard,
    selectedShip,
    isMyTurn,
    phase,
    placeShip,
    rotateShip,
    confirmPlacement,
    attackCell,
    loading,
    error,
    lastAttackResult,
  } = useGame(gameId!, address);

  const [orientation, setOrientation] = useState<'H' | 'V'>('H');
  const prevAttackResult = useRef<string | null>(null);

  // Play sounds on attack result change
  useEffect(() => {
    if (!lastAttackResult || lastAttackResult === prevAttackResult.current) return;
    prevAttackResult.current = lastAttackResult;
    if (lastAttackResult === 'hit') sounds.hit();
    else if (lastAttackResult === 'miss') sounds.miss();
    else if (lastAttackResult === 'sunk') { sounds.hit(); setTimeout(() => sounds.sunk(), 300); }
    else if (lastAttackResult === 'win') sounds.win();
  }, [lastAttackResult, sounds]);

  // Play turn sound
  useEffect(() => {
    if (phase === 'battle' && isMyTurn) sounds.yourTurn();
  }, [isMyTurn, phase, sounds]);

  const handleRotate = useCallback(() => {
    setOrientation(o => o === 'H' ? 'V' : 'H');
    rotateShip();
  }, [rotateShip]);

  const handleCopySpectatorLink = () => {
    const url = `${window.location.origin}/spectate/${gameId}`;
    navigator.clipboard.writeText(url);
  };

  if (loading && !gameState) {
    return (
      <div className="game-loading">
        <div className="sonar-pulse" />
        <p>Connecting to battle...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-error">
        <h2>⚠️ Connection lost</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/lobby')}>Back to Lobby</button>
      </div>
    );
  }

  const ships = [
    { type: 'Carrier', size: 5 },
    { type: 'Battleship', size: 4 },
    { type: 'Cruiser', size: 3 },
    { type: 'Submarine', size: 3 },
    { type: 'Destroyer', size: 2 },
  ];

  return (
    <div className="game-page">
      {/* Header */}
      <header className="game-header">
        <button className="btn-ghost" onClick={() => navigate('/lobby')}>← Lobby</button>
        <div className="game-id-badge">Game #{gameId?.slice(0, 8)}</div>
        <button className="btn-ghost spectator-btn" onClick={handleCopySpectatorLink} title="Copy spectator link">
          📡 Share
        </button>
      </header>

      {/* Phase banner */}
      <div className={`phase-banner phase-${phase}`}>
        {phase === 'placement' && '🛳 Place your fleet'}
        {phase === 'waiting' && '⏳ Waiting for opponent...'}
        {phase === 'battle' && (isMyTurn ? '🎯 YOUR TURN — FIRE!' : '⏳ Enemy targeting...')}
        {phase === 'ended' && (gameState?.winner === address ? '🏆 VICTORY!' : '💀 DEFEAT')}
      </div>

      <div className="game-arena">
        {/* My board */}
        <div className="board-section">
          <h3 className="board-label">YOUR FLEET</h3>
          <GameBoard
            board={myBoard}
            interactive={phase === 'placement'}
            onCellClick={(row, col) => phase === 'placement' && placeShip(row, col, orientation)}
            showShips
          />
        </div>

        {/* Center panel */}
        <div className="center-panel">
          {phase === 'placement' && (
            <div className="ship-selector">
              <h4>Select Ship</h4>
              <div className="ship-list">
                {ships.map(s => (
                  <button
                    key={s.type}
                    className={`ship-btn ${selectedShip?.type === s.type ? 'selected' : ''}`}
                    onClick={() => placeShip(-1, -1, orientation, s.type as any)}
                  >
                    <span className="ship-icon">{Array(s.size).fill('🟦').join('')}</span>
                    <span>{s.type}</span>
                  </button>
                ))}
              </div>
              <div className="placement-actions">
                <button className="btn-secondary" onClick={handleRotate}>
                  🔄 Rotate ({orientation === 'H' ? 'Horizontal' : 'Vertical'})
                </button>
                <button className="btn-primary" onClick={confirmPlacement}>
                  ✅ Confirm Fleet
                </button>
              </div>
            </div>
          )}

          {phase === 'battle' && (
            <div className="battle-stats">
              <div className="stat">
                <span className="stat-label">Hits</span>
                <span className="stat-value hit">{gameState?.myHits ?? 0}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Misses</span>
                <span className="stat-value miss">{gameState?.myMisses ?? 0}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Ships left</span>
                <span className="stat-value">{gameState?.enemyShipsLeft ?? '?'}</span>
              </div>
              <div className="turn-indicator">
                {isMyTurn
                  ? <span className="pulse-dot active" />
                  : <span className="pulse-dot" />}
                {isMyTurn ? 'YOUR TURN' : 'ENEMY TURN'}
              </div>
            </div>
          )}

          {phase === 'ended' && (
            <div className="game-over-panel">
              <div className="game-over-emoji">
                {gameState?.winner === address ? '🏆' : '💀'}
              </div>
              <h2>{gameState?.winner === address ? 'Victory!' : 'Defeat'}</h2>
              <p className="reward-text">
                {gameState?.winner === address
                  ? `+${gameState?.reward ?? '0'} EGLD`
                  : 'Better luck next time'}
              </p>
              <button className="btn-primary" onClick={() => navigate('/lobby')}>Play Again</button>
            </div>
          )}
        </div>

        {/* Enemy board */}
        <div className="board-section">
          <h3 className="board-label">ENEMY WATERS</h3>
          <GameBoard
            board={enemyBoard}
            interactive={phase === 'battle' && isMyTurn}
            onCellClick={(row, col) => phase === 'battle' && isMyTurn && attackCell(row, col)}
            showShips={false}
          />
        </div>
      </div>
    </div>
  );
};
