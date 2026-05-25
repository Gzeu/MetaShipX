import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import * as session from 'express-session';
import * as Sentry from '@sentry/nestjs';

async function bootstrap() {
  // ✅ #40 Sentry: init BEFORE app creation so all exceptions are captured
  const sentryDsn = process.env.SENTRY_DSN;
  if (process.env.NODE_ENV === 'production' && !sentryDsn) {
    throw new Error('FATAL: SENTRY_DSN must be set in production');
  }
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV ?? 'development',
      release: process.env.npm_package_version,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      integrations: [Sentry.nestIntegration()],
    });
  }

  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // ✅ AUDIT: fail-fast SESSION_SECRET validation at startup
  const sessionSecret = process.env.SESSION_SECRET ?? '';
  if (sessionSecret.length < 32) {
    const msg = 'FATAL: SESSION_SECRET must be at least 32 characters. Set it in .env.local';
    logger.error(msg);
    throw new Error(msg);
  }

  // ✅ AUDIT: fail-fast ADMIN_SECRET validation
  const adminSecret = process.env.ADMIN_SECRET ?? '';
  if (process.env.NODE_ENV === 'production' && adminSecret.length < 16) {
    const msg = 'FATAL: ADMIN_SECRET must be at least 16 characters in production';
    logger.error(msg);
    throw new Error(msg);
  }

  // ✅ AUDIT: fail-fast MX_WEBHOOK_PUBKEY in production
  if (process.env.NODE_ENV === 'production' && !process.env.MX_WEBHOOK_PUBKEY) {
    const msg = 'FATAL: MX_WEBHOOK_PUBKEY must be set in production for webhook signature verification';
    logger.error(msg);
    throw new Error(msg);
  }

  // Raw body for webhook HMAC signature verification
  app.use('/webhook/mx-transactions', bodyParser.json({
    verify: (req: any, _res, buf) => { req.rawBody = buf; },
  }));

  // Session (used by PracticeController for bot game state)
  app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 60 * 60 * 1000, // 1 hour
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      httpOnly: true, // ✅ AUDIT: prevent XSS access to session cookie
    },
  }));

  // ✅ AUDIT: explicit CORS whitelist — no wildcard in production
  const allowedOrigin = process.env.FRONTEND_URL;
  if (process.env.NODE_ENV === 'production' && !allowedOrigin) {
    throw new Error('FATAL: FRONTEND_URL must be set in production (no wildcard CORS allowed)');
  }
  app.enableCors({
    origin: allowedOrigin ?? 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Secret'],
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // ✅ #40 Sentry: exception filter captures all unhandled errors
  if (sentryDsn) {
    const { SentryFilter } = await import('@sentry/nestjs');
    app.useGlobalFilters(new (SentryFilter as any)());
  }

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`MetaShipX backend running on port ${port} [${process.env.NODE_ENV ?? 'development'}]`);
}

bootstrap();
