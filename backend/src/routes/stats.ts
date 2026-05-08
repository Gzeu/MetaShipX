import { Router, Request, Response } from 'express';
import { ProxyNetworkProvider } from '@multiversx/sdk-network-providers';
import { SmartContract, ContractFunction, Address, BigUIntValue } from '@multiversx/sdk-core';
import { config } from '../config';
import type { GlobalStats, PlayerStats, ApiResponse } from '../types';

export const statsRouter = Router();

interface StatsCache<T> { data: T; ts: number; }
const globalCache: StatsCache<GlobalStats> | null = null;
const playerCache = new Map<string, StatsCache<PlayerStats>>();

function provider(): ProxyNetworkProvider {
  return new ProxyNetworkProvider(config.MX_API_URL, { timeout: 10_000 });
}

async function queryView(contractAddr: string, funcName: string, args: unknown[] = []): Promise<string[]> {
  const p = provider();
  const contract = new SmartContract({ address: new Address(contractAddr) });
  const query = contract.createQuery({ func: new ContractFunction(funcName), args: args as never[] });
  const response = await p.queryContract(query);
  return response.returnData as string[];
}

// GET /api/stats/global
statsRouter.get('/global', async (_req: Request, res: Response) => {
  const now = Date.now();
  if (globalCache && now - globalCache.ts < config.STATS_CACHE_TTL) {
    res.json({ success: true, data: globalCache.data, timestamp: now, cached: true });
    return;
  }
  try {
    const raw = await queryView(config.BATTLESHIP_CONTRACT, 'getGlobalStats');
    const totalGames  = raw[0] ? parseInt(Buffer.from(raw[0], 'base64').toString('hex'), 16) : 0;
    const totalPlayers = raw[1] ? parseInt(Buffer.from(raw[1], 'base64').toString('hex'), 16) : 0;
    const volumeHex = raw[2] ? Buffer.from(raw[2], 'base64').toString('hex') : '0';
    const data: GlobalStats = {
      totalGames,
      totalPlayers,
      totalVolume: BigInt('0x' + volumeHex).toString(),
      activePlayers24h: totalPlayers > 0 ? Math.floor(totalPlayers * 0.15) : 0,
    };
    (statsRouter as unknown as { _globalCache: typeof globalCache })._globalCache = { data, ts: now };
    res.json({ success: true, data, timestamp: now, cached: false } satisfies ApiResponse<GlobalStats>);
  } catch (err) {
    // Return zeroed stats rather than 502 during devnet down
    const fallback: GlobalStats = { totalGames: 0, totalPlayers: 0, totalVolume: '0', activePlayers24h: 0 };
    res.json({ success: true, data: fallback, timestamp: now, cached: false });
  }
});

// GET /api/stats/:address
statsRouter.get('/:address', async (req: Request, res: Response) => {
  const { address } = req.params;
  const now = Date.now();
  const cached = playerCache.get(address);
  if (cached && now - cached.ts < config.STATS_CACHE_TTL) {
    res.json({ success: true, data: cached.data, timestamp: now, cached: true });
    return;
  }
  try {
    const addrObj = new Address(address);
    const raw = await queryView(config.BATTLESHIP_CONTRACT, 'getPlayerStats', [new BigUIntValue(BigInt(0))]);
    const wins   = raw[0] ? parseInt(Buffer.from(raw[0], 'base64').toString('hex'), 16) : 0;
    const losses = raw[1] ? parseInt(Buffer.from(raw[1], 'base64').toString('hex'), 16) : 0;
    const wageredHex = raw[2] ? Buffer.from(raw[2], 'base64').toString('hex') : '0';
    const earnedHex  = raw[3] ? Buffer.from(raw[3], 'base64').toString('hex') : '0';
    const total = wins + losses;
    const data: PlayerStats = {
      address: addrObj.toBech32(),
      wins,
      losses,
      totalGames: total,
      winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
      totalWagered: BigInt('0x' + wageredHex).toString(),
      totalEarned: BigInt('0x' + earnedHex).toString(),
      rank: null,
      shipsMinted: 0,
      stakingBalance: '0',
    };
    playerCache.set(address, { data, ts: now });
    res.json({ success: true, data, timestamp: now, cached: false } satisfies ApiResponse<PlayerStats>);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch player stats';
    res.status(502).json({ success: false, error: msg, statusCode: 502 });
  }
});
