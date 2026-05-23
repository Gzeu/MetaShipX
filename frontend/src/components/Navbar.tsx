import React from 'react';
import { NavLink } from 'react-router-dom';
import { useGetIsLoggedIn } from '@multiversx/sdk-dapp/hooks';
import './Navbar.css';

const Navbar: React.FC = () => {
  const isLoggedIn = useGetIsLoggedIn();

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">⚓ MetaShipX</NavLink>
      <div className="navbar-links">
        <NavLink to="/lobby"       className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Lobby</NavLink>
        <NavLink to="/practice"    className={({ isActive }) => isActive ? 'nav-link active nav-link--highlight' : 'nav-link nav-link--highlight'}>🤖 Practice</NavLink>
        <NavLink to="/marketplace" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Marketplace</NavLink>
        <NavLink to="/tournaments" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Tournaments</NavLink>
        <NavLink to="/staking"     className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Staking</NavLink>
        <NavLink to="/leaderboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Leaderboard</NavLink>
        {isLoggedIn && (
          <NavLink to="/profile" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Profile</NavLink>
        )}
      </div>
      <div className="navbar-wallet">
        {isLoggedIn
          ? <NavLink to="/profile" className="btn-wallet btn-wallet--connected">🔗 Wallet</NavLink>
          : <NavLink to="/unlock"  className="btn-wallet">Connect Wallet</NavLink>
        }
      </div>
    </nav>
  );
};

export default Navbar;
