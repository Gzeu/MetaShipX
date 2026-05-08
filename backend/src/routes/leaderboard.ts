import { Router, Request, Response } from 'express';
import { config } from '../config';
import { vmQuery, parseU64, b64ToHex } from '../services/mx.service';
import { validatePagination } from '../middleware/validate';
import { defaultLimiter } from '../middleware/rateLimiter';
import type { LeaderboardEntry, ApiResponse } from '../types';

const router = Router();
interface Cache<T> { data: T; ts: number; }
const _cache = new Map<string, Cache<unknown>>();
const TTL = config.cacheTtl * 1000;

function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.ts < TTL) return Promise.resolve(hit.data as T);
  return fn().then(data => { _cache.set(key, { data, ts: Date.now() }); return data; });
}

// GET /api/leaderboard?page=1&size=20
router.get('/', defaultLimiter, validatePagination, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const size = Math.min(100, Math.max(1, Number(req.query.size ?? 20)));

    const entries = await cached(`leaderboard:${page}:${size}`, async () => {
      // Query top players from contract
      const raw = await vmQuery(
        config.battleshipContract,
        'getLeaderboard',
        [((page - 1) * size).toString(16), size.toString(16)],
      );

      const results: LeaderboardEntry[] = [];
      for (let i = 0; i < raw.length; i += 4) {
        const address = raw[i] ? Buffer.from(raw[i], 'base64').toString('hex') : null;
        if (!address) continue;
        results.push({
          rank: (page - 1) * size + results.length + 1,
          address: 'erd1' + address,
          wins: parseU64(raw[i + 1] ?? ''),
          losses: parseU64(raw[i + 2] ?? ''),
          totalEarned: BigInt('0x' + (b64ToHex(raw[i + 3] ?? '') || '0')).toString(),
        });
      }
      return results;
    });

    const resp: ApiResponse<LeaderboardEntry[]> = { data: entries, success: true };
    res.json(resp);
  } catch (err) {
    console.error('[leaderboard]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

export default router;
