/**
 * PracticePage — AI Bot Practice Mode
 * No wallet required. No EGLD. No on-chain transactions.
 * Uses /practice REST API on the NestJS backend.
 */
import React, { useState, useCallback } from 'react';
import './PracticePage.css';

type Difficulty = 'easy' | 'medium' | 'hard';
type Phase = 'idle' | 'placement' | 'battle' | 'finished';
type CellState = 0 | 1 | 2 | -1; // empty | ship | hit | miss

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001';

const SHIP_SIZES: Record<string, number> = {
  Carrier: 5, Battleship: 4, Cruiser: 3, Submarine: 3, Destroyer: 2,
};

function emptyBoard(): CellState[][] {
  return Array.from({ length: 10 }, () => new Array(10).fill(0) as CellState[]);
}

function cellClass(state: CellState, isEnemy: boolean): string {
  if (state === 1 && !isEnemy) return 'cell cell-ship';
  if (state === 2) return 'cell cell-hit';
  if (state === -1) return 'cell cell-miss';
  return 'cell';
}

export default function PracticePage() {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [phase, setPhase] = useState<Phase>('idle');
  const [playerBoard, setPlayerBoard] = useState<CellState[][]>(emptyBoard());
  const [enemyBoard, setEnemyBoard]   = useState<CellState[][]>(emptyBoard());
  const [botMove, setBotMove]   = useState<{ row: number; col: number; hit: boolean } | null>(null);
  const [winner, setWinner]     = useState<'player' | 'bot' | null>(null);
  const [message, setMessage]   = useState('');
  const [loading, setLoading]   = useState(false);

  // Placement state
  const [selectedShip, setSelectedShip] = useState<string | null>(null);
  const [horizontal, setHorizontal]     = useState(true);
  const [placedShips, setPlacedShips]   = useState<string[]>([]);

  const api = useCallback(async (endpoint: string, body: object) => {
    const res = await fetch(`${BACKEND}/practice/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    return res.json();
  }, []);

  const handleStart = async () => {
    setLoading(true);
    const res = await api('start', { difficulty });
    if (res.ok) {
      setPhase('placement');
      setPlayerBoard(emptyBoard());
      setEnemyBoard(emptyBoard());
      setPlacedShips([]);
      setSelectedShip(null);
      setWinner(null);
      setMessage('Place your fleet. Select a ship, then click a cell.');
    }
    setLoading(false);
  };

  const handleCellClick = useCallback((row: number, col: number) => {
    if (phase === 'placement' && selectedShip) {
      const size = SHIP_SIZES[selectedShip];
      const newBoard = playerBoard.map(r => [...r]) as CellState[][];
      // Validate placement
      for (let i = 0; i < size; i++) {
        const r = horizontal ? row : row + i;
        const c = horizontal ? col + i : col;
        if (r >= 10 || c >= 10 || newBoard[r][c] !== 0) {
          setMessage('❌ Cannot place ship there.');
          return;
        }
      }
      for (let i = 0; i < size; i++) {
        const r = horizontal ? row : row + i;
        const c = horizontal ? col + i : col;
        newBoard[r][c] = 1;
      }
      setPlayerBoard(newBoard);
      const newPlaced = [...placedShips, selectedShip];
      setPlacedShips(newPlaced);
      setSelectedShip(null);
      setMessage(`${selectedShip} placed! ${Object.keys(SHIP_SIZES).length - newPlaced.length} ships remaining.`);
      // Auto-submit when all ships placed
      if (newPlaced.length === Object.keys(SHIP_SIZES).length) {
        submitPlacement(newBoard);
      }
    } else if (phase === 'battle') {
      handleAttack(row, col);
    }
  }, [phase, selectedShip, horizontal, playerBoard, placedShips]);

  const submitPlacement = async (board: CellState[][]) => {
    setLoading(true);
    const positions = board.flatMap((row, r) =>
      row.map((cell, c) => cell === 1 ? [r, c] : null).filter(Boolean)
    );
    const res = await api('place', { positions });
    if (res.ok) {
      setPhase('battle');
      setMessage('🎯 Battle starts! Click enemy cells to attack.');
    }
    setLoading(false);
  };

  const handleAttack = async (row: number, col: number) => {
    if (loading || enemyBoard[row][col] !== 0) return;
    setLoading(true);
    const res = await api('attack', { row, col });
    if (res.error) { setMessage(res.error); setLoading(false); return; }

    // Update enemy board
    setEnemyBoard(prev => {
      const nb = prev.map(r => [...r]) as CellState[][];
      nb[row][col] = res.hit ? 2 : -1;
      return nb;
    });

    // Update player board with bot move
    if (res.botMove) {
      setBotMove(res.botMove);
      setPlayerBoard(prev => {
        const nb = prev.map(r => [...r]) as CellState[][];
        nb[res.botMove.row][res.botMove.col] = res.botMove.hit ? 2 : -1;
        return nb;
      });
    }

    if (res.winner) {
      setPhase('finished');
      setWinner(res.winner);
      setMessage(res.winner === 'player' ? '🏆 You win! All enemy ships sunk.' : '💀 Bot wins. Try again!');
    } else {
      setMessage(res.hit ? '💥 Hit!' : '🌊 Miss.');
    }
    setLoading(false);
  };

  const remainingShips = Object.keys(SHIP_SIZES).filter(s => !placedShips.includes(s));

  return (
    <div className="practice-page">
      <div className="practice-header">
        <h1>⚓ Practice Mode</h1>
        <p>No wallet needed. No EGLD. Pure strategy.</p>
      </div>

      {phase === 'idle' && (
        <div className="practice-setup">
          <h2>Choose Difficulty</h2>
          <div className="difficulty-btns">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
              <button
                key={d}
                className={`btn-diff ${difficulty === d ? 'btn-diff--active' : ''}`}
                onClick={() => setDifficulty(d)}
              >
                {d === 'easy' ? '🟢 Easy' : d === 'medium' ? '🟡 Medium' : '🔴 Hard'}
              </button>
            ))}
          </div>
          <div className="difficulty-desc">
            {difficulty === 'easy'   && 'Random shots — forgiving, good for learning placement.'}
            {difficulty === 'medium' && 'Hunt/Target — bot pursues hits. Solid challenge.'}
            {difficulty === 'hard'   && 'Probability map — bot calculates optimal attacks. Brutal.'}
          </div>
          <button className="btn-start" onClick={handleStart} disabled={loading}>
            {loading ? 'Starting…' : '▶ Start Practice Game'}
          </button>
        </div>
      )}

      {phase !== 'idle' && (
        <>
          {message && <div className="practice-msg">{message}</div>}

          {/* Ship selector during placement */}
          {phase === 'placement' && (
            <div className="ship-selector">
              <button
                className={`btn-rotate ${horizontal ? 'btn-rotate--h' : 'btn-rotate--v'}`}
                onClick={() => setHorizontal(h => !h)}
              >
                {horizontal ? '↔ Horizontal' : '↕ Vertical'}
              </button>
              {remainingShips.map(ship => (
                <button
                  key={ship}
                  className={`btn-ship ${selectedShip === ship ? 'btn-ship--selected' : ''}`}
                  onClick={() => setSelectedShip(ship)}
                >
                  {ship} ({SHIP_SIZES[ship]})
                </button>
              ))}
            </div>
          )}

          <div className="boards">
            {/* Player board */}
            <div className="board-wrap">
              <h3>Your Fleet</h3>
              <div className="board">
                {playerBoard.map((row, r) => (
                  <div key={r} className="board-row">
                    {row.map((cell, c) => (
                      <div
                        key={c}
                        className={`${cellClass(cell, false)}${phase === 'placement' ? ' cell-placeable' : ''}`}
                        onClick={() => phase === 'placement' && handleCellClick(r, c)}
                        data-testid={`player-cell-${r}-${c}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Enemy board */}
            <div className="board-wrap">
              <h3>Enemy Waters</h3>
              <div className="board">
                {enemyBoard.map((row, r) => (
                  <div key={r} className="board-row">
                    {row.map((cell, c) => (
                      <div
                        key={c}
                        className={`${cellClass(cell, true)}${phase === 'battle' && cell === 0 ? ' cell-attackable' : ''}`}
                        onClick={() => phase === 'battle' && handleAttack(r, c)}
                        data-testid={`enemy-cell-${r}-${c}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {phase === 'finished' && (
            <div className="practice-result">
              <div className={`result-badge ${winner === 'player' ? 'result-win' : 'result-loss'}`}>
                {winner === 'player' ? '🏆 Victory!' : '💀 Defeated'}
              </div>
              <div className="result-actions">
                <button className="btn-start" onClick={handleStart}>Play Again</button>
                <a href="/lobby" className="btn-secondary">Play vs Real Opponent</a>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
