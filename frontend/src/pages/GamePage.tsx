import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { GameBoard } from '../components/GameBoard/GameBoard';
import { useGame } from '../hooks/useGame';
import { useAbandonedGame } from '../hooks/useAbandonedGame';
import './GamePage.css';

export const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { account } = useGetAccountInfo();
  const id = Number(gameId);

  const { gameState, myBoard, opponentBoard, attack, isMyTurn, loading, error } = useGame(id);
  const { blocksRemaining, claimAbandoned, canClaim, claiming } = useAbandonedGame(id);

  const handleAttack = useCallback(
    (x: number, y: number) => {
      if (!isMyTurn) return;
      attack(x, y);
    },
    [isMyTurn, attack]
  );

  if (loading) return <div className="game-loading">Loading game #{id}…</div>;
  if (error) return <div className="game-error">{error}</div>;
  if (!gameState) return <div className="game-error">Game not found.</div>;

  const isFinished = gameState.phase === 'Finished';
  const isWinner = gameState.winner === account.address;

  return (
    <div className="game-page">
      <header className="game-header">
        <button className="btn-back" onClick={() => navigate('/lobby')}>← Lobby</button>
        <h1>Game #{id}</h1>
        <span className={`phase-badge phase-${gameState.phase.toLowerCase()}`}>
          {gameState.phase}
        </span>
      </header>

      {isFinished && (
        <div className={`game-result ${isWinner ? 'result-win' : 'result-loss'}`}>
          {isWinner ? '🏆 Victory!' : '💀 Defeated'}
          {gameState.bet > 0n && (
            <span className="prize">
              {isWinner ? `+${formatEgld(gameState.bet * 2n * 99n / 100n)} EGLD` : ''}
            </span>
          )}
        </div>
      )}

      <div className="boards-container">
        <section className="board-section">
          <h2>Your Fleet</h2>
          <GameBoard
            cells={myBoard}
            interactive={false}
            onCellClick={() => {}}
          />
        </section>

        <section className="board-section">
          <h2>{isMyTurn ? '🎯 Your Turn — Attack!' : "Opponent's Board"}</h2>
          <GameBoard
            cells={opponentBoard}
            interactive={isMyTurn && !isFinished}
            onCellClick={handleAttack}
          />
        </section>
      </div>

      {/* Supernova: turn timeout indicator */}
      {gameState.phase === 'InProgress' && blocksRemaining !== null && (
        <div className="timeout-bar">
          <span>Turn timeout in</span>
          <strong> {blocksRemaining.toLocaleString()} blocks</strong>
          <span> (~{Math.ceil(blocksRemaining * 0.6 / 60)} min)</span>
          {canClaim && (
            <button
              className="btn-claim-abandon"
              onClick={claimAbandoned}
              disabled={claiming}
            >
              {claiming ? 'Claiming…' : '⚡ Claim Abandoned Game'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

function formatEgld(attoEgld: bigint): string {
  const egld = Number(attoEgld) / 1e18;
  return egld.toFixed(4);
}

export default GamePage;
