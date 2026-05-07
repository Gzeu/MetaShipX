import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
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

  const { gameState, myBoard, opponentBoard, refreshGame, isLoading } =
    useGame(numericGameId);

  // Poll every 4s when game is in progress or waiting for placement
  useGamePolling(refreshGame, gameState?.phase);

  const [placements, setPlacements] = useState<ShipPlacement[]>([]);
  const [placingShips, setPlacingShips] = useState(false);
  const [attacking, setAttacking] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Determine player role
  const isCreator = gameState?.creator === address;
  const isOpponent = gameState?.opponent === address;
  const isMyTurn =
    gameState?.phase === 'InProgress' &&
    ((isCreator && gameState.currentTurn === 0) ||
      (isOpponent && gameState.currentTurn === 1));

  const isTournamentGame =
    gameState?.tournamentId !== undefined && gameState.tournamentId > 0;

  // --- Place ships ---
  const handlePlaceShips = useCallback(async () => {
    if (placements.length !== 5) {
      setLastAction('⚠️ Trebuie să plasezi toate cele 5 nave!');
      return;
    }
    setPlacingShips(true);
    setLastAction(null);
    try {
      await battleshipService.placeShips(numericGameId, placements);
      setLastAction('✅ Nave plasate! Așteptând adversarul...');
      await refreshGame();
    } catch (e: any) {
      setLastAction(`❌ Eroare: ${e?.message ?? 'necunoscută'}`);
    } finally {
      setPlacingShips(false);
    }
  }, [numericGameId, placements, refreshGame]);

  // --- Attack ---
  const handleAttack = useCallback(
    async (x: number, y: number) => {
      if (!isMyTurn || attacking) return;
      setAttacking(true);
      setLastAction(null);
      try {
        const result = await battleshipService.attack(numericGameId, x, y);
        const labels: Record<string, string> = {
          Hit: '💥 Lovit!',
          Miss: '🌊 Ratat!',
          Sunk: '🔥 Navă scufundată!',
          GameOver: '🏆 Ai câștigat! Felicitări!',
        };
        setLastAction(labels[result] ?? result);
        await refreshGame();
      } catch (e: any) {
        setLastAction(`❌ Eroare atac: ${e?.message ?? 'necunoscută'}`);
      } finally {
        setAttacking(false);
      }
    },
    [numericGameId, isMyTurn, attacking, refreshGame]
  );

  // --- Withdraw ---
  const handleWithdraw = useCallback(async () => {
    try {
      await battleshipService.withdraw(numericGameId);
      navigate('/lobby');
    } catch (e: any) {
      setLastAction(`❌ Withdraw eșuat: ${e?.message ?? 'necunoscută'}`);
    }
  }, [numericGameId, navigate]);

  if (!address) {
    return (
      <div className="game-page game-page--auth">
        <p>Conectează wallet-ul pentru a juca.</p>
      </div>
    );
  }

  if (isLoading && !gameState) {
    return (
      <div className="game-page game-page--loading">
        <div className="loading-spinner" />
        <p>Se încarcă jocul...</p>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="game-page game-page--error">
        <p>Jocul #{gameId} nu a fost găsit.</p>
        <button onClick={() => navigate('/lobby')}>← Înapoi la lobby</button>
      </div>
    );
  }

  const phase = gameState.phase;

  return (
    <div className="game-page">
      {/* ── Header ── */}
      <header className="game-page__header">
        <button className="btn-back" onClick={() => navigate('/lobby')}>
          ← Lobby
        </button>
        <div className="game-page__title">
          <h1>Joc #{gameId}</h1>
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
        <div className={`game-page__banner ${
          lastAction.startsWith('❌') ? 'banner--error' :
          lastAction.startsWith('🏆') ? 'banner--win' : 'banner--info'
        }`}>
          {lastAction}
        </div>
      )}

      {/* ── Phase: Waiting for opponent ── */}
      {phase === 'WaitingForOpponent' && (
        <div className="game-page__waiting">
          <div className="waiting-card">
            <div className="waiting-icon">⚓</div>
            <h2>Așteptând adversar</h2>
            <p>Distribuie ID-ul jocului: <strong>#{gameId}</strong></p>
            <div className="waiting-id">{gameId}</div>
            {isCreator && (
              <button
                className="btn btn--danger"
                onClick={handleWithdraw}
              >
                Anulează & Retrage Pariul
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Phase: PlacingShips ── */}
      {phase === 'PlacingShips' && (
        <div className="game-page__placement">
          <h2 className="phase-title">Plasează Navele</h2>
          <p className="phase-subtitle">
            Plasează toate cele 5 nave pe tablă. Adversarul face același lucru simultan.
          </p>
          <PlacementBoard
            onPlacementsChange={setPlacements}
            disabled={placingShips}
          />
          <div className="placement-actions">
            <span className="placement-count">
              {placements.length}/5 nave plasate
            </span>
            <button
              className="btn btn--primary"
              disabled={placements.length !== 5 || placingShips}
              onClick={handlePlaceShips}
            >
              {placingShips ? 'Se trimite...' : 'Confirmă Plasarea ✓'}
            </button>
          </div>
        </div>
      )}

      {/* ── Phase: InProgress / Finished ── */}
      {(phase === 'InProgress' || phase === 'Finished') && (
        <div className="game-page__battle">
          <div className="battle-layout">
            {/* Left: My board */}
            <div className="board-section board-section--mine">
              <h3 className="board-label">
                🛡 Tablă Ta
                {phase === 'InProgress' && !isMyTurn && (
                  <span className="turn-indicator turn-indicator--waiting">
                    Rândul adversarului...
                  </span>
                )}
              </h3>
              <GameBoard
                cells={myBoard}
                isInteractive={false}
                showShips
              />
            </div>

            {/* Center: Status */}
            <GameStatus
              gameState={gameState}
              address={address}
              isMyTurn={isMyTurn}
              phase={phase}
            />

            {/* Right: Opponent board */}
            <div className="board-section board-section--opponent">
              <h3 className="board-label">
                🎯 Tablă Adversar
                {isMyTurn && phase === 'InProgress' && (
                  <span className="turn-indicator turn-indicator--active">
                    ← Rândul tău! Atacă!
                  </span>
                )}
              </h3>
              <GameBoard
                cells={opponentBoard}
                isInteractive={isMyTurn && phase === 'InProgress' && !attacking}
                onCellClick={handleAttack}
                showShips={false}
              />
            </div>
          </div>

          {/* Winner overlay */}
          {phase === 'Finished' && gameState.winner && (
            <div className="game-page__result">
              <div className="result-card">
                {gameState.winner === address ? (
                  <>
                    <div className="result-icon">🏆</div>
                    <h2>Victorie!</h2>
                    <p>Ai câștigat jocul!</p>
                    {isTournamentGame && (
                      <p className="tournament-note">
                        Rezultatul a fost raportat automat la turneu.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="result-icon">💀</div>
                    <h2>Înfrângere</h2>
                    <p>Mai ai o șansă data viitoare.</p>
                  </>
                )}
                <button
                  className="btn btn--primary"
                  onClick={() => navigate('/lobby')}
                >
                  Înapoi la Lobby
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
