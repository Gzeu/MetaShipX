import React from 'react';
import type { GameStateView } from '../../types/game.types';
import './game-status.css';

interface Props {
  gameState: GameStateView;
  address: string;
  isMyTurn: boolean;
  phase: string;
}

const SHIP_NAMES = ['Carrier', 'Battleship', 'Cruiser', 'Submarine', 'Destroyer'];
const SHIP_LENGTHS = [5, 4, 3, 3, 2];
const SHIP_EMOJI  = ['🛳', '⚔️', '🚢', '🤿', '⚡'];

export const GameStatus: React.FC<Props> = ({ gameState, address, isMyTurn, phase }) => {
  const myShipsAlive  = gameState.myShipsAlive  ?? SHIP_LENGTHS.length;
  const oppShipsAlive = gameState.oppShipsAlive ?? SHIP_LENGTHS.length;

  return (
    <div className="game-status">
      {/* Turn indicator */}
      <div className={`gs-turn ${isMyTurn ? 'gs-turn--mine' : 'gs-turn--theirs'}`}>
        {phase === 'Finished' ? '🏁 Joc terminat' :
         isMyTurn ? '⚔️ Rândul tău' : '🕐 Rândul lor'}
      </div>

      {/* Score */}
      <div className="gs-score">
        <div className="gs-score__block">
          <span className="gs-score__value">{myShipsAlive}</span>
          <span className="gs-score__label">Nave tale vii</span>
        </div>
        <div className="gs-score__divider">VS</div>
        <div className="gs-score__block">
          <span className="gs-score__value">{oppShipsAlive}</span>
          <span className="gs-score__label">Nave adv. vii</span>
        </div>
      </div>

      {/* Ship grid */}
      <div className="gs-ships">
        <div className="gs-ships__section">
          <h4>Flotă Ta</h4>
          {SHIP_NAMES.map((name, i) => (
            <div key={i} className="gs-ship-row">
              <span>{SHIP_EMOJI[i]}</span>
              <span className="gs-ship-name">{name}</span>
              <div className="gs-ship-dots">
                {Array.from({ length: SHIP_LENGTHS[i] }, (_, j) => (
                  <span key={j} className="gs-dot gs-dot--alive" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bet */}
      {gameState.bet && gameState.bet !== '0' && (
        <div className="gs-bet">
          💰 {(Number(gameState.bet) / 1e18).toFixed(3)} EGLD
          <span className="gs-bet__label">Pariu total</span>
        </div>
      )}
    </div>
  );
};
