import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DappProvider } from '@multiversx/sdk-dapp/wrappers';
import { NotificationModal } from '@multiversx/sdk-dapp/UI/NotificationModal';
import { SignTransactionsModals } from '@multiversx/sdk-dapp/UI/SignTransactionsModals';
import { TransactionsToastList } from '@multiversx/sdk-dapp/UI/TransactionsToastList';
import { ENVIRONMENT, WALLETCONNECT_PROJECT_ID } from './config';
import { Navbar } from './components/Navbar';
import { PageLoader } from './components/PageLoader';

const HomePage        = lazy(() => import('./pages/HomePage'));
const GamePage        = lazy(() => import('./pages/Game'));
const LobbyPage       = lazy(() => import('./pages/LobbyPage/LobbyPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const StakingPage     = lazy(() => import('./pages/StakingPage'));
const MarketplacePage = lazy(() => import('./pages/MarketplacePage'));
const SpectatorPage   = lazy(() => import('./pages/SpectatorPage'));
const TournamentsPage = lazy(() => import('./pages/TournamentsPage'));
const ProfilePage     = lazy(() => import('./pages/ProfilePage'));
const UnlockPage      = lazy(() => import('./pages/UnlockPage/UnlockPage'));
const NotFoundPage    = lazy(() => import('./pages/NotFoundPage'));

export default function App() {
  return (
    <DappProvider
      environment={ENVIRONMENT}
      customNetworkConfig={{
        name: 'MetaShipX',
        ...(WALLETCONNECT_PROJECT_ID && {
          walletConnectV2ProjectId: WALLETCONNECT_PROJECT_ID,
        }),
      }}
    >
      <BrowserRouter>
        <Navbar />
        <NotificationModal />
        <SignTransactionsModals />
        <TransactionsToastList />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"             element={<HomePage />} />
            <Route path="/game/:id"     element={<GamePage />} />
            <Route path="/lobby"        element={<LobbyPage />} />
            <Route path="/leaderboard"  element={<LeaderboardPage />} />
            <Route path="/staking"      element={<StakingPage />} />
            <Route path="/marketplace"  element={<MarketplacePage />} />
            <Route path="/spectate/:id" element={<SpectatorPage />} />
            <Route path="/tournaments"  element={<TournamentsPage />} />
            <Route path="/profile"      element={<ProfilePage />} />
            <Route path="/unlock"       element={<UnlockPage />} />
            <Route path="/404"          element={<NotFoundPage />} />
            <Route path="*"             element={<Navigate to="/404" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </DappProvider>
  );
}
