import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { WebhookModule } from './webhook/webhook.module';
import { EventsModule } from './events/events.module';
import { GameModule } from './game/game.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { HealthModule } from './health/health.module';
import { GameEvent } from './webhook/game-event.entity';

@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // ── Scheduler (LeaderboardService @Cron every 10 min) ────────────────────
    ScheduleModule.forRoot(),

    // ── Rate Limiting: 3 req/s per IP globally ───────────────────────────────
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
    LeaderboardModule,   // GET /leaderboard/top + /leaderboard/rank/:address + @Cron cache refresh
    HealthModule,        // GET /health — Uptime Kuma + Docker healthcheck compatible
  ],
  providers: [
    // Apply ThrottlerGuard globally
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
