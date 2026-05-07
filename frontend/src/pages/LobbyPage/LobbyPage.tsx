import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { battleshipService } from '../../services/battleship.service';
import './lobby-page.css';

interface OpenGame {
  gameId: number;
  creator: string;
  bet: string; // raw EGLD in denominată
}

export const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const { address } = useGetAccountInfo();

  const [openGames, setOpenGames] = useState<OpenGame[]>([]);
  const [myGames, setMyGames]     = useState<number[]>([]);
  const [loading, setLoading]     = useState(false);
  const [creating, setCreating]   = useState(false);
  const [joining, setJoining]     = useState<number | null>(null);

  // Create game modal
  const [showCreate, setShowCreate] = useState(false);
  const [betInput, setBetInput]     = useState('0.1');

  // Join by ID
  const [joinIdInput, setJoinIdInput] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (address) {
        const ids = await battleshipService.getPlayerGames(address);
        setMyGames(ids);
      }
      // In production: query an indexer or SC event feed for open games.
      // For now we load the caller's games and show those waiting.
      const games: OpenGame[] = [];
      for (const id of myGames.slice(0, 20)) {
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
  }, [address, myGames]);

  useEffect(() => { refresh(); }, [address]); // eslint-disable-line

  const handleCreate = async () => {
    if (!address) return;
    setCreating(true);
    try {
      const betWei = BigInt(Math.round(parseFloat(betInput) * 1e18)).toString();
      await battleshipService.createGame(betWei);
      setShowCreate(false);
      await refresh();
    } catch (e: any) {
      alert(`Eroare: ${e?.message}`);
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
      alert(`Eroare join: ${e?.message}`);
    } finally {
      setJoining(null);
    }
  };

  const handleJoinById = async () => {
    const id = parseInt(joinIdInput);
    if (!id) return;
    navigate(`/game/${id}`);
  };

  const egld = (wei: string) => (Number(BigInt(wei)) / 1e18).toFixed(3);
  const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

  return (
    <div className="lobby">
      {/* ── Header ── */}
      <header className="lobby__header">
        <div>
          <h1 className="lobby__title">⚓ Battleship Lobby</h1>
          <p className="lobby__subtitle">Gsescă un adversar sau creează un nou joc</p>
        </div>
        <div className="lobby__actions">
          <div className="join-by-id">
            <input
              className="join-id-input"
              placeholder="ID joc..."
              value={joinIdInput}
              onChange={e => setJoinIdInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoinById()}
            />
            <button className="btn btn--ghost" onClick={handleJoinById}>
              Intră
            </button>
          </div>
          {address && (
            <button className="btn btn--primary" onClick={() => setShowCreate(true)}>
              + Joc Nou
            </button>
          )}
        </div>
      </header>

      {/* ── Stats bar ── */}
      <div className="lobby__stats">
        <div className="stat-chip">
          <span className="stat-chip__value">{openGames.length}</span>
          <span className="stat-chip__label">Jocuri deschise</span>
        </div>
        <div className="stat-chip">
          <span className="stat-chip__value">{myGames.length}</span>
          <span className="stat-chip__label">Jocurile mele</span>
        </div>
        <button
          className="refresh-btn"
          onClick={refresh}
          disabled={loading}
          title="Refrsează"
        >
          {loading ? '⏳' : '↺'}
        </button>
      </div>

      {/* ── My games row ── */}
      {myGames.length > 0 && (
        <section className="lobby__section">
          <h2 className="lobby__section-title">Jocurile Mele</h2>
          <div className="games-row">
            {myGames.slice(0, 10).map(id => (
              <button
                key={id}
                className="game-chip"
                onClick={() => navigate(`/game/${id}`)}
              >
                #{id}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Open games table ── */}
      <section className="lobby__section lobby__section--main">
        <h2 className="lobby__section-title">Jocuri Deschise</h2>

        {loading && openGames.length === 0 ? (
          <div className="lobby__empty">
            <div className="loading-spinner" />
            <p>Se încarcă...</p>
          </div>
        ) : openGames.length === 0 ? (
          <div className="lobby__empty">
            <div className="empty-icon">🌊</div>
            <p>Niciun joc deschis în momentul acesta.</p>
            <p className="empty-hint">Fii primul — creează un joc!</p>
          </div>
        ) : (
          <div className="games-table">
            <div className="games-table__header">
              <span>Joc #</span>
              <span>Creator</span>
              <span>Pariu</span>
              <span></span>
            </div>
            {openGames.map(g => (
              <div key={g.gameId} className="games-table__row">
                <span className="game-id">#{g.gameId}</span>
                <span className="game-creator">
                  {g.creator === address ? '👤 Tu' : shortAddr(g.creator)}
                </span>
                <span className="game-bet">💰 {egld(g.bet)} EGLD</span>
                <span className="game-actions">
                  {g.creator === address ? (
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => navigate(`/game/${g.gameId}`)}
                    >
                      Vezi
                    </button>
                  ) : (
                    <button
                      className="btn btn--primary btn--sm"
                      disabled={joining === g.gameId}
                      onClick={() => handleJoin(g.gameId, g.bet)}
                    >
                      {joining === g.gameId ? 'Se intră...' : 'Intră →'}
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Quick links ── */}
      <section className="lobby__quick-links">
        <button className="quick-link" onClick={() => navigate('/tournaments')}>
          🏆 Turnee
        </button>
        <button className="quick-link" onClick={() => navigate('/staking')}>
          💰 Staking
        </button>
        <button className="quick-link" onClick={() => navigate('/marketplace')}>
          🛒 Nave NFT
        </button>
        <button className="quick-link" onClick={() => navigate('/leaderboard')}>
          🏅 Clasament
        </button>
      </section>

      {/* ── Create game modal ── */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal__title">⚓ Creează Joc Nou</h2>
            <label className="modal__label">
              Pariu (EGLD)
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
              Adversarul trebuie să plătească același pariu pentru a intra.
              Câștigătorul ia 2× pariul.
            </p>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={() => setShowCreate(false)}>
                Anulează
              </button>
              <button
                className="btn btn--primary"
                disabled={creating || !betInput}
                onClick={handleCreate}
              >
                {creating ? 'Se trimite...' : 'Creează →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LobbyPage;
