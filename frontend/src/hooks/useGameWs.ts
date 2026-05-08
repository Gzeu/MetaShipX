/**
 * useGameWs — connects to the backend WebSocket for a game room.
 * Delivers enemy attack events to the caller via onAttack callback.
 * Reconnects automatically on disconnect (up to 5 retries).
 */
import { useEffect, useRef } from 'react';
import { WS_URL } from '../config';
import type { AttackResult } from '../components/GameBoard/GameBoard';

interface UseGameWsOptions {
  gameId: number;
  myAddress: string;
  onAttack: (row: number, col: number, result: AttackResult['result']) => void;
}

export function useGameWs({ gameId, myAddress, onAttack }: UseGameWsOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const onAttackRef = useRef(onAttack);
  onAttackRef.current = onAttack;

  useEffect(() => {
    if (!gameId || !myAddress) return;

    function connect() {
      const url = `${WS_URL}?gameId=${gameId}&role=player`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'attack' && msg.attacker !== myAddress) {
            onAttackRef.current(msg.row, msg.col, msg.result);
          }
        } catch { /* ignore malformed */ }
      };

      ws.onclose = () => {
        if (retriesRef.current < 5) {
          retriesRef.current++;
          setTimeout(connect, 2000 * retriesRef.current);
        }
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      retriesRef.current = 99; // disable reconnect on unmount
      wsRef.current?.close();
    };
  }, [gameId, myAddress]);
}
