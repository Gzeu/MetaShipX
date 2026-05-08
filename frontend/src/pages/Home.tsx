// Re-export from folder version if it exists, else keep this as canonical.
// This single-file version IS the canonical Home page for now.
import React from 'react';
import { Link } from 'react-router-dom';
import { useGetLoginInfo } from '@multiversx/sdk-dapp/hooks';

const FEATURES = [
  { icon: '⚓', title: 'On-Chain Battleship', desc: 'Every move verified by a MultiversX smart contract. No cheating possible.' },
  { icon: '💎', title: 'Ship NFTs', desc: 'Mint, upgrade and trade your fleet as SFTs. Rare ships grant stat bonuses.' },
  { icon: '🏆', title: 'Tournaments', desc: 'Join bracket tournaments, stake EGLD entry fees and compete for the prize pool.' },
  { icon: '💰', title: 'Staking Rewards', desc: 'Stake EGLD and earn passive rewards from every game fee collected on-chain.' },
];

const HomePage: React.FC = () => {
  const { isLoggedIn } = useGetLoginInfo();

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '3rem 1rem' }}>
      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '4rem 1rem 5rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚓</div>
        <h1 style={{ fontSize: 'clamp(2rem,6vw,3.5rem)', fontWeight: 800, color: '#e6edf3', lineHeight: 1.1, marginBottom: '1rem' }}>
          Battleship on the Blockchain
        </h1>
        <p style={{ fontSize: '1.125rem', color: '#8b949e', maxWidth: 520, margin: '0 auto 2rem' }}>
          Play the classic naval strategy game with real stakes. Every move is on-chain, every win pays out instantly.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {isLoggedIn ? (
            <Link to="/lobby" style={btnPrimary}>Play Now →</Link>
          ) : (
            <Link to="/unlock" style={btnPrimary}>Connect &amp; Play →</Link>
          )}
          <Link to="/leaderboard" style={btnGhost}>Leaderboard</Link>
        </div>
      </section>

      {/* Features */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '1rem', marginBottom: '4rem' }}>
        {FEATURES.map(f => (
          <div key={f.title} style={card}>
            <div style={{ fontSize: '2rem', marginBottom: '.75rem' }}>{f.icon}</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#e6edf3', marginBottom: '.375rem' }}>{f.title}</h3>
            <p style={{ fontSize: '.875rem', color: '#8b949e', lineHeight: 1.6 }}>{f.desc}</p>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section style={{ textAlign: 'center', background: '#161b22', border: '1px solid #21262d', borderRadius: 12, padding: '3rem 2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e6edf3', marginBottom: '.5rem' }}>Ready to sail?</h2>
        <p style={{ color: '#8b949e', marginBottom: '1.5rem' }}>Connect your MultiversX wallet and join a game in seconds.</p>
        <Link to={isLoggedIn ? '/lobby' : '/unlock'} style={btnPrimary}>
          {isLoggedIn ? 'Go to Lobby' : 'Connect Wallet'}
        </Link>
      </section>
    </div>
  );
};

const btnPrimary: React.CSSProperties = {
  display: 'inline-block', padding: '.625rem 1.5rem', background: '#238636',
  border: '1px solid #2ea043', borderRadius: 8, color: '#fff', fontWeight: 600,
  fontSize: '.9375rem', textDecoration: 'none', cursor: 'pointer',
};
const btnGhost: React.CSSProperties = {
  display: 'inline-block', padding: '.625rem 1.5rem', background: 'none',
  border: '1px solid #30363d', borderRadius: 8, color: '#8b949e',
  fontSize: '.9375rem', textDecoration: 'none',
};
const card: React.CSSProperties = {
  background: '#161b22', border: '1px solid #21262d', borderRadius: 10,
  padding: '1.5rem', transition: 'border-color 150ms',
};

export default HomePage;
