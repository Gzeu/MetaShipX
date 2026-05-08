import './BattleFx.css';

interface BattleFxProps {
  result?: 'Hit' | 'Miss' | 'Sunk' | 'GameOver' | null;
}

export function BattleFx({ result }: BattleFxProps) {
  if (!result) return null;

  return (
    <div className={`battle-fx battle-fx--${result.toLowerCase()}`}>
      <div className="battle-fx__pulse" />
      <div className="battle-fx__label">{result}</div>
    </div>
  );
}
