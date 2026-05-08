import React, { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { battleshipService } from '../../services/battleship.service';
import { useGamePolling } from '../../hooks/useGamePolling';
import { GameBoard } from '../../components/GameBoard/GameBoard';
import { PlacementBoard } from '../../components/PlacementBoard/PlacementBoard';
import { GameStatus } from '../../components/GameStatus/GameStatus';
import './game-page.css';

export const GamePage: React.FC = () => {
  const { gameId: gameIdStr } = useParams<{ gameId: string }>();
  const navigate              = useNavigate();
  const { address }           = useGetAccountInfo();
  const gameId                = gameIdStr ? parseInt(gameIdStr) : null;

  // ─── Real-time polling ────────────────────────────────────────────────────
  const { gameState, status, lastUpdated, errorCount, forceRefresh } =
    useGamePolling(gameId, address ?? '');

  // ─── Derived state ────────────────────────────────────────────────────────
  const isPlayerA    = gameState?.playerA?.toLowerCase() === address?.toLowerCase();
  const isPlayerB    = gameState?.playerB?.toLowerCase() === address?.toLowerCase();
  const isMyTurn     =
    (isPlayerA && gameState?.phase === 'PlayerATurn') ||
    (isPlayerB && gameState?.phase === 'PlayerBTurn');
  const phase        = gameState?.phase ?? 'Loading';
  const isFinished   = phase === 'Finished';
  const isPlacement  = phase === 'PlacingShips';
  const didWin       = isFinished && gameState?.winner?.toLowerCase() === address?.toLowerCase();

  // ─── Actions ──────────────────────────────────────────────────────────────
  const handleAttack = useCallback(async (row: number, col: number) => {
    if (!gameId || !isMyTurn) return;
    try {
      await battleshipService.attack(gameId, row, col);
      // Optimistic: poll immediately after tx
      setTimeout(forceRefresh, 1500);
    } catch (e: any) {
      alert(`Attack failed: ${e?.message}`);
    }
  }, [gameId, isMyTurn, forceRefresh]);

  const handlePlaceShips = useCallback(async (positions: number[]) => {
    if (!gameId) return;
    try {
      await battleshipService.placeShips(gameId, positions);
      setTimeout(forceRefresh, 1500);
    } catch (e: any) {
      alert(`Place ships failed: ${e?.message}`);
    }
  }, [gameId, forceRefresh]);

  const handleWithdraw = useCallback(async () => {
    if (!gameId) return;
    if (!confirm('Withdraw and forfeit the game?')) return;
    try {
      await battleshipService.withdraw(gameId);
      navigate('/lobby');
    } catch (e: any) {
      alert(`Withdraw failed: ${e?.message}`);
    }
  }, [gameId, navigate]);

  // ─── Loading / error ─────────────────────────────────────────────────────
  if (!gameId) {
    return <div className="gp-error">Invalid game ID.</div>;
  }

  if (status === 'idle' || (!gameState && status === 'polling')) {
    return (
      <div className="gp-loading">
        <div className="gp-spinner" />
        <p>Loading game #{gameId}…</p>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="gp-error">
        <p>Could not load game #{gameId}.</p>
        <button onClick={forceRefresh} className="btn-retry">Retry</button>
      </div>
    );
  }

  return (
    <div className="gp">
      {/* ── Header ── */}
      <div className="gp__header">
        <button className="gp__back" onClick={() => navigate('/lobby')}>← Lobby</button>
        <h1 className="gp__title">Game #{gameId}</h1>

        {/* Polling status indicator */}
        <div className="gp__sync">
          {status === 'polling' && <span className="sync-dot sync-dot--ok" title="Live" />}
          {status === 'error'   && (
            <span className="sync-dot sync-dot--err" title={`Retry ${errorCount}x`} />
          )}
          {status === 'stopped' && <span className="sync-dot sync-dot--off" title="Finished" />}
          {lastUpdated && (
            <span className="sync-age">
              {Math.round((Date.now() - lastUpdated) / 1000)}s ago
            </span>
          )}
          <button className="sync-refresh" onClick={forceRefresh} title="Force refresh">↺</button>
        </div>
      </div>

      {/* ── Game status bar ── */}
      <GameStatus
        phase={phase}
        isMyTurn={isMyTurn}
        isFinished={isFinished}
        didWin={didWin}
        playerA={gameState.playerA}
        playerB={gameState.playerB}
        myAddress={address ?? ''}
      />

      {/* ── Ship placement phase ── */}
      {isPlacement && (
        <div className="gp__placement">
          <h2 className="gp__section-title">Place Your Fleet</h2>
          <PlacementBoard onConfirm={handlePlaceShips} />
        </div>
      )}

      {/* ── Battle phase ── */}
      {!isPlacement && (
        <div className="gp__boards">
          <div className="gp__board-wrap">
            <h3 className="gp__board-label">Your Board</h3>
            <GameBoard
              cells={gameState.myBoard ?? []}
              interactive={false}
              onCellClick={() => {}}
            />
          </div>
          <div className="gp__board-wrap">
            <h3 className="gp__board-label">
              {isMyTurn ? '🎯 Attack!' : "Opponent's Board"}
            </h3>
            <GameBoard
              cells={gameState.opponentBoard ?? []}
              interactive={isMyTurn && !isFinished}
              onCellClick={handleAttack}
            />
          </div>
        </div>
      )}

      {/* ── Finished overlay ── */}
      {isFinished && (
        <div className="gp__result">
          <div className={`gp__result-badge ${
            didWin ? 'gp__result-badge--win' : 'gp__result-badge--loss'
          }`}>
            {didWin ? '🏆 Victory!' : '💀 Defeat'}
          </div>
          <p className="gp__result-sub">
            {didWin
              ? 'Prize sent to your wallet!'
              : `Winner: ${gameState.winner?.slice(0,8)}…`
            }
          </p>
          <button className="btn-primary" onClick={() => navigate('/lobby')}>Back to Lobby</button>
        </div>
      )}

      {/* ── Footer actions ── */}
      {!isFinished && (
        <div className="gp__footer">
          <button className="btn-danger" onClick={handleWithdraw}>Withdraw / Forfeit</button>
        </div>
      )}
    </div>
  );
};

export default GamePage;
