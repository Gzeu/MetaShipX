import React from 'react';
import { NavLink } from 'react-router-dom';
import { useGetIsLoggedIn, useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { logout } from '@multiversx/sdk-dapp/utils';
import { ExtensionLoginButton } from '@multiversx/sdk-dapp/UI/extension/ExtensionLoginButton';
import './Navbar.css';

const NAV_LINKS = [
  { to: '/', label: '🏠 Home', end: true },
  { to: '/lobby', label: '⚓ Play' },
  { to: '/tournaments', label: '🏆 Tournaments' },
  { to: '/marketplace', label: '🛒 Ships' },
  { to: '/staking', label: '💰 Stake' },
  { to: '/leaderboard', label: '📊 Board' },
];

export default function Navbar() {
  const isLoggedIn = useGetIsLoggedIn();
  const { account } = useGetAccountInfo();
  const short = account?.address
    ? `${account.address.slice(0, 6)}…${account.address.slice(-4)}`
    : '';

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">⚓</span>
        <span className="navbar-title">MetaShipX</span>
      </div>

      <div className="navbar-links">
        {NAV_LINKS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              isActive ? 'navbar-link active' : 'navbar-link'
            }
          >
            {label}
          </NavLink>
        ))}
      </div>

      <div className="navbar-actions">
        {isLoggedIn ? (
          <>
            <NavLink to="/profile" className="navbar-address">
              {short}
            </NavLink>
            <button
              className="navbar-btn navbar-btn--outline"
              onClick={() => logout('/')}
            >
              Logout
            </button>
          </>
        ) : (
          <ExtensionLoginButton
            callbackRoute="/"
            buttonClassName="navbar-btn navbar-btn--primary"
            loginButtonText="Connect Wallet"
          />
        )}
      </div>
    </nav>
  );
}
