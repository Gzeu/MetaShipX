import React, { useState } from 'react';
import './GameBoard.css';

export type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk';

export interface Cell {
  row: number;
  col: number;
  state: CellState;
}

interface Props {
  cells: Cell[][];
  interactive: boolean;
  onCellClick: (row: number, col: number) => void;
  showShips?: boolean;
}

const COL_LABELS = ['A','B','C','D','E','F','G','H','I','J'];

export const GameBoard: React.FC<Props> = ({ cells, interactive, onCellClick, showShips = true }) => {
  const [hovered, setHovered] = useState<string | null>(null);

  // Build a 10x10 grid if cells is flat or empty
  const grid: Cell[][] = Array.from({ length: 10 }, (_, r) =>
    Array.from({ length: 10 }, (_, c) => {
      const found = cells.flat?.().find(cell => cell.row === r && cell.col === c);
      return found ?? { row: r, col: c, state: 'empty' as CellState };
    })
  );

  function cellClass(cell: Cell): string {
    const base = 'gb__cell';
    const interactiveClass = interactive && cell.state === 'empty' ? ' gb__cell--interactive' : '';
    const hoverClass = interactive && hovered === `${cell.row}-${cell.col}` ? ' gb__cell--hovered' : '';
    switch (cell.state) {
      case 'ship': return base + (showShips ? ' gb__cell--ship' : '') + hoverClass;
      case 'hit':  return base + ' gb__cell--hit' + ' gb__cell--animated';
      case 'miss': return base + ' gb__cell--miss' + ' gb__cell--animated';
      case 'sunk': return base + ' gb__cell--sunk' + ' gb__cell--animated';
      default:     return base + interactiveClass + hoverClass;
    }
  }

  function cellContent(cell: Cell): string {
    switch (cell.state) {
      case 'hit':  return '💥';
      case 'miss': return '〇';
      case 'sunk': return '☠️';
      default:     return '';
    }
  }

  return (
    <div className="gb">
      {/* Column headers */}
      <div className="gb__grid">
        <div className="gb__corner" />
        {COL_LABELS.map(l => (
          <div key={l} className="gb__col-label">{l}</div>
        ))}

        {grid.map((row, ri) => (
          <React.Fragment key={ri}>
            <div className="gb__row-label">{ri + 1}</div>
            {row.map(cell => (
              <div
                key={`${cell.row}-${cell.col}`}
                className={cellClass(cell)}
                onMouseEnter={() => interactive && setHovered(`${cell.row}-${cell.col}`)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => interactive && cell.state === 'empty' && onCellClick(cell.row, cell.col)}
              >
                <span className="gb__cell-content">{cellContent(cell)}</span>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default GameBoard;
