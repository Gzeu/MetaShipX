import React, { useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { attack, placeShips, withdraw } from '../../services/battleship.service';
import { useGamePolling } from '../../hooks/useGamePolling';
import { GameBoard } from '../../components/GameBoard/GameBoard';
import { PlacementBoard } from '../../components/PlacementBoard/PlacementBoard';
import { GameStatus } from '../../components/GameStatus/GameStatus';
import { VictoryModal } from '../../components/VictoryModal/VictoryModal';
import './game-page.css';

export const GamePage: React.FC = () => {
  const { gameId: gameIdStr } = useParams<{ gameId: string }>();
  const navigate              = useNavigate();
  const { address }           = useGetAccountInfo();
  const gameId                = gameIdStr ? parseInt(gameIdStr) : null;

  const [victoryOpen, setVictoryOpen] = useState(false);
  const [prevPhase,   setPrevPhase]   = useState<string>('');

  // ── Real-time polling ─────────────────────────────────────────────────────
  const { gameState, status, lastUpdated, errorCount, forceRefresh } =
    useGamePolling(gameId, address ?? '');

  // ── Derived state ─────────────────────────────────────────────────────────
  const isPlayerA   = gameState?.playerA?.toLowerCase() === address?.toLowerCase();
  const isPlayerB   = gameState?.playerB?.toLowerCase() === address?.toLowerCase();
  const isMyTurn    =
    (isPlayerA && gameState?.phase === 'PlayerATurn') ||
    (isPlayerB && gameState?.phase === 'PlayerBTurn');
  const phase       = gameState?.phase ?? 'Loading';
  const isFinished  = phase === 'Finished';
  const isPlacement = phase === 'PlacingShips';
  const didWin      = isFinished && gameState?.winner?.toLowerCase() === address?.toLowerCase();
  const opponent    = isPlayerA ? (gameState?.playerB ?? '') : (gameState?.playerA ?? '');

  // Auto-open victory modal when game finishes
  React.useEffect(() => {
    if (phase === 'Finished' && prevPhase !== 'Finished' && prevPhase !== '') {
      setVictoryOpen(true);
    }
    if (phase !== '') setPrevPhase(phase);
  }, [phase]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleAttack = useCallback(async (row: number, col: number) => {
    if (!gameId || !isMyTurn || !address) return;
    try {
      await attack(address, gameId, row, col);
      setTimeout(forceRefresh, 1500);
    } catch (e: any) {
      alert(`Attack failed: ${e?.message}`);
    }
  }, [gameId, isMyTurn, address, forceRefresh]);

  const handlePlaceShips = useCallback(async (positions: number[]) => {
    if (!gameId || !address) return;
    try {
      await placeShips(address, gameId, [positions]);
      setTimeout(forceRefresh, 1500);
    } catch (e: any) {
      alert(`Place ships failed: ${e?.message}`);
    }
  }, [gameId, address, forceRefresh]);

  const handleWithdraw = useCallback(async () => {
    if (!gameId || !address) return;
    if (!confirm('Withdraw and forfeit the game?')) return;
    try {
      await withdraw(address, gameId);
      navigate('/lobby');
    } catch (e: any) {
      alert(`Withdraw failed: ${e?.message}`);
    }
  }, [gameId, address, navigate]);

  // ── Loading / error ───────────────────────────────────────────────────────
  if (!gameId) return <div className="gp-error">Invalid game ID.</div>;

  if (!gameState && (status === 'idle' || status === 'polling')) {
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
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="gp__header">
        <button className="gp__back" onClick={() => navigate('/lobby')}>← Lobby</button>
        <h1 className="gp__title">Game #{gameId}</h1>
        <div className="gp__sync">
          {status === 'polling' && <span className="sync-dot sync-dot--ok" title="Live" />}
          {status === 'error'   && <span className="sync-dot sync-dot--err" title={`Retry ${errorCount}x`} />}
          {status === 'stopped' && <span className="sync-dot sync-dot--off" title="Finished" />}
          {lastUpdated && (
            <span className="sync-age">{Math.round((Date.now() - lastUpdated) / 1000)}s ago</span>
          )}
          <button className="sync-refresh" onClick={forceRefresh} title="Force refresh">↺</button>
        </div>
      </div>

      {/* ── Status bar ──────────────────────────────────────────────────── */}
      <GameStatus
        phase={phase}
        isMyTurn={isMyTurn}
        isFinished={isFinished}
        didWin={didWin}
        playerA={gameState.playerA}
        playerB={gameState.playerB}
        myAddress={address ?? ''}
      />

      {/* ── Placement phase ─────────────────────────────────────────────── */}
      {isPlacement && (
        <div className="gp__placement">
          <h2 className="gp__section-title">⚓ Place Your Fleet</h2>
          <p className="gp__placement-hint">
            Click to place ships • Toggle orientation • 🎲 Random for instant placement
          </p>
          <PlacementBoard onConfirm={handlePlaceShips} />
        </div>
      )}

      {/* ── Battle phase ────────────────────────────────────────────────── */}
      {!isPlacement && (
        <div className="gp__boards">
          <div className="gp__board-wrap">
            <h3 className="gp__board-label">🛡 Your Board</h3>
            <GameBoard
              cells={gameState.myBoard ?? []}
              interactive={false}
              onCellClick={() => {}}
              showShips
            />
          </div>
          <div className="gp__boards-divider">
            <span>⚔</span>
          </div>
          <div className="gp__board-wrap">
            <h3 className={`gp__board-label ${isMyTurn ? 'gp__board-label--attack' : ''}`}>
              {isMyTurn ? '🎯 Attack!' : "Enemy Waters"}
            </h3>
            <GameBoard
              cells={gameState.opponentBoard ?? []}
              interactive={isMyTurn && !isFinished}
              onCellClick={handleAttack}
              showShips={false}
            />
          </div>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      {!isFinished && (
        <div className="gp__footer">
          <button className="btn-danger" onClick={handleWithdraw}>⚑ Withdraw / Forfeit</button>
        </div>
      )}
      {isFinished && (
        <div className="gp__footer">
          <button className="btn-primary" onClick={() => setVictoryOpen(true)}>See Result</button>
        </div>
      )}

      {/* ── Victory Modal ───────────────────────────────────────────────── */}
      <VictoryModal
        isOpen={victoryOpen}
        didWin={didWin}
        prize={gameState.prize ?? '0'}
        opponentAddress={opponent}
        onClose={() => setVictoryOpen(false)}
        onBackToLobby={() => navigate('/lobby')}
      />
    </div>
  );
};

export default GamePage;
