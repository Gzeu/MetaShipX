import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { tournamentService } from '../../services/tournament.service';
import type { TournamentInfo, MatchInfo } from '../../services/tournament.service';
import './tournament-page.css';

// ── Bracket visualizer ────────────────────────────────────────────────────

const MatchCard: React.FC<{ match: MatchInfo; address: string; onOpenGame: (id: number) => void }> =
  ({ match, address, onOpenGame }) => {
  const isMyMatch = match.player1 === address || match.player2 === address;
  const short = (a: string) => a ? `${a.slice(0,6)}…${a.slice(-4)}` : '???';
  const statusColors: Record<string, string> = {
    Pending:    'match-card--pending',
    InProgress: 'match-card--live',
    Finished:   'match-card--done',
  };
  return (
    <div className={`match-card ${statusColors[match.status] ?? ''} ${isMyMatch ? 'match-card--mine' : ''}`}>
      <div className="match-card__header">
        <span className="match-id">#{match.matchId}</span>
        <span className={`match-status match-status--${match.status.toLowerCase()}`}>
          {match.status === 'InProgress' ? '🔴 LIVE' : match.status}
        </span>
      </div>
      <div className="match-players">
        <div className={`match-player ${match.winner === match.player1 ? 'match-player--winner' : ''}`}>
          {match.player1 === address ? '👤 Tu' : short(match.player1)}
          {match.winner === match.player1 && <span className="crown">👑</span>}
        </div>
        <div className="match-vs">VS</div>
        <div className={`match-player ${match.winner === match.player2 ? 'match-player--winner' : ''}`}>
          {match.player2 === address ? '👤 Tu' : short(match.player2)}
          {match.winner === match.player2 && <span className="crown">👑</span>}
        </div>
      </div>
      {match.gameId && match.status === 'InProgress' && (
        <button
          className={`match-cta ${isMyMatch ? 'match-cta--primary' : 'match-cta--ghost'}`}
          onClick={() => onOpenGame(match.gameId!)}
        >
          {isMyMatch ? 'Joacă acum →' : 'Spectator 👁'}
        </button>
      )}
    </div>
  );
};

// Group matches into rounds
function groupRounds(matches: MatchInfo[]): MatchInfo[][] {
  if (!matches.length) return [];
  const total = matches.length;
  // Single-elimination: round sizes are n/2, n/4 … 1
  const rounds: MatchInfo[][] = [];
  let remaining = [...matches];
  let roundSize = Math.pow(2, Math.floor(Math.log2(total)));
  while (remaining.length > 0 && roundSize >= 1) {
    rounds.push(remaining.splice(0, roundSize));
    roundSize = Math.floor(roundSize / 2);
  }
  return rounds;
}

// ── Main page ────────────────────────────────────────────────────────

export const TournamentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { address } = useGetAccountInfo();

  const [tournament, setTournament] = useState<TournamentInfo | null>(null);
  const [bracket, setBracket]       = useState<MatchInfo[]>([]);
  const [loading, setLoading]       = useState(true);
  const [registering, setRegistering] = useState(false);
  const [claiming, setClaiming]     = useState(false);
  const [tab, setTab]               = useState<'bracket' | 'info'>('bracket');

  const tournamentId = Number(id);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, b] = await Promise.all([
        tournamentService.getTournament(tournamentId),
        tournamentService.getTournamentBracket(tournamentId),
      ]);
      setTournament(t);
      setBracket(b);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => { load(); }, [load]);

  const handleRegister = async () => {
    if (!tournament) return;
    setRegistering(true);
    try {
      await tournamentService.registerForTournament(tournamentId, tournament.entryFee);
      await load();
    } catch (e: any) { alert(e?.message); }
    finally { setRegistering(false); }
  };

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await tournamentService.claimPrize(tournamentId);
      await load();
    } catch (e: any) { alert(e?.message); }
    finally { setClaiming(false); }
  };

  const rounds = groupRounds(bracket);
  const roundNames = ['Turul 1','Turul 2','Sferturi','Semifinale','Finala'];
  const egld = (v: string) => (Number(BigInt(v || '0')) / 1e18).toFixed(3);
  const isWinner = tournament?.winner === address;
  const isRegistered = bracket.some(
    m => m.player1 === address || m.player2 === address
  );

  if (loading) return (
    <div className="tp tp--loading">
      <div className="tp-spinner" />
      <p>Se încarcă turneul...</p>
    </div>
  );

  if (!tournament) return (
    <div className="tp tp--error">
      <p>Turneul #{id} nu a fost găsit.</p>
      <button className="btn btn--ghost" onClick={() => navigate('/tournaments')}>Turnee</button>
    </div>
  );

  const statusLabel: Record<string, string> = {
    Registration: '🟢 Înregistrare deschisă',
    InProgress:   '🔴 în desfășurare',
    Finished:     '✅ Terminat',
  };

  return (
    <div className="tp">
      {/* Header */}
      <header className="tp__header">
        <button className="btn-back" onClick={() => navigate('/tournaments')}>← Turnee</button>
        <div className="tp__title">
          <h1>🏆 {tournament.name}</h1>
          <span className={`tp-status tp-status--${tournament.status.toLowerCase()}`}>
            {statusLabel[tournament.status]}
          </span>
        </div>
      </header>

      {/* Prize + stats */}
      <div className="tp__stats">
        <div className="tp-stat">
          <span className="tp-stat__val">{egld(tournament.prizePool)}</span>
          <span className="tp-stat__lbl">EGLD Prize Pool</span>
        </div>
        <div className="tp-stat">
          <span className="tp-stat__val">{egld(tournament.entryFee)}</span>
          <span className="tp-stat__lbl">Entry Fee EGLD</span>
        </div>
        <div className="tp-stat">
          <span className="tp-stat__val">{tournament.registeredCount}/{tournament.maxPlayers}</span>
          <span className="tp-stat__lbl">Jucători</span>
        </div>
        <div className="tp-stat">
          <span className="tp-stat__val">{bracket.length}</span>
          <span className="tp-stat__lbl">Meciuri</span>
        </div>
      </div>

      {/* CTA */}
      <div className="tp__cta">
        {tournament.status === 'Registration' && !isRegistered && address && (
          <button
            className="btn btn--primary btn--lg"
            disabled={registering}
            onClick={handleRegister}
          >
            {registering ? 'Se înregistrează...' : `Înregistrează-te — ${egld(tournament.entryFee)} EGLD`}
          </button>
        )}
        {tournament.status === 'Registration' && isRegistered && (
          <span className="registered-badge">✅ Întiínregistrat</span>
        )}
        {tournament.status === 'Finished' && isWinner && (
          <button
            className="btn btn--gold btn--lg"
            disabled={claiming}
            onClick={handleClaim}
          >
            {claiming ? 'Se revendică...' : `🏆 Revendică premiul — ${egld(tournament.prizePool)} EGLD`}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tp__tabs">
        <button
          className={`tp-tab ${tab === 'bracket' ? 'tp-tab--active' : ''}`}
          onClick={() => setTab('bracket')}
        >Bracket</button>
        <button
          className={`tp-tab ${tab === 'info' ? 'tp-tab--active' : ''}`}
          onClick={() => setTab('info')}
        >Info</button>
      </div>

      {/* Bracket */}
      {tab === 'bracket' && (
        <div className="bracket">
          {rounds.length === 0 ? (
            <div className="bracket__empty">
              <p>Bracket-ul va fi generat când turneul începe.</p>
              <div className="bracket-placeholder">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="bracket-ph-card">
                    <div className="bracket-ph-player" />
                    <div className="bracket-ph-vs">VS</div>
                    <div className="bracket-ph-player" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bracket__rounds">
              {rounds.map((round, ri) => (
                <div key={ri} className="bracket__round">
                  <div className="round-label">
                    {roundNames[ri] ?? `Tur ${ri + 1}`}
                  </div>
                  <div className="round-matches">
                    {round.map(match => (
                      <MatchCard
                        key={match.matchId}
                        match={match}
                        address={address}
                        onOpenGame={gid => navigate(`/game/${gid}`)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info tab */}
      {tab === 'info' && (
        <div className="tp__info">
          <div className="info-row">
            <span>Status</span>
            <strong>{statusLabel[tournament.status]}</strong>
          </div>
          <div className="info-row">
            <span>Jucători max</span>
            <strong>{tournament.maxPlayers}</strong>
          </div>
          <div className="info-row">
            <span>Îinregistrați</span>
            <strong>{tournament.registeredCount}</strong>
          </div>
          <div className="info-row">
            <span>Prize pool</span>
            <strong>{egld(tournament.prizePool)} EGLD</strong>
          </div>
          <div className="info-row">
            <span>Entry fee</span>
            <strong>{egld(tournament.entryFee)} EGLD</strong>
          </div>
          {tournament.winner && (
            <div className="info-row">
              <span>🏆 Câștigător</span>
              <strong className="winner-addr">
                {tournament.winner === address ? '👤 Tu!' :
                  `${tournament.winner.slice(0,8)}…${tournament.winner.slice(-6)}`}
              </strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TournamentPage;
