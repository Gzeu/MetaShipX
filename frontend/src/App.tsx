import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ChakraProvider, Box } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DappProvider } from './contexts/DappProvider';
import { theme } from './styles/theme';
import Layout from './components/Layout';

// Pages
import HomePage        from './pages/Home';
import MarketplacePage from './pages/Marketplace';
import ProfilePage     from './pages/Profile';
import LeaderboardPage from './pages/Leaderboard';
import NotFoundPage    from './pages/NotFound';

// New pages
import LobbyPage       from './pages/LobbyPage/LobbyPage';
import { GamePage }    from './pages/GamePage/GamePage';
import TournamentPage  from './pages/TournamentPage/TournamentPage';
import StakingPage     from './pages/StakingPage/StakingPage';

// Tournament list (index page)
import TournamentsPage from './pages/Tournaments';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

function App() {
  return (
    <ChakraProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <DappProvider>
          <Router>
            <Box minH="100vh" bg="gray.50">
              <Layout>
                <Routes>
                  {/* Core */}
                  <Route path="/"                  element={<HomePage />} />
                  <Route path="/lobby"             element={<LobbyPage />} />
                  <Route path="/game/:gameId"      element={<GamePage />} />

                  {/* Tournaments */}
                  <Route path="/tournaments"       element={<TournamentsPage />} />
                  <Route path="/tournaments/:id"   element={<TournamentPage />} />

                  {/* Staking */}
                  <Route path="/staking"           element={<StakingPage />} />

                  {/* Other */}
                  <Route path="/marketplace"       element={<MarketplacePage />} />
                  <Route path="/profile"           element={<ProfilePage />} />
                  <Route path="/leaderboard"       element={<LeaderboardPage />} />

                  {/* 404 */}
                  <Route path="*"                  element={<NotFoundPage />} />
                </Routes>
              </Layout>
            </Box>
          </Router>
        </DappProvider>
      </QueryClientProvider>
    </ChakraProvider>
  );
}

export default App;
