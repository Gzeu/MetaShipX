import { useEffect, useRef } from 'react';
import { SpectatorAttackEvent } from '../../types/spectator';
import './SpectatorBoard.css';

const BOARD_SIZE = 10;
const COL_LABELS = ['A','B','C','D','E','F','G','H','I','J'];

interface SpectatorBoardProps {
  events: SpectatorAttackEvent[];
  label: string;
  attacker?: string; // address prefix to highlight which board is being attacked
}

type CellMark = 'hit' | 'miss' | 'sunk' | null;

export function SpectatorBoard({ events, label }: SpectatorBoardProps) {
  const grid: CellMark[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(null)
  );

  events.forEach(({ x, y, result }) => {
    if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
      if (result === 'Hit' || result === 'GameOver') grid[x][y] = 'hit';
      else if (result === 'Miss') grid[x][y] = 'miss';
      else if (result === 'Sunk') grid[x][y] = 'sunk';
    }
  });

  return (
    <div className="spectator-board">
      <div className="spectator-board__label">{label}</div>
      <div className="spectator-board__grid">
        <div className="spectator-board__corner" />
        {COL_LABELS.map((c) => (
          <div key={c} className="spectator-board__header">{c}</div>
        ))}
        {grid.map((row, ri) => (
          <>
            <div key={`row-${ri}`} className="spectator-board__row-num">{ri + 1}</div>
            {row.map((mark, ci) => (
              <div
                key={`${ri}-${ci}`}
                className={`spectator-board__cell${mark ? ` spectator-board__cell--${mark}` : ''}`}
              />
            ))}
          </>
        ))}
      </div>
    </div>
  );
}
