import { Router, Request, Response } from 'express';
import { ProxyNetworkProvider } from '@multiversx/sdk-network-providers';
import { SmartContract, ContractFunction, Address } from '@multiversx/sdk-core';
import { config } from '../config';
import type { LeaderboardEntry, ApiResponse } from '../types';

export const leaderboardRouter = Router();

interface CacheEntry { data: LeaderboardEntry[]; ts: number; }
let cache: CacheEntry | null = null;

async function fetchOnChain(limit: number): Promise<LeaderboardEntry[]> {
  const provider = new ProxyNetworkProvider(config.MX_API_URL, { timeout: 10_000 });
  const contract = new SmartContract({ address: new Address(config.BATTLESHIP_CONTRACT) });

  const query = contract.createQuery({
    func: new ContractFunction('getLeaderboard'),
    args: [],
  });

  const response = await provider.queryContract(query);

  return response.returnData
    .slice(0, limit)
    .map((encoded: string, idx: number) => {
      try {
        const buf = Buffer.from(encoded, 'base64');
        // Layout: 32 bytes pubkey | 8 bytes wins (u64 BE) | 8 bytes losses | 16 bytes wagered (u128 BE) | 16 bytes earned
        const addressBytes = buf.subarray(0, 32);
        const addressHex = Address.fromBuffer(addressBytes).toBech32();
        const wins    = Number(buf.readBigUInt64BE(32));
        const losses  = Number(buf.readBigUInt64BE(40));
        const wagered = buf.readBigUInt64BE(48).toString();
        const earned  = buf.readBigUInt64BE(56).toString();
        const total   = wins + losses;
        return {
          rank: idx + 1,
          address: addressHex,
          wins,
          losses,
          totalGames: total,
          winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
          totalWagered: wagered,
          totalEarned: earned,
        } satisfies LeaderboardEntry;
      } catch {
        return null;
      }
    })
    .filter((e): e is LeaderboardEntry => e !== null);
}

// GET /api/leaderboard?limit=50
leaderboardRouter.get('/', async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10), 100);

  const now = Date.now();
  if (cache && now - cache.ts < config.LEADERBOARD_CACHE_TTL) {
    const body: ApiResponse<LeaderboardEntry[]> = {
      success: true,
      data: cache.data.slice(0, limit),
      timestamp: now,
      cached: true,
    };
    res.json(body);
    return;
  }

  try {
    const data = await fetchOnChain(limit);
    cache = { data, ts: now };
    const body: ApiResponse<LeaderboardEntry[]> = { success: true, data, timestamp: now, cached: false };
    res.json(body);
  } catch (err) {
    // Return stale cache if available
    if (cache) {
      res.json({ success: true, data: cache.data.slice(0, limit), timestamp: now, cached: true });
      return;
    }
    const msg = err instanceof Error ? err.message : 'Failed to fetch leaderboard';
    res.status(502).json({ success: false, error: msg, statusCode: 502 });
  }
});
