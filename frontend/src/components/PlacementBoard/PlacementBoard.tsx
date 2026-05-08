import React, { useState, useCallback } from 'react';
import './PlacementBoard.css';

// ── Ship definitions ───────────────────────────────────────────────────────
export interface ShipDef {
  id: string;
  name: string;
  size: number;
  emoji: string;
  color: string;
}

const SHIPS: ShipDef[] = [
  { id: 'carrier',    name: 'Carrier',    size: 5, emoji: '✈️', color: '#6366f1' },
  { id: 'battleship', name: 'Battleship', size: 4, emoji: '🛳️', color: '#8b5cf6' },
  { id: 'cruiser',    name: 'Cruiser',    size: 3, emoji: '⚓',  color: '#3b82f6' },
  { id: 'submarine',  name: 'Submarine',  size: 3, emoji: '🤿',  color: '#06b6d4' },
  { id: 'destroyer',  name: 'Destroyer',  size: 2, emoji: '🚤',  color: '#10b981' },
];

const ROWS = 10;
const COLS = 10;
const COL_LABELS = ['A','B','C','D','E','F','G','H','I','J'];

// ── Types ──────────────────────────────────────────────────────────────────
type Orientation = 'H' | 'V';

interface PlacedShip {
  id: string;
  row: number;
  col: number;
  orientation: Orientation;
  size: number;
}

function shipCells(s: PlacedShip): [number, number][] {
  const cells: [number, number][] = [];
  for (let i = 0; i < s.size; i++) {
    cells.push(s.orientation === 'H' ? [s.row, s.col + i] : [s.row + i, s.col]);
  }
  return cells;
}

function isValid(placed: PlacedShip[], ship: PlacedShip): boolean {
  const cells = shipCells(ship);
  // Out of bounds
  for (const [r, c] of cells) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
  }
  // Overlap check (including adjacent cells)
  for (const existing of placed) {
    if (existing.id === ship.id) continue;
    const existCells = shipCells(existing);
    for (const [r, c] of cells) {
      for (const [er, ec] of existCells) {
        if (Math.abs(r - er) <= 1 && Math.abs(c - ec) <= 1) return false;
      }
    }
  }
  return true;
}

function encodePositions(placed: PlacedShip[]): number[] {
  // Encode as flat array: [row, col, orientation(0=H,1=V), size] per ship
  return placed.flatMap(s => [s.row, s.col, s.orientation === 'H' ? 0 : 1, s.size]);
}

// ── Component ─────────────────────────────────────────────────────────────
interface Props {
  onConfirm: (positions: number[]) => void;
}

export const PlacementBoard: React.FC<Props> = ({ onConfirm }) => {
  const [placed, setPlaced]           = useState<PlacedShip[]>([]);
  const [selected, setSelected]       = useState<string>(SHIPS[0].id);
  const [orientation, setOrientation] = useState<Orientation>('H');
  const [hoverCells, setHoverCells]   = useState<[number,number][]>([]);
  const [hoverValid, setHoverValid]   = useState(true);

  const placedIds = new Set(placed.map(p => p.id));
  const allPlaced = SHIPS.every(s => placedIds.has(s.id));

  // ── Build grid state ────────────────────────────────────────────────────
  const grid: Record<string, { color: string; label: string }> = {};
  for (const ship of placed) {
    const def = SHIPS.find(s => s.id === ship.id)!;
    for (const [r, c] of shipCells(ship)) {
      grid[`${r}-${c}`] = { color: def.color, label: def.emoji };
    }
  }

  // ── Hover preview ────────────────────────────────────────────────────────
  const onCellEnter = useCallback((row: number, col: number) => {
    const def = SHIPS.find(s => s.id === selected);
    if (!def || placedIds.has(selected)) { setHoverCells([]); return; }
    const ship: PlacedShip = { id: selected, row, col, orientation, size: def.size };
    const cells = shipCells(ship);
    setHoverCells(cells);
    setHoverValid(isValid(placed, ship));
  }, [selected, orientation, placed, placedIds]);

  const onCellLeave = useCallback(() => {
    setHoverCells([]);
  }, []);

  // ── Place ship ───────────────────────────────────────────────────────────
  const onCellClick = useCallback((row: number, col: number) => {
    const def = SHIPS.find(s => s.id === selected);
    if (!def) return;
    // If already placed, remove it first (re-place)
    const ship: PlacedShip = { id: selected, row, col, orientation, size: def.size };
    if (!isValid(placed.filter(p => p.id !== selected), ship)) return;
    setPlaced(prev => [
      ...prev.filter(p => p.id !== selected),
      ship,
    ]);
    // Auto-advance to next unplaced ship
    const next = SHIPS.find(s => s.id !== selected && !placedIds.has(s.id));
    if (next) setSelected(next.id);
  }, [selected, orientation, placed, placedIds]);

  // ── Remove ship on click in sidebar ─────────────────────────────────────
  const removeShip = (id: string) => {
    setPlaced(prev => prev.filter(p => p.id !== id));
    setSelected(id);
  };

  // ── Random placement ────────────────────────────────────────────────────
  const randomize = () => {
    const result: PlacedShip[] = [];
    for (const def of SHIPS) {
      let placed2 = false;
      for (let attempts = 0; attempts < 200 && !placed2; attempts++) {
        const ori: Orientation = Math.random() < 0.5 ? 'H' : 'V';
        const row = Math.floor(Math.random() * ROWS);
        const col = Math.floor(Math.random() * COLS);
        const ship: PlacedShip = { id: def.id, row, col, orientation: ori, size: def.size };
        if (isValid(result, ship)) {
          result.push(ship);
          placed2 = true;
        }
      }
    }
    setPlaced(result);
  };

  const hoverSet = new Set(hoverCells.map(([r,c]) => `${r}-${c}`));

  return (
    <div className="pb">
      {/* Ship palette */}
      <div className="pb__palette">
        <div className="pb__palette-title">Your Fleet</div>
        {SHIPS.map(ship => {
          const isPlaced   = placedIds.has(ship.id);
          const isSelected = selected === ship.id && !isPlaced;
          return (
            <div
              key={ship.id}
              className={`pb__ship-item${
                isSelected ? ' pb__ship-item--selected' : ''
              }${isPlaced ? ' pb__ship-item--placed' : ''}`}
              onClick={() => isPlaced ? removeShip(ship.id) : setSelected(ship.id)}
              title={isPlaced ? 'Click to remove' : 'Click to select'}
            >
              <span className="pb__ship-emoji">{ship.emoji}</span>
              <span className="pb__ship-name">{ship.name}</span>
              <span className="pb__ship-size">{ship.size} cells</span>
              {isPlaced && <span className="pb__ship-check">✓</span>}
              <div className="pb__ship-cells">
                {Array.from({ length: ship.size }).map((_, i) => (
                  <div
                    key={i}
                    className="pb__ship-cell"
                    style={{ background: isPlaced ? ship.color : undefined }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div className="pb__grid-wrap">
        <div className="pb__controls">
          <button
            className={`pb__orient-btn${orientation === 'H' ? ' pb__orient-btn--active' : ''}`}
            onClick={() => setOrientation('H')}
          >↔ Horizontal</button>
          <button
            className={`pb__orient-btn${orientation === 'V' ? ' pb__orient-btn--active' : ''}`}
            onClick={() => setOrientation('V')}
          >↕ Vertical</button>
          <button className="pb__random-btn" onClick={randomize}>🎲 Random</button>
        </div>

        <div className="pb__grid">
          {/* Column headers */}
          <div className="pb__grid-corner" />
          {COL_LABELS.map(l => (
            <div key={l} className="pb__grid-col-label">{l}</div>
          ))}

          {Array.from({ length: ROWS }).map((_, row) => (
            <React.Fragment key={row}>
              <div className="pb__grid-row-label">{row + 1}</div>
              {Array.from({ length: COLS }).map((_, col) => {
                const key    = `${row}-${col}`;
                const placed2 = grid[key];
                const isHover = hoverSet.has(key);
                return (
                  <div
                    key={key}
                    className={`pb__cell${
                      isHover
                        ? hoverValid ? ' pb__cell--hover-valid' : ' pb__cell--hover-invalid'
                        : ''
                    }${placed2 ? ' pb__cell--placed' : ''}`}
                    style={placed2 ? { background: placed2.color } : undefined}
                    onMouseEnter={() => onCellEnter(row, col)}
                    onMouseLeave={onCellLeave}
                    onClick={() => onCellClick(row, col)}
                    title={placed2?.label}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>

        <div className="pb__actions">
          <button
            className="pb__confirm-btn"
            disabled={!allPlaced}
            onClick={() => onConfirm(encodePositions(placed))}
          >
            {allPlaced ? '⚔️ Confirm Placement' : `Place all ships (${placed.length}/${SHIPS.length})`}
          </button>
          <button
            className="pb__clear-btn"
            onClick={() => setPlaced([])}
          >🗑 Clear All</button>
        </div>
      </div>
    </div>
  );
};

export default PlacementBoard;
