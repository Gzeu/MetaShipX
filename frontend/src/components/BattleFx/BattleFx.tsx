import { useEffect, useRef } from 'react';
import './BattleFx.css';

export type FxResult = 'Hit' | 'Miss' | 'Sunk' | 'GameOver' | null;

interface BattleFxProps {
  result: FxResult;
  x?: number;
  y?: number;
  onDone?: () => void;
}

export function BattleFx({ result, onDone }: BattleFxProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!result || !ref.current) return;
    const el = ref.current;
    el.classList.remove('battle-fx--active');
    void el.offsetWidth; // force reflow to restart animation
    el.classList.add('battle-fx--active');
    const timer = setTimeout(() => {
      el.classList.remove('battle-fx--active');
      onDone?.();
    }, result === 'GameOver' ? 2400 : 900);
    return () => clearTimeout(timer);
  }, [result, onDone]);

  if (!result) return null;

  return (
    <div ref={ref} className={`battle-fx battle-fx--${result.toLowerCase()}`}>
      <div className="battle-fx__ring" />
      <div className="battle-fx__ring battle-fx__ring--delay" />
      <div className="battle-fx__icon">
        {result === 'Hit' && '💥'}
        {result === 'Miss' && '🌊'}
        {result === 'Sunk' && '🔥'}
        {result === 'GameOver' && '🏆'}
      </div>
      <div className="battle-fx__label">{result === 'GameOver' ? 'GAME OVER' : result.toUpperCase()}</div>
    </div>
  );
}

/**
 * Inline cell hit/miss dot overlay — placed directly on a board cell
 */
interface CellFxProps {
  result: 'hit' | 'miss' | 'sunk' | null;
}
export function CellFx({ result }: CellFxProps) {
  if (!result) return null;
  return <span className={`cell-fx cell-fx--${result}`} aria-hidden="true" />;
}
