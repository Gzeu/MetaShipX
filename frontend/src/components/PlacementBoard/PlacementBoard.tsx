/**
 * PlacementBoard — interactive 10×10 grid for placing ships before battle.
 *
 * Ships (5 total, fixed lengths): Carrier(5), Battleship(4), Cruiser(3),
 * Submarine(3), Destroyer(2). User clicks a cell, selects orientation,
 * and the ship is placed if valid. Drag-to-rotate is supported via
 * right-click / R key.
 */
import React, { useState, useCallback, useEffect } from 'react';
import type { ShipPlacement } from '../../types/game.types';
import './placement-board.css';

const SHIPS = [
  { id: 0, name: 'Carrier',     length: 5, emoji: '🛳' },
  { id: 1, name: 'Battleship',  length: 4, emoji: '⚔️' },
  { id: 2, name: 'Cruiser',     length: 3, emoji: '🚢' },
  { id: 3, name: 'Submarine',   length: 3, emoji: '🤿' },
  { id: 4, name: 'Destroyer',   length: 2, emoji: '⚡' },
] as const;

const COLS = ['A','B','C','D','E','F','G','H','I','J'];
const SIZE = 10;

interface Props {
  onPlacementsChange: (placements: ShipPlacement[]) => void;
  disabled?: boolean;
}

type Board = (number | null)[][]; // null = empty, number = ship id

function makeEmptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
}

function canPlace(
  board: Board,
  shipId: number,
  length: number,
  x: number,
  y: number,
  vertical: boolean
): boolean {
  for (let step = 0; step < length; step++) {
    const cx = vertical ? x + step : x;
    const cy = vertical ? y : y + step;
    if (cx >= SIZE || cy >= SIZE) return false;
    if (board[cx][cy] !== null) return false;
  }
  return true;
}

function placeOnBoard(
  board: Board,
  shipId: number,
  length: number,
  x: number,
  y: number,
  vertical: boolean
): Board {
  const next = board.map(row => [...row]) as Board;
  for (let step = 0; step < length; step++) {
    const cx = vertical ? x + step : x;
    const cy = vertical ? y : y + step;
    next[cx][cy] = shipId;
  }
  return next;
}

function removeFromBoard(board: Board, shipId: number): Board {
  return board.map(row => row.map(cell => (cell === shipId ? null : cell))) as Board;
}

export const PlacementBoard: React.FC<Props> = ({ onPlacementsChange, disabled }) => {
  const [board, setBoard] = useState<Board>(makeEmptyBoard());
  const [placements, setPlacements] = useState<ShipPlacement[]>([]);
  const [selectedShip, setSelectedShip] = useState<number>(0); // index into SHIPS
  const [vertical, setVertical] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<[number, number] | null>(null);

  // R key toggles orientation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') setVertical(v => !v);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const placedIds = placements.map(p => p.shipIndex);
  const currentShip = SHIPS[selectedShip];
  const alreadyPlaced = placedIds.includes(selectedShip);

  const handleCellClick = useCallback(
    (x: number, y: number) => {
      if (disabled || alreadyPlaced) return;
      const { length } = currentShip;
      if (!canPlace(board, selectedShip, length, x, y, vertical)) return;

      const nextBoard = placeOnBoard(board, selectedShip, length, x, y, vertical);
      const nextPlacements: ShipPlacement[] = [
        ...placements,
        { shipIndex: selectedShip, x, y, length, isVertical: vertical },
      ];

      setBoard(nextBoard);
      setPlacements(nextPlacements);
      onPlacementsChange(nextPlacements);

      // Auto-advance to next unplaced ship
      const nextIdx = SHIPS.findIndex(
        (_, i) => i !== selectedShip && !nextPlacements.map(p => p.shipIndex).includes(i)
      );
      if (nextIdx !== -1) setSelectedShip(nextIdx);
    },
    [board, currentShip, disabled, alreadyPlaced, placements, selectedShip, vertical, onPlacementsChange]
  );

  const handleRemoveShip = useCallback(
    (shipIndex: number) => {
      const nextBoard = removeFromBoard(board, shipIndex);
      const nextPlacements = placements.filter(p => p.shipIndex !== shipIndex);
      setBoard(nextBoard);
      setPlacements(nextPlacements);
      onPlacementsChange(nextPlacements);
      setSelectedShip(shipIndex);
    },
    [board, placements, onPlacementsChange]
  );

  const handleReset = () => {
    setBoard(makeEmptyBoard());
    setPlacements([]);
    onPlacementsChange([]);
    setSelectedShip(0);
  };

  // Compute preview cells
  const previewCells = new Set<string>();
  let previewValid = false;
  if (hoveredCell && !alreadyPlaced) {
    const [hx, hy] = hoveredCell;
    previewValid = canPlace(board, selectedShip, currentShip.length, hx, hy, vertical);
    for (let step = 0; step < currentShip.length; step++) {
      const cx = vertical ? hx + step : hx;
      const cy = vertical ? hy : hy + step;
      if (cx < SIZE && cy < SIZE) previewCells.add(`${cx},${cy}`);
    }
  }

  return (
    <div className="placement-board">
      {/* Ship selector */}
      <div className="ship-selector">
        {SHIPS.map((ship, idx) => {
          const placed = placedIds.includes(idx);
          return (
            <button
              key={idx}
              className={`ship-btn ${
                idx === selectedShip ? 'ship-btn--active' : ''
              } ${placed ? 'ship-btn--placed' : ''}`}
              onClick={() => { if (!placed) setSelectedShip(idx); else handleRemoveShip(idx); }}
              title={placed ? 'Click to remove' : `Select ${ship.name}`}
            >
              <span className="ship-btn__emoji">{ship.emoji}</span>
              <span className="ship-btn__name">{ship.name}</span>
              <span className="ship-btn__cells">
                {Array.from({ length: ship.length }, (_, i) => (
                  <span key={i} className="ship-cell-dot" />
                ))}
              </span>
              {placed && <span className="ship-btn__check">✓</span>}
            </button>
          );
        })}
      </div>

      {/* Orientation toggle */}
      <div className="placement-controls">
        <button
          className={`orient-btn ${vertical ? 'orient-btn--v' : 'orient-btn--h'}`}
          onClick={() => setVertical(v => !v)}
        >
          {vertical ? '↕ Vertical (R)' : '↔ Orizontal (R)'}
        </button>
        <button className="reset-btn" onClick={handleReset}>
          ↺ Reset
        </button>
      </div>

      {/* Grid */}
      <div className="pb-grid">
        {/* Column headers */}
        <div className="pb-grid__corner" />
        {COLS.map(c => <div key={c} className="pb-grid__col-header">{c}</div>)}

        {Array.from({ length: SIZE }, (_, row) => (
          <React.Fragment key={row}>
            <div className="pb-grid__row-header">{row + 1}</div>
            {Array.from({ length: SIZE }, (_, col) => {
              const shipId = board[row][col];
              const isPreview = previewCells.has(`${row},${col}`);
              let cls = 'pb-cell';
              if (shipId !== null)  cls += ' pb-cell--ship';
              if (isPreview)        cls += previewValid ? ' pb-cell--preview-ok' : ' pb-cell--preview-bad';
              return (
                <div
                  key={col}
                  className={cls}
                  onClick={() => handleCellClick(row, col)}
                  onMouseEnter={() => setHoveredCell([row, col])}
                  onMouseLeave={() => setHoveredCell(null)}
                  onContextMenu={e => { e.preventDefault(); setVertical(v => !v); }}
                  role="button"
                  aria-label={`Cell ${COLS[col]}${row + 1}`}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
