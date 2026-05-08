import React, { useCallback } from 'react';
import './GameBoard.css';

export type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk';

interface Animation {
  row: number;
  col: number;
  type: 'hit' | 'miss';
}

interface GameBoardProps {
  cells: CellState[];
  interactive?: boolean;
  onCellClick: (row: number, col: number) => void;
  animations?: Animation[];
  label?: string;
}

const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export function GameBoard({ cells, interactive = false, onCellClick, animations = [], label }: GameBoardProps) {
  const getCellClass = useCallback((index: number, state: CellState) => {
    const row = Math.floor(index / 10);
    const col = index % 10;
    const anim = animations.find(a => a.row === row && a.col === col);
    const classes = ['gb-cell', `gb-cell--${state}`];
    if (interactive && state === 'empty') classes.push('gb-cell--clickable');
    if (anim) classes.push(`gb-cell--anim-${anim.type}`);
    return classes.join(' ');
  }, [interactive, animations]);

  return (
    <div className="gb-wrapper" aria-label={`${label ?? ''} game board`}>
      {/* Column headers */}
      <div className="gb-header-row">
        <div className="gb-corner" />
        {COLS.map(c => <div key={c} className="gb-col-label">{c}</div>)}
      </div>
      <div className="gb-grid-row">
        {/* Row labels */}
        <div className="gb-row-labels">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="gb-row-label">{i + 1}</div>
          ))}
        </div>
        {/* Grid */}
        <div className="gb-grid">
          {cells.map((state, idx) => {
            const row = Math.floor(idx / 10);
            const col = idx % 10;
            return (
              <button
                key={idx}
                className={getCellClass(idx, state)}
                onClick={() => interactive && state === 'empty' ? onCellClick(row, col) : undefined}
                disabled={!interactive || state !== 'empty'}
                aria-label={`${COLS[col]}${row + 1} ${state}`}
              >
                {state === 'hit'  && <span className="gb-icon gb-hit">💥</span>}
                {state === 'miss' && <span className="gb-icon gb-miss">○</span>}
                {state === 'sunk' && <span className="gb-icon gb-sunk">☠</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
