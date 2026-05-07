import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { initApp } from '@multiversx/sdk-dapp/out/methods/initApp/initApp';
import { EnvironmentsEnum } from '@multiversx/sdk-dapp/out/types/enums.types';
import App from './App';
import theme from './styles/theme';
import { environment } from './config';
import './index.css';

const env =
  environment.id === 'mainnet'
    ? EnvironmentsEnum.mainnet
    : environment.id === 'testnet'
    ? EnvironmentsEnum.testnet
    : EnvironmentsEnum.devnet;

initApp({
  dAppConfig: {
    environment: env,
    nativeAuth: true,
    providers: {
      walletConnect: {
        walletConnectV2ProjectId: environment.walletConnectV2ProjectId,
      },
    },
  },
}).then(() => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 5 * 60 * 1000,
      },
    },
  });

  const isDevelopment = process.env.NODE_ENV === 'development';

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <ChakraProvider theme={theme}>
            <ColorModeScript initialColorMode={theme.config.initialColorMode} />
            <App />
            {isDevelopment && <ReactQueryDevtools initialIsOpen={false} />}
          </ChakraProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </StrictMode>
  );
});
