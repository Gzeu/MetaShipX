import { ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * MetaShipX Rate Limiting Configuration
 * - Global: 3 req/s per IP (short window)
 * - Attack endpoint: max 1 attack / 2s per player (handled via custom guard)
 */
export const throttlerConfig: ThrottlerModuleOptions = [
  {
    name: 'short',
    ttl: 1000,   // 1 second window
    limit: 3,    // max 3 requests per IP
  },
  {
    name: 'medium',
    ttl: 60_000,  // 1 minute window
    limit: 100,   // max 100 requests per IP per minute
  },
];

/**
 * Per-player attack throttle: 1 attack every 2 seconds
 * Applied via @Throttle({ attack: { ttl: 2000, limit: 1 } }) on attack endpoint
 */
export const ATTACK_THROTTLE = { ttl: 2000, limit: 1 };
