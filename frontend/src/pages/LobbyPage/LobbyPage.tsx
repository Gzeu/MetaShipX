import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import * as battleshipService from '../../services/battleship.service';
import { fmtEgld, fmtAddress } from '../../utils/format';
import { egldToWei } from '../../utils/format';
import './LobbyPage.css';

interface OpenGame {
  gameId: string;
  player1: string;
  wager: string;
}

export default function LobbyPage(): React.ReactElement {
  const navigate = useNavigate();
  const { account } = useGetAccountInfo();
  const address = account.address;

  const [openGames, setOpenGames] = useState<OpenGame[]>([]);
  const [wager, setWager] = useState('0.1');
  const [joinId, setJoinId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGames = async () => {
    try {
      const ids = await battleshipService.getPlayerGames(address);
      const games: OpenGame[] = ids.map((id, i) => ({
        gameId: id,
        player1: address,
        wager: egldToWei('0.1'),
      }));
      setOpenGames(games);
    } catch {
      /* non-fatal */
    }
  };

  useEffect(() => { if (address) void loadGames(); }, [address]);

  const handleCreate = async () => {
    if (!address) { setError('Connect wallet first'); return; }
    setLoading(true);
    setError(null);
    try {
      await battleshipService.createGame(address, wager);
      navigate('/game/pending');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (gameId: string, gameWager: string) => {
    if (!address) { setError('Connect wallet first'); return; }
    setLoading(true);
    setError(null);
    try {
      await battleshipService.joinGame(address, gameId, gameWager);
      navigate(`/game/${gameId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to join game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lobby-page">
      <h1 className="lobby-title">Game Lobby</h1>

      {error && <div className="lobby-error">{error}</div>}

      <div className="lobby-grid">
        {/* Create */}
        <section className="lobby-card">
          <h2>Create Game</h2>
          <label className="field-label">
            Wager (EGLD)
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={wager}
              onChange={e => setWager(e.target.value)}
              className="field-input"
            />
          </label>
          <button className="btn-primary" onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating…' : 'Create Game'}
          </button>
        </section>

        {/* Join by ID */}
        <section className="lobby-card">
          <h2>Join by Game ID</h2>
          <label className="field-label">
            Game ID
            <input
              type="text"
              placeholder="Enter game ID…"
              value={joinId}
              onChange={e => setJoinId(e.target.value)}
              className="field-input"
            />
          </label>
          <button
            className="btn-primary"
            onClick={() => handleJoin(joinId, egldToWei(wager))}
            disabled={loading || !joinId}
          >
            Join Game
          </button>
        </section>
      </div>

      {/* Open games */}
      <section className="lobby-open">
        <h2>Your Games</h2>
        {openGames.length === 0 ? (
          <div className="empty-state">
            <p>No active games. Create one or join an existing game above.</p>
          </div>
        ) : (
          <table className="games-table">
            <thead>
              <tr>
                <th>Game ID</th>
                <th>Player</th>
                <th>Wager</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {openGames.map(g => (
                <tr key={g.gameId}>
                  <td className="mono">{fmtAddress(g.gameId, 6)}</td>
                  <td>{fmtAddress(g.player1)}</td>
                  <td>{fmtEgld(g.wager)}</td>
                  <td>
                    <button
                      className="btn-sm"
                      onClick={() => navigate(`/game/${g.gameId}`)}
                    >
                      Resume
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
