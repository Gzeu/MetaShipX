import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { battleshipService } from '../services/battleship.service';
import { GameBoard } from '../components/GameBoard/GameBoard';
import './SpectatorPage.css';

type GameStatus = 0 | 1 | 2 | 3;

const STATUS_LABELS = ['Waiting', 'Ships Placed', 'In Progress', 'Finished'] as const;

interface SpectatorState {
  player1: string;
  player2: string;
  status: GameStatus;
  winner: string;
  board1: number[][];
  board2: number[][];
  currentTurn: string;
}

export const SpectatorPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [state, setState] = useState<SpectatorState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollActive, setPollActive] = useState(true);

  const fetchState = useCallback(async () => {
    if (!gameId) return;
    try {
      const raw = await battleshipService.getGameState(parseInt(gameId, 10));
      setState({
        player1: raw.player1 ?? '',
        player2: raw.player2 ?? '',
        status: (raw.status ?? 0) as GameStatus,
        winner: raw.winner ?? '',
        board1: raw.board1 ?? Array(10).fill(Array(10).fill(0)),
        board2: raw.board2 ?? Array(10).fill(Array(10).fill(0)),
        currentTurn: raw.currentTurn ?? '',
      });
      if ((raw.status ?? 0) === 3) setPollActive(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load game state');
      setPollActive(false);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  useEffect(() => {
    if (!pollActive) return;
    const id = setInterval(fetchState, 5000);
    return () => clearInterval(id);
  }, [pollActive, fetchState]);

  const shortAddr = (addr: string) =>
    addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '—';

  if (loading) return <div className="spectator-loading">Loading game #{gameId}…</div>;
  if (error) return <div className="spectator-error">⚠️ {error}</div>;
  if (!state) return null;

  const statusLabel = STATUS_LABELS[state.status] ?? 'Unknown';

  return (
    <div className="spectator-page">
      <h1 className="spec-title">👁️ Spectating — Game #{gameId}</h1>

      <div className="spec-meta">
        <span className={`spec-status status-${state.status}`}>{statusLabel}</span>
        <span className="spec-players">
          {shortAddr(state.player1)} <em>vs</em> {shortAddr(state.player2)}
        </span>
        {state.status === 2 && state.currentTurn && (
          <span className="spec-turn">Turn: {shortAddr(state.currentTurn)}</span>
        )}
      </div>

      {state.status === 3 && state.winner && (
        <div className="spec-winner-banner">
          🏆 Winner: <strong>{shortAddr(state.winner)}</strong>
        </div>
      )}

      <div className="spec-boards">
        <div className="spec-board-wrap">
          <h3>{shortAddr(state.player1)}</h3>
          <GameBoard
            board={state.board1}
            isMyBoard
            onCellClick={() => {}}
            disabled
          />
        </div>
        <div className="spec-board-wrap">
          <h3>{shortAddr(state.player2)}</h3>
          <GameBoard
            board={state.board2}
            isMyBoard={false}
            onCellClick={() => {}}
            disabled
          />
        </div>
      </div>

      {pollActive && (
        <p className="spec-poll-notice">🔄 Auto-refreshing every 5s…</p>
      )}
    </div>
  );
};

export default SpectatorPage;
