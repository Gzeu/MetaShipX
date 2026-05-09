import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
}

/**
 * Simple in-memory rate limiter (per IP).
 * For production, swap the store with Redis using ioredis.
 */
function createRateLimiter(config: RateLimitConfig) {
  const store = new Map<string, RateLimitEntry>();

  // Cleanup expired entries every minute
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(key);
    }
  }, 60_000);

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    const now = Date.now();
    let entry = store.get(ip);

    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + config.windowMs };
      store.set(ip, entry);
    }

    entry.count++;

    res.setHeader('X-RateLimit-Limit', config.max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.max - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > config.max) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: config.message ?? 'Rate limit exceeded. Please slow down.',
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      });
      return;
    }

    next();
  };
}

/** General API rate limiter: 100 req/min per IP */
export const apiLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 100,
});

/** Attack endpoint limiter: 1 attack per 2 seconds per IP */
export const attackLimiter = createRateLimiter({
  windowMs: 2_000,
  max: 1,
  message: 'Attack too fast. Please wait before attacking again.',
});

/** Game creation limiter: 10 games/min per IP */
export const gameCreateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 10,
  message: 'Too many games created. Wait a moment.',
});
