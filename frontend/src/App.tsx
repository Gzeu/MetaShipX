import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DappProvider } from '@multiversx/sdk-dapp/wrappers';
import { NotificationModal } from '@multiversx/sdk-dapp/UI/NotificationModal';
import { SignTransactionsModals } from '@multiversx/sdk-dapp/UI/SignTransactionsModals';
import { TransactionsToastList } from '@multiversx/sdk-dapp/UI/TransactionsToastList';

import Navbar from './components/Navbar/Navbar';
import Home from './pages/Home';
import Leaderboard from './pages/Leaderboard';
import Marketplace from './pages/Marketplace';
import Profile from './pages/Profile';
import Tournaments from './pages/Tournaments';
import { GamePage } from './pages/GamePage/GamePage';
import { LobbyPage } from './pages/LobbyPage/LobbyPage';
import { StakingPage } from './pages/StakingPage';
import { SpectatorPage } from './pages/SpectatorPage';
import NotFound from './pages/NotFound';

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

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lobby" element={<LobbyPage />} />
          <Route path="/game/:gameId" element={<GamePage />} />
          <Route path="/spectate/:gameId" element={<SpectatorPage />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/staking" element={<StakingPage />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:address" element={<Profile />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </BrowserRouter>
    </DappProvider>
  );
}
