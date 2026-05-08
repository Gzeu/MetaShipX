import { useEffect, useRef, useCallback, useState } from 'react';
import { BACKEND_URL } from '../config';

export type WsStatus = 'connecting' | 'open' | 'closed' | 'error';

export interface WsMessage {
  type: string;
  gameId?: string;
  payload?: unknown;
  timestamp?: number;
}

interface UseWebSocketOptions {
  gameId: string;
  role?: 'player' | 'spectator';
  onMessage?: (msg: WsMessage) => void;
  enabled?: boolean;
}

export function useWebSocket({ gameId, role = 'spectator', onMessage, enabled = true }: UseWebSocketOptions) {
  const ws = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<WsStatus>('closed');
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const wsUrl = BACKEND_URL.replace(/^http/, 'ws') + `/ws?gameId=${gameId}&role=${role}`;

  const connect = useCallback(() => {
    if (!enabled || !gameId) return;
    if (ws.current?.readyState === WebSocket.OPEN) return;

    setStatus('connecting');
    const socket = new WebSocket(wsUrl);
    ws.current = socket;

    socket.onopen = () => {
      if (!mountedRef.current) return;
      setStatus('open');
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };

    socket.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as WsMessage;
        onMessage?.(msg);
      } catch { /* ignore malformed frames */ }
    };

    socket.onclose = () => {
      if (!mountedRef.current) return;
      setStatus('closed');
      // Auto-reconnect after 3s
      reconnectTimer.current = setTimeout(connect, 3_000);
    };

    socket.onerror = () => {
      if (!mountedRef.current) return;
      setStatus('error');
      socket.close();
    };
  }, [wsUrl, enabled, gameId, onMessage]);

  const send = useCallback((msg: WsMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ ...msg, timestamp: Date.now() }));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    ws.current?.close();
    ws.current = null;
    setStatus('closed');
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  return { status, send, disconnect, reconnect: connect };
}
