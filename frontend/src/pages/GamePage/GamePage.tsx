import React, { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { useGame } from '../../hooks/useGame';
import { useGameWs } from '../../hooks/useGameWs';
import { GameBoard } from '../../components/GameBoard/GameBoard';
import { PlacementGrid } from '../../components/PlacementGrid/PlacementGrid';
import './GamePage.css';

const SHIPS: { type: string; size: number }[] = [
  { type: 'Carrier',    size: 5 },
  { type: 'Battleship', size: 4 },
  { type: 'Cruiser',    size: 3 },
  { type: 'Submarine',  size: 3 },
  { type: 'Destroyer',  size: 2 },
];

function fmtEgld(wei: string) {
  try { return (Number(BigInt(wei)) / 1e18).toFixed(4) + ' EGLD'; } catch { return wei; }
}
function fmtAddr(a: string) { return a ? a.slice(0, 6) + '…' + a.slice(-4) : ''; }

export function GamePage(): React.ReactElement {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { account } = useGetAccountInfo();
  const myAddress = account?.address ?? '';
  const numGameId = parseInt(gameId ?? '0', 10);

  const game = useGame(myAddress);

  // ── WebSocket: receive enemy attacks live ─────────────────────────────────
  useGameWs({
    gameId: numGameId,
    myAddress,
    onAttack: (row, col, result) => game.receiveEnemyAttack(row, col, result),
  });

  useEffect(() => {
    if (!gameId || isNaN(numGameId)) navigate('/');
  }, [gameId, navigate, numGameId]);

  // Placement: collect [row, col] pairs from PlacementGrid
  const handlePlacementConfirm = useCallback(
    async (positions: number[][]) => {
      await game.placeShips(positions);
    },
    [game]
  );

  // Battle: attack on enemy board click
  const handleEnemyCellClick = useCallback(
    async (row: number, col: number) => {
      if (!game.isMyTurn || game.status !== 'active') return;
      await game.handleAttack(row, col);
    },
    [game]
  );

  // ── Render helpers ────────────────────────────────────────────────────────
  const iWon = game.winner === myAddress;

  return (
    <main className="gp-root">
      {/* ── Header ── */}
      <header className="gp-header">
        <button className="gp-back" onClick={() => navigate('/lobby')}>← Lobby</button>
        <h1 className="gp-title">Game #{gameId}</h1>
        <span className={`gp-status gp-status--${game.status}`}>{game.status.toUpperCase()}</span>
      </header>

      {game.error && <div className="gp-error">{game.error}</div>}

      {/* ── PHASE: WAITING ── */}
      {(game.status === 'idle' || game.status === 'waiting') && (
        <section className="gp-waiting">
          <div className="gp-waiting-icon">⏳</div>
          <h2>Waiting for opponent…</h2>
          <p>Share this link:</p>
          <code className="gp-share-link">{window.location.href}</code>
          {game.loading && <div className="gp-spinner" />}
        </section>
      )}

      {/* ── PHASE: PLACEMENT ── */}
      {game.status === 'placing' && (
        <section className="gp-placement">
          <h2>Place Your Fleet</h2>
          <p className="gp-hint">Click a cell to place ship, click again to rotate. Confirm when ready.</p>
          <PlacementGrid ships={SHIPS} onConfirm={handlePlacementConfirm} loading={game.loading} />
        </section>
      )}

      {/* ── PHASE: BATTLE ── */}
      {game.status === 'active' && (
        <section className="gp-battle">
          <div className="gp-turn-banner">
            {game.isMyTurn
              ? <span className="gp-my-turn">🎯 Your turn — select a target</span>
              : <span className="gp-enemy-turn">⏳ Opponent is thinking…</span>}
          </div>

          <div className="gp-boards">
            {/* My board (defensive) */}
            <div className="gp-board-wrap">
              <h3>Your Fleet</h3>
              <GameBoard
                cells={game.myBoard}
                onCellClick={() => {}}
                interactive={false}
                lastAttack={game.lastAttack?.isMyAttack === false ? game.lastAttack : null}
                label="Your Board"
                myAddress={myAddress}
              />
            </div>

            {/* Divider */}
            <div className="gp-vs">
              <span>VS</span>
              {game.bet !== '0' && (
                <div className="gp-wager">
                  <span>🏆</span>
                  <strong>{fmtEgld(game.bet)}</strong>
                </div>
              )}
            </div>

            {/* Enemy board (offensive) */}
            <div className="gp-board-wrap">
              <h3>Enemy Fleet</h3>
              <GameBoard
                cells={game.enemyBoard}
                onCellClick={handleEnemyCellClick}
                interactive={game.isMyTurn}
                lastAttack={game.lastAttack?.isMyAttack === true ? game.lastAttack : null}
                label="Enemy Board"
                myAddress={myAddress}
              />
            </div>
          </div>

          {game.loading && <div className="gp-tx-pending">📡 Transaction pending…</div>}
        </section>
      )}

      {/* ── PHASE: FINISHED ── */}
      {game.status === 'finished' && (
        <section className="gp-finished">
          {iWon ? (
            <>
              <div className="gp-result gp-result--win">🏆 Victory!</div>
              <p>You won {fmtEgld(game.bet)}!</p>
            </>
          ) : (
            <>
              <div className="gp-result gp-result--loss">💥 Defeat</div>
              <p>Better luck next time.</p>
            </>
          )}
          <div className="gp-finished-actions">
            <button className="gp-btn-primary" onClick={() => navigate('/lobby')}>Back to Lobby</button>
            <button className="gp-btn-secondary" onClick={() => navigate(`/spectate/${gameId}`)}>Watch Replay</button>
          </div>
        </section>
      )}
    </main>
  );
}
