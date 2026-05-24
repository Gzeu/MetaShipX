import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import * as session from 'express-session';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // ── AUDIT: Fail-fast on missing or weak SESSION_SECRET ──────────────────
  const sessionSecret = process.env.SESSION_SECRET ?? '';
  if (sessionSecret.length < 32) {
    throw new Error(
      '[SECURITY] SESSION_SECRET must be at least 32 characters.\n' +
      'Set it in .env.local:\n' +
      '  SESSION_SECRET=' + Array.from({ length: 32 }, () =>
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
          .charAt(Math.floor(Math.random() * 62))
      ).join('') + '  (example — generate your own!)'
    );
  }

  // ── AUDIT: Warn if running as root in production ────────────────────────
  if (process.env.NODE_ENV === 'production' && process.getuid && process.getuid() === 0) {
    logger.warn('[SECURITY] Running as root in production is not recommended. Use user: node in Docker.');
  }

  // ── Raw body for HMAC/ed25519 signature verification ────────────────────
  app.use('/webhook/mx-transactions', bodyParser.json({
    verify: (req: any, _res, buf) => { req.rawBody = buf; },
  }));

  // ── Session (used by PracticeController for bot game state) ─────────────
  app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 60 * 60 * 1000, // 1 hour
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      httpOnly: true, // AUDIT: prevent XSS cookie theft
    },
  }));

  // ── AUDIT: CORS explicit whitelist — no wildcard '*' in production ───────
  // Set ALLOWED_ORIGINS=https://metashipx.com,https://www.metashipx.com in .env
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length > 0
      ? (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error(`CORS: origin '${origin}' not in ALLOWED_ORIGINS`));
          }
        }
      : process.env.NODE_ENV !== 'production'
        ? '*' // dev only fallback
        : false,
    credentials: true,
  });

  // ── Validation ──────────────────────────────────────────────────────────
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`MetaShipX backend running on port ${port}`);
}

bootstrap();
