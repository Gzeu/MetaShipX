import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from '../config';

type GameRoom = Map<string, Set<WebSocket>>;
const rooms: GameRoom = new Map();

export function setupWebSocket(server: HttpServer): void {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url ?? '', `http://${req.headers.host}`);
    const gameId = url.searchParams.get('gameId');
    const role = url.searchParams.get('role') ?? 'spectator'; // 'player' | 'spectator'

    if (!gameId) { ws.close(1008, 'gameId required'); return; }

    // Join room
    if (!rooms.has(gameId)) rooms.set(gameId, new Set());
    rooms.get(gameId)!.add(ws);

    ws.send(JSON.stringify({ type: 'connected', gameId, role }));

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        // Broadcast to all in room except sender
        broadcast(gameId, msg, ws);
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      }
    });

    ws.on('close', () => {
      rooms.get(gameId)?.delete(ws);
      if (rooms.get(gameId)?.size === 0) rooms.delete(gameId);
    });

    ws.on('error', () => {
      rooms.get(gameId)?.delete(ws);
    });
  });

  console.log('[ws] WebSocket server ready at /ws');
}

function broadcast(gameId: string, msg: unknown, exclude?: WebSocket): void {
  const room = rooms.get(gameId);
  if (!room) return;
  const payload = JSON.stringify(msg);
  room.forEach((client) => {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

export function broadcastGameUpdate(gameId: string, event: unknown): void {
  broadcast(gameId, event);
}

export function getRoomSize(gameId: string): number {
  return rooms.get(gameId)?.size ?? 0;
}
