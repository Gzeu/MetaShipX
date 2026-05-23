import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { WebhookModule } from './webhook/webhook.module';
import { EventsModule } from './events/events.module';
import { GameModule } from './game/game.module';
import { GameEvent } from './webhook/game-event.entity';

@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // ── Rate Limiting: 3 req/s per IP globally (attack endpoint adds own guard) ──
    ThrottlerModule.forRoot([{
      name: 'global',
      ttl: 1000,
      limit: 3,
    }]),

    // ── Database ────────────────────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        url: cfg.get<string>('DATABASE_URL'),
        entities: [GameEvent],
        synchronize: cfg.get('NODE_ENV') !== 'production',
        ssl: cfg.get('NODE_ENV') === 'production'
          ? { rejectUnauthorized: false }
          : false,
      }),
    }),

    // ── Feature modules ─────────────────────────────────────────────────────
    EventsModule,
    WebhookModule,
    GameModule,
  ],
  providers: [
    // Apply ThrottlerGuard globally — individual controllers can override with @SkipThrottle
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
