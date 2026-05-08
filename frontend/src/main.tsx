import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { initApp } from '@multiversx/sdk-dapp/out/methods/initApp/initApp';
import { EnvironmentsEnum } from '@multiversx/sdk-dapp/out/types/enums.types';
import App from './App';
import theme from './styles/theme';
import { environment } from './config';
import './index.css';

const env =
  environment.id === 'mainnet' ? EnvironmentsEnum.mainnet
  : environment.id === 'testnet' ? EnvironmentsEnum.testnet
  : EnvironmentsEnum.devnet;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 5 * 60 * 1000 },
  },
});

// No WalletConnect — auth: xPortal App QR / Web Wallet / DeFi Extension only
initApp({
  dAppConfig: { environment: env, nativeAuth: true },
}).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <ChakraProvider theme={theme}>
            <ColorModeScript initialColorMode="dark" />
            <App />
            {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
          </ChakraProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </StrictMode>
  );
});
