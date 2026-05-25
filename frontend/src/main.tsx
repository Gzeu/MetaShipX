import { StrictMode }              from 'react';
import { createRoot }              from 'react-dom/client';
import { BrowserRouter }           from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools }      from '@tanstack/react-query-devtools';
import { initApp }                 from '@multiversx/sdk-dapp/out/methods/initApp/initApp';
import { EnvironmentsEnum }        from '@multiversx/sdk-dapp/out/types/enums.types';
import * as Sentry                 from '@sentry/react';
import App                         from './App';
import { environment }             from './config';
import './index.css';
import './styles/mobile.css';

// ✅ #40 Sentry: init before any React rendering
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
        // Only record sessions with errors
        replaysOnErrorSampleRate: 1.0,
        replaysSessionSampleRate: 0.05,
      }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    // Ignore expected wallet / chain errors
    ignoreErrors: [
      'Transaction cancelled',
      'User rejected',
      'Request rejected',
      'Network Error',
    ],
  });
}

const env =
  environment.id === 'mainnet' ? EnvironmentsEnum.mainnet
  : environment.id === 'testnet' ? EnvironmentsEnum.testnet
  : EnvironmentsEnum.devnet;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 5 * 60 * 1000 },
  },
});

// No WalletConnect — auth via xPortal QR / Web Wallet / DeFi Extension only
initApp({ dAppConfig: { environment: env, nativeAuth: true } }).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <App />
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </BrowserRouter>
    </StrictMode>
  );
});
