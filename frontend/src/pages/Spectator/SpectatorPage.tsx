import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GameBoard } from '../../components/GameBoard/GameBoard';
import { getGameState } from '../../services/battleship.service';
import type { CellState } from '../../components/GameBoard/GameBoard';
import './SpectatorPage.css';

interface LiveGame {
  gameId: string;
  player1: string;
  player2: string;
  currentTurn: string;
  player1Board: CellState[];
  player2Board: CellState[];
  status: 'battle' | 'finished';
  winner?: string;
  moveCount: number;
  wager: string;
}

function shortAddr(addr: string) {
  if (!addr) return '?';
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

export default function SpectatorPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<LiveGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState<string[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const fetchGame = async () => {
    try {
      const state = await getGameState(gameId ?? '');
      if (!state) return;
      const prev = game;
      // Detect new moves by comparing move count
      if (prev && state.moveCount > prev.moveCount) {
        const attacker = shortAddr(prev.currentTurn);
        setLog(l => [
          `⚔️ ${attacker} attacked — move #${state.moveCount}`,
          ...l.slice(0, 19),
        ]);
      }
      setGame(state as LiveGame);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGame();
    intervalRef.current = setInterval(fetchGame, 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [gameId]);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0;
  }, [log]);

  if (loading) return (
    <div className="spec-loading">
      <div className="spec-spinner" />
      <p>Connecting to game…</p>
    </div>
  );

  if (!game) return (
    <div className="spec-error">
      <p>Game not found or not active.</p>
      <button onClick={() => navigate('/leaderboard')}>← Back</button>
    </div>
  );

  const p1IsActive = game.currentTurn === game.player1;

  return (
    <div className="spec-page">
      {/* Header */}
      <div className="spec-header">
        <button className="spec-back" onClick={() => navigate(-1)}>← Back</button>
        <div className="spec-title">
          👁 Spectating Game #{(gameId ?? '').slice(-6)}
        </div>
        <div className="spec-wager">{game.wager} EGLD at stake</div>
      </div>

      {/* Live badge */}
      <div className="spec-live-bar">
        {game.status === 'battle' ? (
          <><span className="spec-live-dot" /> LIVE · Move #{game.moveCount}</>
        ) : (
          <span className="spec-finished">🏁 Finished — Winner: {shortAddr(game.winner ?? '')}</span>
        )}
      </div>

      {/* Boards */}
      <div className="spec-boards">
        <div className="spec-board-wrap">
          <div className={`spec-player-label ${p1IsActive ? 'spec-active-turn' : ''}`}>
            {p1IsActive && <span className="spec-turn-arrow">▶</span>}
            {shortAddr(game.player1)}
            {game.winner === game.player1 && ' 🏆'}
          </div>
          <GameBoard
            cells={game.player1Board}
            interactive={false}
            onCellClick={() => {}}
            label="player1"
          />
        </div>

        <div className="spec-vs">
          <div className="spec-vs-text">VS</div>
          <div className="spec-move-count">{game.moveCount} moves</div>
        </div>

        <div className="spec-board-wrap">
          <div className={`spec-player-label ${!p1IsActive ? 'spec-active-turn' : ''}`}>
            {!p1IsActive && <span className="spec-turn-arrow">▶</span>}
            {shortAddr(game.player2)}
            {game.winner === game.player2 && ' 🏆'}
          </div>
          <GameBoard
            cells={game.player2Board}
            interactive={false}
            onCellClick={() => {}}
            label="player2"
          />
        </div>
      </div>

      {/* Move log */}
      <div className="spec-log-wrap">
        <div className="spec-log-title">📋 Move Log</div>
        <div className="spec-log" ref={logRef}>
          {log.length === 0 ? (
            <p className="spec-log-empty">Waiting for moves…</p>
          ) : (
            log.map((entry, i) => (
              <div key={i} className={`spec-log-entry ${i === 0 ? 'spec-log-new' : ''}`}>
                {entry}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
