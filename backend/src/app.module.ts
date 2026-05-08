import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookModule } from './webhook/webhook.module';
import { EventsModule } from './events/events.module';
import { GameEvent } from './webhook/game-event.entity';

@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

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
  ],
})
export class AppModule {}
