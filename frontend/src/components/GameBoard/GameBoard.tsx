import React, { useCallback } from 'react';
import type { CellState } from '../../types/game.types';
import './GameBoard.css';

interface GameBoardProps {
  /** 10×10 flat grid of cell states — row-major order */
  cells: CellState[][];
  /** Whether this board accepts click-to-attack */
  isInteractive?: boolean;
  /** Hide ships (opponent board) */
  showShips?: boolean;
  /** Disable all clicks (e.g. not your turn, waiting) */
  disabled?: boolean;
  /** Called with (row, col) on valid attack click */
  onCellClick?: (row: number, col: number) => void;
  /** Optional label rendered above the board */
  label?: string;
}

const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const ROWS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const GameBoard: React.FC<GameBoardProps> = ({
  cells,
  isInteractive = false,
  showShips = true,
  disabled = false,
  onCellClick,
  label,
}) => {
  // Ensure board is always 10×10 even if data is missing
  const board: CellState[][] = Array.from({ length: 10 }, (_, r) =>
    Array.from({ length: 10 }, (_, c) => cells?.[r]?.[c] ?? 'empty')
  );

  const handleClick = useCallback(
    (row: number, col: number) => {
      if (!isInteractive || disabled) return;
      const cell = board[row][col];
      if (cell === 'hit' || cell === 'miss' || cell === 'sunk') return;
      onCellClick?.(row, col);
    },
    [board, isInteractive, disabled, onCellClick]
  );

  return (
    <div className="gameboard-wrapper">
      {label && <p className="gameboard-label">{label}</p>}
      <div className="gameboard">
        {/* Column headers */}
        <div className="gameboard-col-headers">
          <div className="gameboard-corner" />
          {COLS.map((c) => (
            <div key={c} className="gameboard-header">{c}</div>
          ))}
        </div>

        {/* Rows */}
        {board.map((row, rowIdx) => (
          <div key={rowIdx} className="gameboard-row">
            <div className="gameboard-header gameboard-row-header">{ROWS[rowIdx]}</div>
            {row.map((cell, colIdx) => {
              const displayCell = (!showShips && cell === 'ship') ? 'empty' : cell;
              const isTargetable = isInteractive && !disabled &&
                displayCell !== 'hit' && displayCell !== 'miss' && displayCell !== 'sunk';
              return (
                <button
                  key={colIdx}
                  className={[
                    'gameboard-cell',
                    `gameboard-cell--${displayCell}`,
                    isTargetable ? 'gameboard-cell--targetable' : '',
                  ].join(' ').trim()}
                  onClick={() => handleClick(rowIdx, colIdx)}
                  disabled={!isInteractive || disabled ||
                    cell === 'hit' || cell === 'miss' || cell === 'sunk'}
                  aria-label={`${COLS[colIdx]}${ROWS[rowIdx]}: ${displayCell}`}
                >
                  {displayCell === 'hit'  && <span aria-hidden>💥</span>}
                  {displayCell === 'miss' && <span aria-hidden>•</span>}
                  {displayCell === 'sunk' && <span aria-hidden>💀</span>}
                  {displayCell === 'ship' && showShips && <span aria-hidden>🚢</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GameBoard;
