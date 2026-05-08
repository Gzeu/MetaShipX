import { Router, Request, Response } from 'express';
import { config } from '../config';
import { ApiResponse, Tournament } from '../types';

const router = Router();

// Simple in-memory cache
interface Cache<T> { data: T; ts: number; }
const cache = new Map<string, Cache<unknown>>();
const TTL = config.cacheTtl * 1000;

function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL) return Promise.resolve(hit.data as T);
  return fn().then(data => { cache.set(key, { data, ts: Date.now() }); return data; });
}

async function queryContract(funcName: string, args: string[] = []): Promise<string[]> {
  const res = await fetch(`${config.mxApiUrl}/vm-values/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scAddress: config.tournamentContract, funcName, args }),
  });
  const json = await res.json();
  return json?.data?.returnData ?? [];
}

function b64toHex(b64: string): string {
  return Buffer.from(b64, 'base64').toString('hex');
}

function parseU64(b64: string): number {
  return parseInt(b64toHex(b64), 16);
}

// GET /api/tournaments
router.get('/', async (_req: Request, res: Response) => {
  try {
    const ids = await cached('tournaments:active', async () => {
      const raw = await queryContract('getActiveTournaments');
      return raw.map(parseU64);
    });

    const tournaments: Tournament[] = await Promise.all(
      ids.map(async (id) => {
        const raw = await queryContract('getTournament', [id.toString(16)]);
        if (!raw.length) return null;
        const statuses = ['Open', 'InProgress', 'Finished', 'Cancelled'] as const;
        return {
          id,
          name: Buffer.from(raw[1] || '', 'base64').toString(),
          entryFee: BigInt('0x' + b64toHex(raw[2] || 'AA')).toString(),
          prizePool: BigInt('0x' + b64toHex(raw[3] || 'AA')).toString(),
          maxPlayers: parseU64(raw[4] || 'AA'),
          currentPlayers: parseU64(raw[5] || 'AA'),
          status: statuses[parseU64(raw[6] || 'AA')] ?? 'Open',
          winner: null,
        } satisfies Tournament;
      }),
    );

    const resp: ApiResponse<Tournament[]> = {
      data: tournaments.filter(Boolean) as Tournament[],
      success: true,
    };
    res.json(resp);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch tournaments' });
  }
});

// GET /api/tournaments/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ success: false, error: 'Invalid id' }); return; }

    const raw = await cached(`tournaments:${id}`, () =>
      queryContract('getTournament', [id.toString(16)])
    );

    if (!raw.length) { res.status(404).json({ success: false, error: 'Not found' }); return; }

    const statuses = ['Open', 'InProgress', 'Finished', 'Cancelled'] as const;
    const tournament: Tournament = {
      id,
      name: Buffer.from(raw[1] || '', 'base64').toString(),
      entryFee: BigInt('0x' + b64toHex(raw[2] || 'AA')).toString(),
      prizePool: BigInt('0x' + b64toHex(raw[3] || 'AA')).toString(),
      maxPlayers: parseU64(raw[4] || 'AA'),
      currentPlayers: parseU64(raw[5] || 'AA'),
      status: statuses[parseU64(raw[6] || 'AA')] ?? 'Open',
      winner: null,
    };

    res.json({ data: tournament, success: true });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch tournament' });
  }
});

export default router;
