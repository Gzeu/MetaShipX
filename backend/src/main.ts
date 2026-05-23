import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import * as session from 'express-session';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // ── Raw body for HMAC signature verification ────────────────────────────
  app.use('/webhook/mx-transactions', bodyParser.json({
    verify: (req: any, _res, buf) => { req.rawBody = buf; },
  }));

  // ── Session (used by PracticeController for bot game state) ─────────────
  app.use(session({
    secret: process.env.SESSION_SECRET || 'metashipx-dev-secret-change-in-prod',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 60 * 60 * 1000, // 1 hour
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    },
  }));

  // ── CORS ────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  });

  // ── Validation ──────────────────────────────────────────────────────────
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`MetaShipX backend running on port ${port}`);
}

bootstrap();
