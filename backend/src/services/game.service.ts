/**
 * GameService — lightweight wrapper around on-chain state queries.
 * After confirming an attack result, broadcasts via WebSocket so all
 * spectators and the opponent receive the update in real-time.
 */
import { broadcastGameUpdate } from '../routes/websocket';

export interface AttackPayload {
  gameId: number;
  attacker: string;
  row: number;
  col: number;
  result: 'hit' | 'miss' | 'sunk';
  gameOver: boolean;
  winner?: string;
}

/**
 * Called after the backend verifies an attack tx was confirmed on-chain.
 * Broadcasts the attack result to all WebSocket subscribers in the game room.
 *
 * Usage example (from your tx-confirmation webhook or polling job):
 *   gameService.confirmAttack({
 *     gameId: 42,
 *     attacker: 'erd1...',
 *     row: 3, col: 7,
 *     result: 'hit',
 *     gameOver: false,
 *   });
 */
export function confirmAttack(payload: AttackPayload): void {
  broadcastGameUpdate(String(payload.gameId), {
    type: 'attack',
    gameId: payload.gameId,
    attacker: payload.attacker,
    row: payload.row,
    col: payload.col,
    result: payload.result,
    gameOver: payload.gameOver,
    winner: payload.winner ?? null,
    ts: Date.now(),
  });
}

/**
 * Broadcasts a generic game state update (e.g. player joined, ships placed).
 */
export function broadcastStateChange(
  gameId: number,
  event: Record<string, unknown>
): void {
  broadcastGameUpdate(String(gameId), { ...event, gameId, ts: Date.now() });
}

export const gameService = { confirmAttack, broadcastStateChange };
