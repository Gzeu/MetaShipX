import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DappProvider } from '@multiversx/sdk-dapp/wrappers';
import { NotificationModal } from '@multiversx/sdk-dapp/UI/NotificationModal';
import { SignTransactionsModals } from '@multiversx/sdk-dapp/UI/SignTransactionsModals';
import { TransactionsToastList } from '@multiversx/sdk-dapp/UI/TransactionsToastList';

import Navbar from './components/Navbar/Navbar';

// ── Canonical lazy imports — one source of truth for all routes ──────────────
const Home        = lazy(() => import('./pages/Home'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const Profile     = lazy(() => import('./pages/Profile'));
const Tournaments = lazy(() => import('./pages/Tournaments'));
const NotFound    = lazy(() => import('./pages/NotFound'));
const PracticePage = lazy(() => import('./pages/PracticePage'));
// Folder-based pages (contain index.tsx)
const GamePage     = lazy(() => import('./pages/Game').then(m => ({ default: m.GamePage ?? m.default })));
const LobbyPage    = lazy(() => import('./pages/LobbyPage').then(m => ({ default: m.LobbyPage ?? m.default })));
const StakingPage  = lazy(() => import('./pages/StakingPage').then(m => ({ default: m.StakingPage ?? m.default })));
const SpectatorPage = lazy(() => import('./pages/SpectatorPage').then(m => ({ default: m.SpectatorPage ?? m.default })));

const ENVIRONMENT = (import.meta.env.VITE_ENV as 'devnet' | 'testnet' | 'mainnet') || 'devnet';

const customNetworkConfig = {
  name: 'MetaShipX',
  apiTimeout: 10_000,
  walletConnectV2ProjectId: '7b9f8e2c4d1a0f3b6e9c2d5a8b1e4f7c',
  ...(ENVIRONMENT === 'devnet' && {
    egldLabel: 'xEGLD',
    decimals: '18',
    gasPerDataByte: '1500',
    walletAddress: 'https://devnet-wallet.multiversx.com',
    apiAddress: import.meta.env.VITE_API_URL || 'https://devnet-api.multiversx.com',
    explorerAddress: 'https://devnet-explorer.multiversx.com',
    chainId: 'D',
  }),
};

export default function App() {
  return (
    <DappProvider
      environment={ENVIRONMENT}
      customNetworkConfig={customNetworkConfig}
      dappConfig={{ shouldUseWebViewProvider: true }}
    >
      <BrowserRouter>
        <Navbar />
        <TransactionsToastList />
        <NotificationModal />
        <SignTransactionsModals />

        <Suspense fallback={<div className="page-loading">Loading…</div>}>
          <Routes>
            <Route path="/"                  element={<Home />} />
            <Route path="/lobby"             element={<LobbyPage />} />
            <Route path="/game/:gameId"      element={<GamePage />} />
            <Route path="/spectate/:gameId" element={<SpectatorPage />} />
            <Route path="/leaderboard"       element={<Leaderboard />} />
            <Route path="/marketplace"       element={<Marketplace />} />
            <Route path="/staking"           element={<StakingPage />} />
            <Route path="/tournaments"       element={<Tournaments />} />
            <Route path="/profile"           element={<Profile />} />
            <Route path="/profile/:address" element={<Profile />} />
            {/* Practice mode — no wallet, no EGLD, no on-chain tx */}
            <Route path="/practice"          element={<PracticePage />} />
            <Route path="/404"               element={<NotFound />} />
            <Route path="*"                  element={<Navigate to="/404" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </DappProvider>
  );
}
