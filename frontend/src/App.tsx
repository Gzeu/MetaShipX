import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ChakraProvider, Box } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DappProvider } from './contexts/DappProvider';
import { theme } from './styles/theme';
import Layout from './components/Layout';
import HomePage from './pages/Home';
import GamePage from './pages/Game';
import MarketplacePage from './pages/Marketplace';
import StakingPage from './pages/Staking';
import ProfilePage from './pages/Profile';
import NotFoundPage from './pages/NotFound';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
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
                  <Route path="/" element={<HomePage />} />
                  <Route path="/game" element={<GamePage />} />
                  <Route path="/marketplace" element={<MarketplacePage />} />
                  <Route path="/staking" element={<StakingPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="*" element={<NotFoundPage />} />
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
