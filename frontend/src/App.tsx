import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import theme from './styles/theme';
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard/AuthGuard';
import PageLoader from './components/PageLoader/PageLoader';

// Lazy-loaded pages — each chunk loads independently
const HomePage        = lazy(() => import('./pages/Home/index'));
const UnlockPage      = lazy(() => import('./pages/UnlockPage/UnlockPage'));
const LobbyPage       = lazy(() => import('./pages/LobbyPage/LobbyPage'));
const GamePage        = lazy(() => import('./pages/Game/GamePage'));
const TournamentsPage = lazy(() => import('./pages/Tournaments/index'));
const TournamentPage  = lazy(() => import('./pages/TournamentPage/TournamentPage'));
const StakingPage     = lazy(() => import('./pages/Staking/StakingPage'));
const MarketplacePage = lazy(() => import('./pages/Marketplace/MarketplacePage'));
const ProfilePage     = lazy(() => import('./pages/Profile/index'));
const LeaderboardPage = lazy(() => import('./pages/Leaderboard/index'));
const SpectatorPage   = lazy(() => import('./pages/Spectator/SpectatorPage'));
const NotFoundPage    = lazy(() => import('./pages/NotFound/index'));

export default function App() {
  return (
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <Layout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/"                 element={<HomePage />} />
            <Route path="/unlock"           element={<UnlockPage />} />
            <Route path="/leaderboard"      element={<LeaderboardPage />} />
            <Route path="/spectate/:gameId" element={<SpectatorPage />} />

            {/* Protected */}
            <Route path="/lobby"           element={<AuthGuard><LobbyPage /></AuthGuard>} />
            <Route path="/game/:gameId"    element={<AuthGuard><GamePage /></AuthGuard>} />
            <Route path="/tournaments"     element={<AuthGuard><TournamentsPage /></AuthGuard>} />
            <Route path="/tournaments/:id" element={<AuthGuard><TournamentPage /></AuthGuard>} />
            <Route path="/staking"         element={<AuthGuard><StakingPage /></AuthGuard>} />
            <Route path="/marketplace"     element={<AuthGuard><MarketplacePage /></AuthGuard>} />
            <Route path="/profile"         element={<AuthGuard><ProfilePage /></AuthGuard>} />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </Layout>
    </ChakraProvider>
  );
}
