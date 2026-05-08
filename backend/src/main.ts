import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // ── Raw body for HMAC signature verification ────────────────────────────
  app.use('/webhook/mx-transactions', bodyParser.json({
    verify: (req: any, _res, buf) => { req.rawBody = buf; },
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
