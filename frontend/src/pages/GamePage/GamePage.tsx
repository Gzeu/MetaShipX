import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { useGame } from '../../hooks/useGame';
import { useGamePolling } from '../../hooks/useGamePolling';
import { useSound } from '../../hooks/useSound';
import { GameBoard } from '../../components/GameBoard/GameBoard';
import { fmtEgld, fmtAddress } from '../../utils/format';
import { STATUS_LABELS, SHIP_TYPES, SHIP_SIZES } from '../../utils/constants';
import type { ShipType } from '../../types';
import './GamePage.css';

type Phase = 'placement' | 'battle' | 'finished';

export default function GamePage(): React.ReactElement {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { account } = useGetAccountInfo();
  const myAddress = account.address;

  const { gameState, loading, error, placedShips, isMyTurn,
          placeShip, submitPlacement, attack, setGameState } = useGame();
  const { play } = useSound();

  const [phase, setPhase] = useState<Phase>('placement');
  const [selectedShip, setSelectedShip] = useState<ShipType>('Destroyer');
  const [horizontal, setHorizontal] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');

  // Poll game state every 5s during battle
  useGamePolling({
    gameId: gameId ?? '',
    address: myAddress,
    enabled: phase === 'battle',
    onUpdate: (state) => {
      setGameState(state);
      if (state.winner) {
        setPhase('finished');
        if (state.winner === myAddress) play('victory');
        else play('defeat');
      }
    },
  });

  useEffect(() => {
    if (!gameId) { navigate('/'); return; }
  }, [gameId, navigate]);

  // Determine phase from on-chain status
  useEffect(() => {
    if (!gameState) return;
    if (gameState.status === 2 || gameState.status === 3) setPhase('finished');
    else if (gameState.status === 1) setPhase('battle');
  }, [gameState]);

  const handleCellClick = async (row: number, col: number) => {
    if (phase === 'placement') {
      const ok = placeShip(selectedShip, row, col, horizontal);
      if (!ok) { setStatusMsg('Invalid placement'); return; }
      setStatusMsg(`${selectedShip} placed`);
      play('click');
    } else if (phase === 'battle' && isMyTurn) {
      if (gameState?.opponentBoard[row][col] !== 'empty') return;
      await attack(row, col);
      play('cannon');
    }
  };

  const handleSubmitPlacement = async () => {
    const needed = SHIP_TYPES.reduce((acc, t) => acc + SHIP_SIZES[t], 0);
    const placed = placedShips.reduce((acc, s) => acc + s.size, 0);
    if (placed < needed) { setStatusMsg(`Place all ships first (${placed}/${needed} cells)`); return; }
    await submitPlacement();
    play('confirm');
    setPhase('battle');
  };

  const shipsLeft = SHIP_TYPES.filter(t => !placedShips.some(s => s.type === t));

  return (
    <div className="game-page">
      <header className="game-header">
        <button className="btn-back" onClick={() => navigate('/')}>← Lobby</button>
        <h1>Game #{gameId?.slice(0, 8)}</h1>
        {gameState && (
          <span className={`status-badge status-${gameState.status}`}>
            {STATUS_LABELS[gameState.status]}
          </span>
        )}
      </header>

      {error && <div className="game-error">{error}</div>}
      {loading && <div className="game-loading">Loading…</div>}

      {phase === 'placement' && (
        <section className="placement-section">
          <div className="ship-selector">
            <h3>Select Ship</h3>
            {shipsLeft.map(t => (
              <button
                key={t}
                className={`ship-btn ${selectedShip === t ? 'active' : ''}`}
                onClick={() => setSelectedShip(t)}
              >
                {t} ({SHIP_SIZES[t]})
              </button>
            ))}
            {shipsLeft.length === 0 && <p className="all-placed">✓ All ships placed</p>}
          </div>

          <div className="orientation-toggle">
            <button className={horizontal ? 'active' : ''} onClick={() => setHorizontal(true)}>Horizontal</button>
            <button className={!horizontal ? 'active' : ''} onClick={() => setHorizontal(false)}>Vertical</button>
          </div>

          <GameBoard
            grid={gameState?.myBoard ?? Array.from({ length: 10 }, () => Array(10).fill('empty'))}
            onCellClick={handleCellClick}
            placedShips={placedShips}
            interactive
            label="Your Fleet"
          />

          <button className="btn-primary submit-btn" onClick={handleSubmitPlacement}>
            Confirm Placement
          </button>
          {statusMsg && <p className="status-msg">{statusMsg}</p>}
        </section>
      )}

      {phase === 'battle' && gameState && (
        <section className="battle-section">
          <div className="boards-row">
            <div className="board-col">
              <GameBoard
                grid={gameState.myBoard}
                placedShips={gameState.myShips}
                label="Your Board"
              />
            </div>
            <div className="turn-indicator">
              {isMyTurn ? '🎯 Your Turn' : `⏳ ${fmtAddress(gameState.currentTurn)}'s turn`}
            </div>
            <div className="board-col">
              <GameBoard
                grid={gameState.opponentBoard}
                onCellClick={handleCellClick}
                interactive={isMyTurn}
                label={`Opponent: ${fmtAddress(gameState.player2 === myAddress ? gameState.player1 : gameState.player2)}`}
              />
            </div>
          </div>
          <div className="wager-row">
            <span>Wager: <strong>{fmtEgld(gameState.wager)}</strong></span>
          </div>
        </section>
      )}

      {phase === 'finished' && gameState && (
        <section className="finished-section">
          {gameState.winner === myAddress ? (
            <>
              <div className="result-win">🏆 Victory!</div>
              <p>You won {fmtEgld(gameState.wager)} EGLD</p>
            </>
          ) : (
            <>
              <div className="result-loss">💀 Defeat</div>
              <p>Better luck next time</p>
            </>
          )}
          <button className="btn-primary" onClick={() => navigate('/')}>Back to Lobby</button>
        </section>
      )}
    </div>
  );
}
