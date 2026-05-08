import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useGetLoginInfo, useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { logout } from '@multiversx/sdk-dapp/utils';
import './layout.css';

const NAV_LINKS = [
  { to: '/lobby',        label: '⚓ Lobby' },
  { to: '/tournaments',  label: '🏆 Tournaments' },
  { to: '/staking',      label: '💰 Staking' },
  { to: '/marketplace',  label: '🛒 Ships' },
  { to: '/leaderboard',  label: '🏅 Leaderboard' },
];

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn }  = useGetLoginInfo();
  const { address }     = useGetAccountInfo();
  const navigate        = useNavigate();
  const location        = useLocation();

  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';

  const handleLogout = () => {
    logout('/');
  };

  return (
    <div className="layout">
      <header className="layout__nav">
        <Link to="/" className="layout__brand">
          <span className="layout__brand-icon">⚓</span>
          <span className="layout__brand-name">MetaShipX</span>
        </Link>

        <nav className="layout__links">
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`layout__link${
                location.pathname.startsWith(to) ? ' layout__link--active' : ''
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="layout__wallet">
          {isLoggedIn ? (
            <>
              <button
                className="wallet-chip"
                onClick={() => navigate('/profile')}
                title={address}
              >
                {short}
              </button>
              <button className="btn-disconnect" onClick={handleLogout}>
                Disconnect
              </button>
            </>
          ) : (
            <button
              className="btn-connect"
              onClick={() => navigate('/unlock')}
            >
              Connect Wallet
            </button>
          )}
        </div>

        {/* Mobile hamburger — CSS-only toggle */}
        <input type="checkbox" id="nav-toggle" className="nav-toggle-input" />
        <label htmlFor="nav-toggle" className="nav-hamburger" aria-label="Toggle menu">
          <span /><span /><span />
        </label>
        <div className="layout__mobile-menu">
          {NAV_LINKS.map(({ to, label }) => (
            <Link key={to} to={to} className="layout__mobile-link">{label}</Link>
          ))}
          {isLoggedIn ? (
            <button className="layout__mobile-link" onClick={handleLogout}>Disconnect</button>
          ) : (
            <Link to="/unlock" className="layout__mobile-link">Connect Wallet</Link>
          )}
        </div>
      </header>

      <main className="layout__main">{children}</main>

      <footer className="layout__footer">
        <span>© 2026 MetaShipX — Built on MultiversX</span>
        <div className="layout__footer-links">
          <a href="https://github.com/Gzeu/MetaShipX" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="https://devnet-explorer.multiversx.com" target="_blank" rel="noopener noreferrer">Explorer</a>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
