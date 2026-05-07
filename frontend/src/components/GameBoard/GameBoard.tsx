import React, { useCallback } from 'react';
import './GameBoard.css';

export type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk';

interface GameBoardProps {
  /** 10x10 grid of cell states */
  board: CellState[][];
  /** Whether this board is interactive (opponent's board during attack phase) */
  interactive?: boolean;
  /** Called when user clicks a cell to attack */
  onCellClick?: (row: number, col: number) => void;
  /** Disable all clicks (e.g. not your turn) */
  disabled?: boolean;
  /** Label above the board */
  label?: string;
}

const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const ROWS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const GameBoard: React.FC<GameBoardProps> = ({
  board,
  interactive = false,
  onCellClick,
  disabled = false,
  label,
}) => {
  const handleClick = useCallback(
    (row: number, col: number) => {
      if (!interactive || disabled) return;
      const cell = board[row][col];
      // Can't attack already-attacked cells
      if (cell === 'hit' || cell === 'miss' || cell === 'sunk') return;
      onCellClick?.(row, col);
    },
    [board, interactive, disabled, onCellClick]
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

        {/* Grid rows */}
        {board.map((row, rowIdx) => (
          <div key={rowIdx} className="gameboard-row">
            <div className="gameboard-header gameboard-row-header">{ROWS[rowIdx]}</div>
            {row.map((cell, colIdx) => (
              <button
                key={colIdx}
                className={`gameboard-cell gameboard-cell--${cell}${
                  interactive && cell === 'empty' && !disabled
                    ? ' gameboard-cell--targetable'
                    : ''
                }`}
                onClick={() => handleClick(rowIdx, colIdx)}
                disabled={!interactive || disabled || cell === 'hit' || cell === 'miss' || cell === 'sunk'}
                aria-label={`${COLS[colIdx]}${ROWS[rowIdx]}: ${cell}`}
              >
                {cell === 'hit' && <span aria-hidden>💥</span>}
                {cell === 'miss' && <span aria-hidden>•</span>}
                {cell === 'sunk' && <span aria-hidden>💀</span>}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GameBoard;
