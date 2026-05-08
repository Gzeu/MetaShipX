import { Router, Request, Response } from 'express';
import { config } from '../config';
import { vmQuery, parseU64, parseBigUint } from '../services/mx.service';
import { validateAddress } from '../middleware/validate';
import { defaultLimiter } from '../middleware/rateLimiter';
import type { GlobalStats, PlayerStats, ApiResponse } from '../types';

const router = Router();
interface Cache<T> { data: T; ts: number; }
const _cache = new Map<string, Cache<unknown>>();
const TTL = config.cacheTtl * 1000;
function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.ts < TTL) return Promise.resolve(hit.data as T);
  return fn().then(data => { _cache.set(key, { data, ts: Date.now() }); return data; });
}

// GET /api/stats/global
router.get('/global', defaultLimiter, async (_req: Request, res: Response) => {
  try {
    const stats = await cached('stats:global', async () => {
      const [gamesRaw, playersRaw, volumeRaw] = await Promise.all([
        vmQuery(config.battleshipContract, 'getTotalGames'),
        vmQuery(config.battleshipContract, 'getTotalPlayers'),
        vmQuery(config.battleshipContract, 'getTotalVolume'),
      ]);
      return {
        totalGames: parseU64(gamesRaw[0] ?? ''),
        totalPlayers: parseU64(playersRaw[0] ?? ''),
        totalVolumeEgld: parseBigUint(volumeRaw[0] ?? ''),
      } satisfies GlobalStats;
    });
    res.json({ data: stats, success: true } satisfies ApiResponse<GlobalStats>);
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch global stats' });
  }
});

// GET /api/stats/:address
router.get('/:address', defaultLimiter, validateAddress, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const stats = await cached(`stats:${address}`, async () => {
      const raw = await vmQuery(
        config.battleshipContract,
        'getPlayerStats',
        [Buffer.from(address, 'ascii').toString('hex')],
      );
      return {
        address,
        wins: parseU64(raw[0] ?? ''),
        losses: parseU64(raw[1] ?? ''),
        totalGames: parseU64(raw[2] ?? ''),
        totalEarned: parseBigUint(raw[3] ?? ''),
        winRate: parseU64(raw[0] ?? '') > 0
          ? Math.round((parseU64(raw[0] ?? '') / Math.max(1, parseU64(raw[2] ?? ''))) * 100)
          : 0,
      } satisfies PlayerStats;
    });
    res.json({ data: stats, success: true } satisfies ApiResponse<PlayerStats>);
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch player stats' });
  }
});

export default router;
