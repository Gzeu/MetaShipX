import { Routes, Route }      from 'react-router-dom';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import theme                  from './styles/theme';
import Layout                 from './components/Layout';
import AuthGuard              from './components/AuthGuard/AuthGuard';

// Pages
import HomePage        from './pages/Home';
import UnlockPage      from './pages/UnlockPage/UnlockPage';
import LobbyPage       from './pages/LobbyPage/LobbyPage';
import { GamePage }    from './pages/GamePage/GamePage';
import TournamentsPage from './pages/Tournaments';
import TournamentPage  from './pages/TournamentPage/TournamentPage';
import StakingPage     from './pages/StakingPage/StakingPage';
import MarketplacePage from './pages/Marketplace';
import ProfilePage     from './pages/Profile';
import LeaderboardPage from './pages/Leaderboard';
import NotFoundPage    from './pages/NotFound';

export default function App() {
  return (
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <Layout>
        <Routes>
          {/* Public */}
          <Route path="/"            element={<HomePage />} />
          <Route path="/unlock"      element={<UnlockPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />

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
      </Layout>
    </ChakraProvider>
  );
}
