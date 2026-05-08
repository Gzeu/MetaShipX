/**
 * POST /webhook/tx-confirmed
 * Called by an external tx monitor (e.g. MultiversX Notifier or a cron job)
 * after verifying an attack transaction is on-chain.
 *
 * Body: {
 *   gameId: number,
 *   attacker: string,
 *   row: number,
 *   col: number,
 *   result: 'hit' | 'miss' | 'sunk',
 *   gameOver: boolean,
 *   winner?: string,
 *   secret?: string   // shared WEBHOOK_SECRET from .env
 * }
 */
import { Router, Request, Response } from 'express';
import { confirmAttack } from '../services/game.service';

const router = Router();
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? '';

router.post('/tx-confirmed', (req: Request, res: Response) => {
  // Optional secret validation
  if (WEBHOOK_SECRET && req.body?.secret !== WEBHOOK_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { gameId, attacker, row, col, result, gameOver, winner } = req.body ?? {};

  if (
    typeof gameId !== 'number' ||
    typeof attacker !== 'string' ||
    typeof row !== 'number' ||
    typeof col !== 'number' ||
    !['hit', 'miss', 'sunk'].includes(result)
  ) {
    res.status(400).json({ error: 'Invalid payload' });
    return;
  }

  confirmAttack({
    gameId,
    attacker,
    row,
    col,
    result,
    gameOver: Boolean(gameOver),
    winner,
  });

  res.json({ ok: true });
});

export default router;
