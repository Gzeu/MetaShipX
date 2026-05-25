/**
 * Sentry initialization — import this FIRST in main.ts before any other import.
 * Install: npm install @sentry/nestjs @sentry/profiling-node
 */
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.warn('[Sentry] SENTRY_DSN not set — error tracking disabled');
    return;
  }
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: `metashipx-backend@${process.env.npm_package_version ?? '1.0.0'}`,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: 0.1,
    integrations: [nodeProfilingIntegration()],
  });
  console.log('[Sentry] Backend error tracking initialized');
}
