import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { GameBoard } from '../../components/GameBoard/GameBoard';
import { useGame } from '../../hooks/useGame';
import type { ShipPlacement } from '../../services/battleship.service';
import './Game.css';

// Standard ship fleet: [length, name]
const FLEET: [number, string][] = [
  [5, 'Carrier'],
  [4, 'Battleship'],
  [3, 'Cruiser'],
  [3, 'Submarine'],
  [2, 'Destroyer'],
];

type PlacementShip = ShipPlacement & { name: string; placed: boolean };
type GameView = 'lobby' | 'placement' | 'battle' | 'finished';

const GamePage: React.FC = () => {
  const { address } = useGetAccountInfo();
  const {
    gameId, gameState, myBoard, opponentBoard,
    loading, error,
    handleCreateGame, handleJoinGame, handlePlaceShips,
    handleAttack, handleWithdraw, refreshGameState, setMyBoard,
  } = useGame();

  const [view, setView] = useState<GameView>('lobby');
  const [betInput, setBetInput] = useState('0.01');
  const [joinIdInput, setJoinIdInput] = useState('');
  const [log, setLog] = useState<string[]>(['Welcome to MetaShipX. Create or join a game to start.']);
  const [ships, setShips] = useState<PlacementShip[]>(
    FLEET.map(([length, name], i) => ({
      name, length, x: i * 2, y: 0, isVertical: false, placed: false,
    }))
  );
  const [selectedShipIdx, setSelectedShipIdx] = useState<number | null>(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll game state every 5s during active game
  useEffect(() => {
    if (gameId && (view === 'placement' || view === 'battle')) {
      pollingRef.current = setInterval(refreshGameState, 5000);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [gameId, view, refreshGameState]);

  // Sync view with game state phase
  useEffect(() => {
    if (!gameState) return;
    if (gameState.phase === 'PlacingShips') setView('placement');
    if (gameState.phase === 'InProgress') setView('battle');
    if (gameState.phase === 'Finished') setView('finished');
  }, [gameState?.phase]);

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)]);
  }, []);

  /* ── Lobby actions ───────────────────────── */
  const onCreateGame = async () => {
    await handleCreateGame(betInput);
    addLog(`Creating game with bet ${betInput} EGLD...`);
    setView('placement');
  };

  const onJoinGame = async () => {
    const gid = parseInt(joinIdInput, 10);
    if (isNaN(gid)) return;
    await handleJoinGame(gid, betInput);
    addLog(`Joined game #${gid}`);
    setView('placement');
  };

  /* ── Placement actions ───────────────────── */
  const onBoardCellClick = useCallback((row: number, col: number) => {
    if (selectedShipIdx === null) return;
    const ship = ships[selectedShipIdx];
    if (ship.placed) return;

    // Validate fits on board
    for (let i = 0; i < ship.length; i++) {
      const r = ship.isVertical ? row + i : row;
      const c = ship.isVertical ? col : col + i;
      if (r >= 10 || c >= 10) { addLog('Ship does not fit here!'); return; }
    }

    setShips((prev) => prev.map((s, i) =>
      i === selectedShipIdx ? { ...s, x: row, y: col, placed: true } : s
    ));

    // Update visual board
    setMyBoard((prev) => {
      const next = prev.map((r) => [...r]);
      for (let i = 0; i < ship.length; i++) {
        const r = ship.isVertical ? row + i : row;
        const c = ship.isVertical ? col : col + i;
        next[r][c] = 'ship';
      }
      return next;
    });

    addLog(`Placed ${ship.name} at ${String.fromCharCode(65 + col)}${row + 1}`);
    // Auto-select next unplaced
    const nextIdx = ships.findIndex((s, i) => i > selectedShipIdx && !s.placed);
    setSelectedShipIdx(nextIdx === -1 ? null : nextIdx);
  }, [selectedShipIdx, ships, addLog, setMyBoard]);

  const toggleOrientation = () => {
    if (selectedShipIdx === null) return;
    setShips((prev) => prev.map((s, i) =>
      i === selectedShipIdx ? { ...s, isVertical: !s.isVertical } : s
    ));
  };

  const onConfirmPlacement = async () => {
    const unplaced = ships.filter((s) => !s.placed);
    if (unplaced.length > 0) {
      addLog(`Still need to place: ${unplaced.map((s) => s.name).join(', ')}`);
      return;
    }
    const placements: ShipPlacement[] = ships.map((s) => ({
      x: s.x, y: s.y, length: s.length, isVertical: s.isVertical,
    }));
    await handlePlaceShips(placements);
    addLog('Ships placed! Waiting for opponent...');
  };

  /* ── Battle actions ──────────────────────── */
  const onAttack = useCallback(async (row: number, col: number) => {
    const col_letter = String.fromCharCode(65 + col);
    addLog(`Attacking ${col_letter}${row + 1}...`);
    await handleAttack(row, col);
    addLog(`Attack on ${col_letter}${row + 1} sent.`);
  }, [handleAttack, addLog]);

  const isMyTurn = gameState && address &&
    ((gameState.currentTurn === 0 && gameState.creator === address) ||
     (gameState.currentTurn === 1 && gameState.opponent === address));

  /* ── Render ──────────────────────────────── */
  return (
    <div className="game-page">
      <header className="game-header">
        <h1 className="game-title">
          <span className="game-title-icon">⚓</span> MetaShipX
        </h1>
        {gameId && (
          <div className="game-id-badge">Game #{gameId}</div>
        )}
        {gameState && (
          <div className={`game-phase-badge game-phase-badge--${gameState.phase.toLowerCase()}`}>
            {gameState.phase === 'WaitingForOpponent' && '⏳ Waiting for opponent'}
            {gameState.phase === 'PlacingShips' && '🚢 Placing ships'}
            {gameState.phase === 'InProgress' && (isMyTurn ? '⚔️ Your turn' : "🕐 Opponent's turn")}
            {gameState.phase === 'Finished' && '🏆 Game over'}
          </div>
        )}
      </header>

      {error && <div className="game-error">{error}</div>}

      {/* ── LOBBY ── */}
      {view === 'lobby' && (
        <div className="game-lobby">
          <div className="lobby-card">
            <h2>Create Game</h2>
            <p>Set your bet and wait for an opponent to join.</p>
            <div className="lobby-form">
              <label>Bet (EGLD)
                <input
                  type="number" min="0.001" step="0.001"
                  value={betInput}
                  onChange={(e) => setBetInput(e.target.value)}
                />
              </label>
              <button className="btn btn-primary" onClick={onCreateGame} disabled={loading || !address}>
                {loading ? 'Creating...' : '⚔️ Create Game'}
              </button>
            </div>
          </div>

          <div className="lobby-divider">OR</div>

          <div className="lobby-card">
            <h2>Join Game</h2>
            <p>Enter a game ID to join an existing match.</p>
            <div className="lobby-form">
              <label>Game ID
                <input
                  type="number" placeholder="e.g. 42"
                  value={joinIdInput}
                  onChange={(e) => setJoinIdInput(e.target.value)}
                />
              </label>
              <label>Your Bet (EGLD)
                <input
                  type="number" min="0.001" step="0.001"
                  value={betInput}
                  onChange={(e) => setBetInput(e.target.value)}
                />
              </label>
              <button className="btn btn-secondary" onClick={onJoinGame} disabled={loading || !address || !joinIdInput}>
                {loading ? 'Joining...' : '🚀 Join Game'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PLACEMENT ── */}
      {view === 'placement' && (
        <div className="game-placement">
          <div className="placement-instructions">
            <p>Click a ship below to select it, then click the board to place it. Press <kbd>R</kbd> to rotate.</p>
          </div>

          <div className="placement-fleet">
            {ships.map((ship, i) => (
              <button
                key={i}
                className={`fleet-ship${
                  selectedShipIdx === i ? ' fleet-ship--selected' : ''
                }${ship.placed ? ' fleet-ship--placed' : ''}`}
                onClick={() => !ship.placed && setSelectedShipIdx(i)}
              >
                <span className="fleet-ship-name">{ship.name}</span>
                <span className="fleet-ship-cells">
                  {Array.from({ length: ship.length }).map((_, j) => (
                    <span key={j} className="fleet-ship-cell" />
                  ))}
                </span>
                {ship.placed && <span className="fleet-ship-check">✓</span>}
              </button>
            ))}
          </div>

          <div className="placement-actions">
            <button className="btn btn-outline" onClick={toggleOrientation}>
              🔄 Rotate {selectedShipIdx !== null ? `(${ships[selectedShipIdx]?.isVertical ? 'Vertical' : 'Horizontal'})` : ''}
            </button>
          </div>

          <GameBoard
            board={myBoard}
            interactive
            onCellClick={onBoardCellClick}
            label="Your Board — Click to place ships"
          />

          <div className="placement-submit">
            <button
              className="btn btn-primary btn-lg"
              onClick={onConfirmPlacement}
              disabled={loading || ships.some((s) => !s.placed)}
            >
              {loading ? 'Sending...' : `Confirm Placement (${ships.filter(s => s.placed).length}/${ships.length})`}
            </button>
            {gameId && (
              <button className="btn btn-danger" onClick={handleWithdraw} disabled={loading}>
                Withdraw & Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── BATTLE ── */}
      {view === 'battle' && (
        <div className="game-battle">
          <div className="battle-boards">
            <GameBoard
              board={myBoard}
              label="Your Fleet"
              interactive={false}
            />
            <div className="battle-vs">VS</div>
            <GameBoard
              board={opponentBoard}
              interactive={!!isMyTurn}
              onCellClick={onAttack}
              disabled={!isMyTurn || loading}
              label={isMyTurn ? '⚔️ Attack — Click a cell' : "Opponent's Fleet"}
            />
          </div>

          {gameState && (
            <div className="battle-status">
              <div className="battle-bet">
                💰 Prize Pool: <strong>{(parseInt(gameState.bet) * 2 / 1e18).toFixed(4)} EGLD</strong>
              </div>
              {isMyTurn && <div className="battle-turn-indicator">⚔️ Your turn — choose a target!</div>}
            </div>
          )}
        </div>
      )}

      {/* ── FINISHED ── */}
      {view === 'finished' && gameState && (
        <div className="game-finished">
          <div className="finished-card">
            {gameState.winner === address ? (
              <>
                <div className="finished-icon">🏆</div>
                <h2>Victory!</h2>
                <p>You won the prize pool!</p>
              </>
            ) : (
              <>
                <div className="finished-icon">💀</div>
                <h2>Defeat</h2>
                <p>Better luck next time.</p>
              </>
            )}
            <button className="btn btn-primary" onClick={() => { setView('lobby'); setShips(FLEET.map(([length, name], i) => ({ name, length, x: i * 2, y: 0, isVertical: false, placed: false }))); }}>
              🔄 Play Again
            </button>
          </div>
        </div>
      )}

      {/* ── GAME LOG ── */}
      <div className="game-log">
        <h3 className="game-log-title">Game Log</h3>
        <ul className="game-log-list">
          {log.map((entry, i) => <li key={i}>{entry}</li>)}
        </ul>
      </div>
    </div>
  );
};

export default GamePage;
