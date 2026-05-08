import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import type { Tournament, ApiResponse } from '../types';

export const tournamentsRouter = Router();

// In-memory store — swap for DB (Postgres/Supabase) when ready
const store = new Map<string, Tournament>();

function seed(): void {
  const t: Tournament = {
    id: randomUUID(),
    name: 'Alpha Fleet Cup',
    status: 'registration',
    entryFee: '10000000000000000',   // 0.01 EGLD
    prizePool: '0',
    maxPlayers: 8,
    currentPlayers: 0,
    players: [],
    startTime: Date.now() + 3_600_000,
    endTime: null,
    winner: null,
    bracket: [],
  };
  store.set(t.id, t);
}
seed();

// GET /api/tournaments
tournamentsRouter.get('/', (_req: Request, res: Response) => {
  const data = Array.from(store.values());
  const body: ApiResponse<Tournament[]> = { success: true, data, timestamp: Date.now() };
  res.json(body);
});

// GET /api/tournaments/:id
tournamentsRouter.get('/:id', (req: Request, res: Response) => {
  const t = store.get(req.params.id);
  if (!t) { res.status(404).json({ success: false, error: 'Tournament not found', statusCode: 404 }); return; }
  res.json({ success: true, data: t, timestamp: Date.now() } satisfies ApiResponse<Tournament>);
});

// POST /api/tournaments  { name, entryFee, maxPlayers, startTime }
tournamentsRouter.post('/', (req: Request, res: Response) => {
  const { name, entryFee, maxPlayers, startTime } = req.body as Partial<Tournament>;
  if (!name || !entryFee || !maxPlayers || !startTime) {
    res.status(400).json({ success: false, error: 'Missing required fields: name, entryFee, maxPlayers, startTime', statusCode: 400 });
    return;
  }
  const t: Tournament = {
    id: randomUUID(),
    name,
    status: 'upcoming',
    entryFee: String(entryFee),
    prizePool: '0',
    maxPlayers: Number(maxPlayers),
    currentPlayers: 0,
    players: [],
    startTime: Number(startTime),
    endTime: null,
    winner: null,
    bracket: [],
  };
  store.set(t.id, t);
  res.status(201).json({ success: true, data: t, timestamp: Date.now() } satisfies ApiResponse<Tournament>);
});

// POST /api/tournaments/:id/join  { address }
tournamentsRouter.post('/:id/join', (req: Request, res: Response) => {
  const t = store.get(req.params.id);
  if (!t) { res.status(404).json({ success: false, error: 'Tournament not found', statusCode: 404 }); return; }
  if (t.status !== 'registration') {
    res.status(400).json({ success: false, error: 'Tournament not open for registration', statusCode: 400 });
    return;
  }
  const { address } = req.body as { address?: string };
  if (!address) { res.status(400).json({ success: false, error: 'address is required', statusCode: 400 }); return; }
  if (t.players.includes(address)) {
    res.status(409).json({ success: false, error: 'Already registered', statusCode: 409 });
    return;
  }
  if (t.currentPlayers >= t.maxPlayers) {
    res.status(400).json({ success: false, error: 'Tournament is full', statusCode: 400 });
    return;
  }
  t.players.push(address);
  t.currentPlayers += 1;
  if (t.currentPlayers >= t.maxPlayers) t.status = 'active';
  store.set(t.id, t);
  res.json({ success: true, data: t, timestamp: Date.now() } satisfies ApiResponse<Tournament>);
});
