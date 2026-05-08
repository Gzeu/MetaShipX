import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useGetAccountInfo, useGetIsLoggedIn } from '@multiversx/sdk-dapp/hooks';
import './Navbar.css';

const NAV_ITEMS = [
  { label: 'Play',         href: '/lobby',        auth: true  },
  { label: 'Tournaments',  href: '/tournaments',  auth: true  },
  { label: 'Staking',      href: '/staking',      auth: true  },
  { label: 'Marketplace',  href: '/marketplace',  auth: true  },
  { label: 'Leaderboard',  href: '/leaderboard',  auth: false },
];

function shortAddr(addr: string) {
  if (!addr) return '';
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

export default function Navbar() {
  const isLoggedIn = useGetIsLoggedIn();
  const { address } = useGetAccountInfo();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter(i => !i.auth || isLoggedIn);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <NavLink to="/" className="navbar-logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="MetaShipX">
            <rect width="28" height="28" rx="6" fill="#0f172a" />
            <path d="M4 18 L14 8 L24 18" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <rect x="8" y="18" width="12" height="4" rx="2" fill="#2563eb" />
            <circle cx="14" cy="8" r="2" fill="#7c3aed" />
          </svg>
          <span className="navbar-brand">MetaShipX</span>
        </NavLink>

        {/* Desktop links */}
        <div className="navbar-links">
          {visibleItems.map(item => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Right: wallet / login */}
        <div className="navbar-right">
          {isLoggedIn ? (
            <>
              <NavLink to="/profile" className="navbar-addr">
                {shortAddr(address)}
              </NavLink>
              <button className="navbar-btn navbar-btn--outline" onClick={() => navigate('/profile')}>
                Profile
              </button>
            </>
          ) : (
            <button className="navbar-btn navbar-btn--primary" onClick={() => navigate('/unlock')}>
              Connect Wallet
            </button>
          )}

          {/* Hamburger */}
          <button
            className="navbar-hamburger"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen(o => !o)}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="navbar-mobile">
          {visibleItems.map(item => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) => `navbar-mobile-link${isActive ? ' active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
          {!isLoggedIn && (
            <button className="navbar-btn navbar-btn--primary w-full" onClick={() => { navigate('/unlock'); setMenuOpen(false); }}>
              Connect Wallet
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
