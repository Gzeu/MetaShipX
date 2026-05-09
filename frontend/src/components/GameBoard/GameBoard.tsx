import React, { useCallback, useRef, useState } from 'react';
import './GameBoard.css';
import { BattleFx, CellFx } from '../BattleFx/BattleFx';
import { useAttackSound } from '../../hooks/useAttackSound';
import { useGameAnimations } from '../../hooks/useGameAnimations';

export type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk';

export interface AttackResult {
  row: number;
  col: number;
  result: 'hit' | 'miss' | 'sunk';
  isMyAttack: boolean;
  gameOver?: boolean;
  iWon?: boolean;
}

interface GameBoardProps {
  cells: CellState[];
  interactive?: boolean;
  onCellClick: (row: number, col: number) => void;
  lastAttack?: AttackResult | null;
  label?: string;
  myAddress?: string;
}

const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export function GameBoard({
  cells,
  interactive = false,
  onCellClick,
  lastAttack,
  label,
}: GameBoardProps) {
  // ── Sound ──────────────────────────────────────────────────────────────────
  const { MuteButton } = useAttackSound(lastAttack ?? null);

  // ── Particle / cell animations ─────────────────────────────────────────────
  const { animateCell } = useGameAnimations();
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Track which attack we've already animated to avoid re-triggering on re-render
  const lastAnimatedAttack = useRef<string | null>(null);

  // Trigger particle + cell animation whenever lastAttack changes
  const attackKey = lastAttack
    ? `${lastAttack.row}-${lastAttack.col}-${lastAttack.result}`
    : null;

  if (attackKey && attackKey !== lastAnimatedAttack.current && lastAttack) {
    lastAnimatedAttack.current = attackKey;
    const idx = lastAttack.row * 10 + lastAttack.col;
    const el = cellRefs.current[idx];
    if (el) {
      // Small rAF delay so the DOM has updated cell state first
      requestAnimationFrame(() => animateCell(el, lastAttack.result));
    }
  }

  // ── Overlay FX state ────────────────────────────────────────────────────────
  const [fxKey, setFxKey] = useState(0);
  const showFx =
    lastAttack !== null &&
    lastAttack !== undefined &&
    lastAttack.isMyAttack;

  const fxResult = lastAttack?.result ?? 'miss';

  const getCellClass = useCallback(
    (index: number, state: CellState) => {
      const row = Math.floor(index / 10);
      const col = index % 10;
      const isLast =
        lastAttack && lastAttack.row === row && lastAttack.col === col;
      const classes = ['gb-cell', `gb-cell--${state}`];
      if (interactive && state === 'empty') classes.push('gb-cell--clickable');
      if (isLast) classes.push(`gb-cell--anim-${lastAttack!.result}`);
      return classes.join(' ');
    },
    [interactive, lastAttack]
  );

  const handleClick = useCallback(
    (row: number, col: number) => {
      if (interactive) {
        setFxKey((k) => k + 1);
        onCellClick(row, col);
      }
    },
    [interactive, onCellClick]
  );

  return (
    <div className="gb-wrapper" aria-label={`${label ?? ''} game board`}>
      {/* Mute toggle */}
      <div className="gb-toolbar">
        {label && <span className="gb-label">{label}</span>}
        <MuteButton />
      </div>

      {/* Full-board FX overlay (my attacks only) */}
      {showFx && <BattleFx key={fxKey} result={fxResult} />}

      {/* Column headers */}
      <div className="gb-header-row">
        <div className="gb-corner" />
        {COLS.map((c) => (
          <div key={c} className="gb-col-label">
            {c}
          </div>
        ))}
      </div>

      <div className="gb-grid-row">
        {/* Row labels */}
        <div className="gb-row-labels">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="gb-row-label">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="gb-grid">
          {cells.map((state, idx) => {
            const row = Math.floor(idx / 10);
            const col = idx % 10;
            const isLast =
              lastAttack && lastAttack.row === row && lastAttack.col === col;
            return (
              <button
                key={idx}
                ref={(el) => { cellRefs.current[idx] = el; }}
                className={getCellClass(idx, state)}
                onClick={() => handleClick(row, col)}
                disabled={!interactive || state !== 'empty'}
                aria-label={`${COLS[col]}${row + 1} ${state}`}
              >
                {state === 'hit'  && <span className="gb-icon gb-hit">💥</span>}
                {state === 'miss' && <span className="gb-icon gb-miss">○</span>}
                {state === 'sunk' && <span className="gb-icon gb-sunk">☠</span>}
                {/* Per-cell dot animation for incoming enemy attacks */}
                {isLast && !lastAttack!.isMyAttack && (
                  <CellFx result={lastAttack!.result} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
