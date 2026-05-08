/**
 * PlacementGrid — interactive ship placement on a 10x10 board.
 * Ships are placed horizontally by default; click same starting cell to rotate.
 * No drag-and-drop dependencies: pure click-based.
 */
import React, { useState, useCallback } from 'react';
import './PlacementGrid.css';

interface ShipDef { type: string; size: number; }

interface PlacementGridProps {
  ships: ShipDef[];
  onConfirm: (positions: number[][]) => Promise<void>;
  loading?: boolean;
}

type CellTag = 'empty' | 'placed' | 'preview' | 'invalid';

interface PlacedShip {
  type: string;
  cells: [number, number][];
  horizontal: boolean;
}

const COLS = ['A','B','C','D','E','F','G','H','I','J'];

function getCells(row: number, col: number, size: number, horizontal: boolean): [number,number][] {
  const cells: [number,number][] = [];
  for (let i = 0; i < size; i++) {
    cells.push(horizontal ? [row, col + i] : [row + i, col]);
  }
  return cells;
}

function isValid(cells: [number,number][], occupied: Set<string>): boolean {
  return cells.every(([r, c]) =>
    r >= 0 && r < 10 && c >= 0 && c < 10 && !occupied.has(`${r},${c}`)
  );
}

export function PlacementGrid({ ships, onConfirm, loading = false }: PlacementGridProps) {
  const [placed, setPlaced] = useState<PlacedShip[]>([]);
  const [shipIdx, setShipIdx] = useState(0);
  const [horizontal, setHorizontal] = useState(true);
  const [hover, setHover] = useState<[number,number] | null>(null);

  const currentShip = ships[shipIdx] ?? null;

  const occupied = new Set<string>(
    placed.flatMap(s => s.cells.map(([r,c]) => `${r},${c}`))
  );

  const previewCells = hover && currentShip
    ? getCells(hover[0], hover[1], currentShip.size, horizontal)
    : [];
  const previewValid = previewCells.length > 0 && isValid(previewCells, occupied);

  const getTag = useCallback((r: number, c: number): CellTag => {
    const key = `${r},${c}`;
    if (occupied.has(key)) return 'placed';
    if (previewCells.some(([pr,pc]) => pr===r && pc===c)) {
      return previewValid ? 'preview' : 'invalid';
    }
    return 'empty';
  }, [occupied, previewCells, previewValid]);

  const handleClick = useCallback((r: number, c: number) => {
    if (!currentShip) return;
    const cells = getCells(r, c, currentShip.size, horizontal);
    if (!isValid(cells, occupied)) return;
    const next: PlacedShip[] = [...placed, { type: currentShip.type, cells, horizontal }];
    setPlaced(next);
    setShipIdx(i => i + 1);
  }, [currentShip, horizontal, occupied, placed]);

  const handleUndo = () => {
    if (placed.length === 0) return;
    setPlaced(p => p.slice(0, -1));
    setShipIdx(i => Math.max(0, i - 1));
  };

  const handleConfirm = async () => {
    // Flatten to array of [row, col] per cell
    const positions = placed.flatMap(s => s.cells);
    await onConfirm(positions);
  };

  const allPlaced = shipIdx >= ships.length;

  return (
    <div className="pg-root">
      {/* Ship queue */}
      <div className="pg-queue">
        {ships.map((s, i) => (
          <div
            key={s.type}
            className={`pg-ship-chip ${
              i < shipIdx ? 'pg-chip--done'
              : i === shipIdx ? 'pg-chip--active'
              : 'pg-chip--pending'
            }`}
          >
            <span className="pg-chip-name">{s.type}</span>
            <span className="pg-chip-size">{'▪'.repeat(s.size)}</span>
          </div>
        ))}
      </div>

      {/* Orientation toggle */}
      <div className="pg-controls">
        <button
          className={`pg-orient-btn ${horizontal ? 'active' : ''}`}
          onClick={() => setHorizontal(true)}
        >
          ↔ Horizontal
        </button>
        <button
          className={`pg-orient-btn ${!horizontal ? 'active' : ''}`}
          onClick={() => setHorizontal(false)}
        >
          ↕ Vertical
        </button>
        <button className="pg-undo-btn" onClick={handleUndo} disabled={placed.length === 0}>
          ↩ Undo
        </button>
      </div>

      {/* Grid */}
      <div className="pg-grid-wrap">
        <div className="pg-header-row">
          <div className="pg-corner" />
          {COLS.map(c => <div key={c} className="pg-col-label">{c}</div>)}
        </div>
        <div className="pg-body">
          <div className="pg-row-labels">
            {Array.from({length:10}, (_,i) => (
              <div key={i} className="pg-row-label">{i+1}</div>
            ))}
          </div>
          <div className="pg-grid">
            {Array.from({length:100}, (_,idx) => {
              const r = Math.floor(idx/10), c = idx%10;
              const tag = getTag(r,c);
              return (
                <button
                  key={idx}
                  className={`pg-cell pg-cell--${tag}`}
                  onMouseEnter={() => setHover([r,c])}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => handleClick(r,c)}
                  disabled={allPlaced || tag === 'placed'}
                  aria-label={`${COLS[c]}${r+1}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Confirm */}
      {allPlaced && (
        <div className="pg-confirm-row">
          <button
            className="pg-confirm-btn"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Confirming…' : '✅ Confirm Placement'}
          </button>
        </div>
      )}
    </div>
  );
}
