import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/out/react/account';
import { GameBoard } from '../../components/GameBoard/GameBoard';
import { PlacementBoard } from '../../components/PlacementBoard/PlacementBoard';
import { GameStatus } from '../../components/GameStatus/GameStatus';
import { TournamentBadge } from '../../components/TournamentBadge/TournamentBadge';
import { useGame } from '../../hooks/useGame';
import { useGamePolling } from '../../hooks/useGamePolling';
import { battleshipService } from '../../services/battleship.service';
import type { ShipPlacement } from '../../types/game.types';
import './game-page.css';

export const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { address } = useGetAccountInfo();
  const numericGameId = Number(gameId);

  const { gameState, myBoard, opponentBoard, refreshGame, isLoading, setMyBoard, setOpponentBoard } =
    useGame(numericGameId);

  // Poll at phase-appropriate intervals
  useGamePolling(refreshGame, gameState?.phase);

  const [placements, setPlacements] = useState<ShipPlacement[]>([]);
  const [placingShips, setPlacingShips] = useState(false);
  const [attacking, setAttacking] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Derived flags
  const isCreator  = gameState?.creator === address;
  const isOpponent = gameState?.opponent === address;
  const isMyTurn =
    gameState?.phase === 'InProgress' &&
    ((isCreator && gameState.currentTurn === 0) ||
     (isOpponent && gameState.currentTurn === 1));

  const isTournamentGame =
    gameState?.tournamentId !== undefined && gameState.tournamentId > 0;

  // Sync myBoard when ships are placed (keep local representation)
  const syncBoardFromPlacements = useCallback((ships: ShipPlacement[]) => {
    const board: ('empty' | 'ship')[][] = Array.from({ length: 10 }, () =>
      Array(10).fill('empty')
    );
    ships.forEach((s) => {
      for (let i = 0; i < s.length; i++) {
        const r = s.isVertical ? s.x + i : s.x;
        const c = s.isVertical ? s.y : s.y + i;
        if (r < 10 && c < 10) board[r][c] = 'ship';
      }
    });
    setMyBoard(board);
  }, [setMyBoard]);

  // ── Place ships ──────────────────────────────────────────────────────────
  const handlePlaceShips = useCallback(async () => {
    if (placements.length !== 5) {
      setLastAction('⚠️ Place all 5 ships first!');
      return;
    }
    setPlacingShips(true);
    setLastAction(null);
    try {
      syncBoardFromPlacements(placements);
      await battleshipService.placeShips(numericGameId, placements);
      setLastAction('✅ Ships placed! Waiting for opponent...');
      await refreshGame();
    } catch (e: any) {
      setLastAction(`❌ Error: ${e?.message ?? 'unknown'}`);
    } finally {
      setPlacingShips(false);
    }
  }, [numericGameId, placements, refreshGame, syncBoardFromPlacements]);

  // ── Attack ───────────────────────────────────────────────────────────────
  const handleAttack = useCallback(
    async (row: number, col: number) => {
      if (!isMyTurn || attacking) return;
      setAttacking(true);
      setLastAction(null);
      // Optimistic update on opponent board
      setOpponentBoard((prev) => {
        const next = prev.map((r) => [...r]);
        next[row][col] = 'hit';
        return next;
      });
      try {
        await battleshipService.attack(numericGameId, row, col);
        setLastAction('💥 Attack sent! Waiting for confirmation...');
        await refreshGame();
      } catch (e: any) {
        // Rollback optimistic update
        setOpponentBoard((prev) => {
          const next = prev.map((r) => [...r]);
          next[row][col] = 'empty';
          return next;
        });
        setLastAction(`❌ Attack failed: ${e?.message ?? 'unknown'}`);
      } finally {
        setAttacking(false);
      }
    },
    [numericGameId, isMyTurn, attacking, refreshGame, setOpponentBoard]
  );

  // ── Withdraw ─────────────────────────────────────────────────────────────
  const handleWithdraw = useCallback(async () => {
    try {
      await battleshipService.withdraw(numericGameId);
      navigate('/lobby');
    } catch (e: any) {
      setLastAction(`❌ Withdraw failed: ${e?.message ?? 'unknown'}`);
    }
  }, [numericGameId, navigate]);

  // ── Guards ───────────────────────────────────────────────────────────────
  if (!address) {
    return (
      <div className="game-page game-page--auth">
        <div className="loading-spinner" />
        <p>Connect your wallet to play.</p>
      </div>
    );
  }

  if (isLoading && !gameState) {
    return (
      <div className="game-page game-page--loading">
        <div className="loading-spinner" />
        <p>Loading game #{gameId}...</p>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="game-page game-page--error">
        <p>Game #{gameId} not found.</p>
        <button className="btn btn--primary" onClick={() => navigate('/lobby')}>← Back to Lobby</button>
      </div>
    );
  }

  const phase = gameState.phase;

  return (
    <div className="game-page">
      {/* ── Header ── */}
      <header className="game-page__header">
        <button className="btn-back" onClick={() => navigate('/lobby')}>← Lobby</button>
        <div className="game-page__title">
          <h1>Game #{gameId}</h1>
          {isTournamentGame && (
            <TournamentBadge
              tournamentId={gameState.tournamentId!}
              matchId={gameState.tournamentMatchId!}
            />
          )}
        </div>
        <div className="game-page__bet">
          {gameState.bet !== '0' && (
            <span className="bet-badge">
              💰 {(Number(gameState.bet) / 1e18).toFixed(3)} EGLD
            </span>
          )}
        </div>
      </header>

      {/* ── Status banner ── */}
      {lastAction && (
        <div
          className={`game-page__banner ${
            lastAction.startsWith('❌') ? 'banner--error' :
            lastAction.startsWith('🏆') ? 'banner--win' : 'banner--info'
          }`}
        >
          {lastAction}
          <button className="banner__close" onClick={() => setLastAction(null)}>✕</button>
        </div>
      )}

      {/* ══════════════ PHASE: Waiting for opponent ══════════════ */}
      {phase === 'WaitingForOpponent' && (
        <div className="game-page__waiting">
          <div className="waiting-card">
            <div className="waiting-icon">⚓</div>
            <h2>Waiting for opponent</h2>
            <p>Share this Game ID with your opponent:</p>
            <div className="waiting-id">{gameId}</div>
            <p className="waiting-hint">They paste it in the Lobby → Join Game.</p>
            {isCreator && (
              <button className="btn btn--danger" onClick={handleWithdraw}>
                Cancel &amp; Withdraw Wager
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ PHASE: Placing ships ══════════════ */}
      {phase === 'PlacingShips' && (
        <div className="game-page__placement">
          <h2 className="phase-title">Place Your Fleet</h2>
          <p className="phase-subtitle">
            Place all 5 ships secretly. Press <kbd>R</kbd> or right-click to rotate.
            Your opponent is doing the same simultaneously.
          </p>
          <PlacementBoard
            onPlacementsChange={setPlacements}
            disabled={placingShips}
          />
          <div className="placement-actions">
            <span className="placement-count">{placements.length}/5 ships placed</span>
            <button
              className="btn btn--primary"
              disabled={placements.length !== 5 || placingShips}
              onClick={handlePlaceShips}
            >
              {placingShips ? 'Submitting...' : 'Confirm Fleet ✓'}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════ PHASE: In Progress / Finished ══════════════ */}
      {(phase === 'InProgress' || phase === 'Finished') && (
        <div className="game-page__battle">
          <div className="battle-layout">
            {/* Left — My board (defence) */}
            <div className="board-section board-section--mine">
              <h3 className="board-label">
                🛡 Your Fleet
                {phase === 'InProgress' && !isMyTurn && (
                  <span className="turn-indicator turn-indicator--waiting">
                    Opponent's turn…
                  </span>
                )}
              </h3>
              <GameBoard
                cells={myBoard}
                isInteractive={false}
                showShips
              />
            </div>

            {/* Centre — Status panel */}
            <GameStatus
              gameState={gameState}
              address={address}
              isMyTurn={isMyTurn}
              phase={phase}
            />

            {/* Right — Opponent board (attack) */}
            <div className="board-section board-section--opponent">
              <h3 className="board-label">
                🎯 Enemy Waters
                {isMyTurn && phase === 'InProgress' && (
                  <span className="turn-indicator turn-indicator--active">
                    ← Your turn! Fire!
                  </span>
                )}
              </h3>
              <GameBoard
                cells={opponentBoard}
                isInteractive={isMyTurn && phase === 'InProgress' && !attacking}
                onCellClick={handleAttack}
                showShips={false}
              />
              {attacking && (
                <p className="attacking-hint">💨 Attack in progress...</p>
              )}
            </div>
          </div>

          {/* ── Winner overlay ── */}
          {phase === 'Finished' && gameState.winner && (
            <div className="game-page__result">
              <div className="result-card">
                {gameState.winner === address ? (
                  <>
                    <div className="result-icon">🏆</div>
                    <h2>Victory!</h2>
                    <p>You sank the entire enemy fleet.</p>
                    {isTournamentGame && (
                      <p className="tournament-note">
                        ✅ Tournament result submitted automatically.
                      </p>
                    )}
                    <button
                      className="btn btn--primary"
                      onClick={handleWithdraw}
                    >
                      Claim {(Number(gameState.bet) / 1e18).toFixed(3)} EGLD 💰
                    </button>
                  </>
                ) : (
                  <>
                    <div className="result-icon">💀</div>
                    <h2>Defeated</h2>
                    <p>Your fleet was destroyed. Better luck next battle.</p>
                  </>
                )}
                <button
                  className="btn btn--secondary"
                  onClick={() => navigate('/lobby')}
                >
                  Back to Lobby
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GamePage;
