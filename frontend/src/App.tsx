import { Routes, Route } from 'react-router-dom';
import { ChakraProvider, Box, ColorModeScript } from '@chakra-ui/react';
import { theme } from './styles/theme';
import Layout from './components/Layout';

// Pages
import HomePage        from './pages/Home';
import MarketplacePage from './pages/Marketplace';
import ProfilePage     from './pages/Profile';
import LeaderboardPage from './pages/Leaderboard';
import NotFoundPage    from './pages/NotFound';
import LobbyPage       from './pages/LobbyPage/LobbyPage';
import { GamePage }    from './pages/GamePage/GamePage';
import TournamentPage  from './pages/TournamentPage/TournamentPage';
import StakingPage     from './pages/StakingPage/StakingPage';
import TournamentsPage from './pages/Tournaments';
import UnlockPage      from './pages/UnlockPage/UnlockPage';

function App() {
  return (
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config?.initialColorMode ?? 'dark'} />
      <Box minH="100vh" bg="gray.900">
        <Layout>
          <Routes>
            {/* Public */}
            <Route path="/"              element={<HomePage />} />
            <Route path="/unlock"        element={<UnlockPage />} />
            <Route path="/leaderboard"   element={<LeaderboardPage />} />

            {/* Game */}
            <Route path="/lobby"         element={<LobbyPage />} />
            <Route path="/game/:gameId"  element={<GamePage />} />

            {/* Tournaments */}
            <Route path="/tournaments"     element={<TournamentsPage />} />
            <Route path="/tournaments/:id" element={<TournamentPage />} />

            {/* Staking & NFT */}
            <Route path="/staking"       element={<StakingPage />} />
            <Route path="/marketplace"   element={<MarketplacePage />} />

            {/* Profile */}
            <Route path="/profile"       element={<ProfilePage />} />

            {/* 404 */}
            <Route path="*"             element={<NotFoundPage />} />
          </Routes>
        </Layout>
      </Box>
    </ChakraProvider>
  );
}

export default App;
