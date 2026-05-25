/**
 * Sentry initialization — import in main.tsx before rendering.
 * Install: npm install @sentry/react
 */
import * as Sentry from '@sentry/react';
import { browserTracingIntegration, replayIntegration } from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    console.warn('[Sentry] VITE_SENTRY_DSN not set — error tracking disabled');
    return;
  }
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: `metashipx-frontend@${import.meta.env.VITE_APP_VERSION ?? '1.0.0'}`,
    integrations: [
      browserTracingIntegration(),
      replayIntegration({ maskAllText: false, blockAllMedia: false }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    tracePropagationTargets: [
      'localhost',
      /^https:\/\/api\.metashipx\.com/,
    ],
  });
  console.log('[Sentry] Frontend error tracking initialized');
}
