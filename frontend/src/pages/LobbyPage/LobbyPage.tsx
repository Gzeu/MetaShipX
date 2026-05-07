import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { battleshipService } from '../../services/battleship.service';
import './lobby-page.css';

interface OpenGame {
  gameId: number;
  creator: string;
  bet: string;
}

export const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const { address } = useGetAccountInfo();

  const [openGames, setOpenGames] = useState<OpenGame[]>([]);
  const [myGames, setMyGames]     = useState<number[]>([]);
  const [loading, setLoading]     = useState(false);
  const [creating, setCreating]   = useState(false);
  const [joining, setJoining]     = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [betInput, setBetInput]     = useState('0.1');
  const [joinIdInput, setJoinIdInput] = useState('');

  // ─── Fix: use a ref so refresh() always reads the *latest* myGames
  // without adding it to the dependency array (which would cause an infinite loop:
  // refresh → setMyGames → myGames changes → refresh recreated → useEffect fires again)
  const myGamesRef = useRef<number[]>([]);
  useEffect(() => { myGamesRef.current = myGames; }, [myGames]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      let latestIds = myGamesRef.current;
      if (address) {
        latestIds = await battleshipService.getPlayerGames(address);
        setMyGames(latestIds);
        myGamesRef.current = latestIds;
      }
      const games: OpenGame[] = [];
      for (const id of latestIds.slice(0, 20)) {
        try {
          const state = await battleshipService.getGameState(id);
          if (state.phase === 'WaitingForOpponent') {
            games.push({ gameId: id, creator: state.creator, bet: state.bet });
          }
        } catch {}
      }
      setOpenGames(games);
    } finally {
      setLoading(false);
    }
  }, [address]); // address is the only real dep now — myGames is read via ref

  useEffect(() => { refresh(); }, [address]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    if (!address) return;
    setCreating(true);
    try {
      const betWei = BigInt(Math.round(parseFloat(betInput) * 1e18)).toString();
      await battleshipService.createGame(betWei);
      setShowCreate(false);
      await refresh();
    } catch (e: any) {
      alert(`Error: ${e?.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (gameId: number, bet: string) => {
    if (!address) return;
    setJoining(gameId);
    try {
      await battleshipService.joinGame(gameId, bet);
      navigate(`/game/${gameId}`);
    } catch (e: any) {
      alert(`Join error: ${e?.message}`);
    } finally {
      setJoining(null);
    }
  };

  const handleJoinById = () => {
    const id = parseInt(joinIdInput);
    if (!id) return;
    navigate(`/game/${id}`);
  };

  const egld = (wei: string) => (Number(BigInt(wei)) / 1e18).toFixed(3);
  const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

  return (
    <div className="lobby">
      <header className="lobby__header">
        <div>
          <h1 className="lobby__title">⚓ Battleship Lobby</h1>
          <p className="lobby__subtitle">Find an opponent or create a new game</p>
        </div>
        <div className="lobby__actions">
          <div className="join-by-id">
            <input
              className="join-id-input"
              placeholder="Game ID..."
              value={joinIdInput}
              onChange={e => setJoinIdInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoinById()}
            />
            <button className="btn btn--ghost" onClick={handleJoinById}>Join</button>
          </div>
          {address && (
            <button className="btn btn--primary" onClick={() => setShowCreate(true)}>
              + New Game
            </button>
          )}
        </div>
      </header>

      <div className="lobby__stats">
        <div className="stat-chip">
          <span className="stat-chip__value">{openGames.length}</span>
          <span className="stat-chip__label">Open games</span>
        </div>
        <div className="stat-chip">
          <span className="stat-chip__value">{myGames.length}</span>
          <span className="stat-chip__label">My games</span>
        </div>
        <button
          className="refresh-btn"
          onClick={refresh}
          disabled={loading}
          title="Refresh"
        >
          {loading ? '⏳' : '↺'}
        </button>
      </div>

      {myGames.length > 0 && (
        <section className="lobby__section">
          <h2 className="lobby__section-title">My Games</h2>
          <div className="games-row">
            {myGames.slice(0, 10).map(id => (
              <button key={id} className="game-chip" onClick={() => navigate(`/game/${id}`)}>#{id}</button>
            ))}
          </div>
        </section>
      )}

      <section className="lobby__section lobby__section--main">
        <h2 className="lobby__section-title">Open Games</h2>
        {loading && openGames.length === 0 ? (
          <div className="lobby__empty">
            <div className="loading-spinner" />
            <p>Loading...</p>
          </div>
        ) : openGames.length === 0 ? (
          <div className="lobby__empty">
            <div className="empty-icon">🌊</div>
            <p>No open games right now.</p>
            <p className="empty-hint">Be first — create a game!</p>
          </div>
        ) : (
          <div className="games-table">
            <div className="games-table__header">
              <span>Game #</span>
              <span>Creator</span>
              <span>Bet</span>
              <span></span>
            </div>
            {openGames.map(g => (
              <div key={g.gameId} className="games-table__row">
                <span className="game-id">#{g.gameId}</span>
                <span className="game-creator">
                  {g.creator === address ? '👤 You' : shortAddr(g.creator)}
                </span>
                <span className="game-bet">💰 {egld(g.bet)} EGLD</span>
                <span className="game-actions">
                  {g.creator === address ? (
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => navigate(`/game/${g.gameId}`)}
                    >View</button>
                  ) : (
                    <button
                      className="btn btn--primary btn--sm"
                      disabled={joining === g.gameId}
                      onClick={() => handleJoin(g.gameId, g.bet)}
                    >
                      {joining === g.gameId ? 'Joining...' : 'Join →'}
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="lobby__quick-links">
        <button className="quick-link" onClick={() => navigate('/tournaments')}>🏆 Tournaments</button>
        <button className="quick-link" onClick={() => navigate('/staking')}>💰 Staking</button>
        <button className="quick-link" onClick={() => navigate('/marketplace')}>🛒 Ship NFTs</button>
        <button className="quick-link" onClick={() => navigate('/leaderboard')}>🏅 Leaderboard</button>
      </section>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal__title">⚓ Create New Game</h2>
            <label className="modal__label">
              Bet (EGLD)
              <input
                className="modal__input"
                type="number"
                min="0.001"
                step="0.05"
                value={betInput}
                onChange={e => setBetInput(e.target.value)}
              />
            </label>
            <p className="modal__hint">
              Opponent must match your bet. Winner takes 2×.
            </p>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button
                className="btn btn--primary"
                disabled={creating || !betInput}
                onClick={handleCreate}
              >
                {creating ? 'Sending...' : 'Create →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LobbyPage;
