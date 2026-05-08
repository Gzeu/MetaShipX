import { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '../config';

interface QueryOptions {
  scAddress: string;
  funcName: string;
  args?: string[];
  enabled?: boolean;
  refetchInterval?: number; // ms, 0 = disabled
}

interface QueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

async function vmQuery(scAddress: string, funcName: string, args: string[] = []): Promise<string[]> {
  const res = await fetch(`${API_URL}/vm-values/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scAddress, funcName, args }),
  });
  if (!res.ok) throw new Error(`VM query failed: ${res.status}`);
  const json = await res.json();
  return json?.data?.returnData ?? [];
}

/**
 * Generic hook for reading from any MultiversX smart contract.
 * Usage:
 *   const { data, loading } = useContractRead({
 *     scAddress: BATTLESHIP_CONTRACT,
 *     funcName: 'getGameState',
 *     args: [gameIdHex],
 *     refetchInterval: 5000,
 *   }, (raw) => parseGameState(raw));
 */
export function useContractRead<T>(
  options: QueryOptions,
  parser: (raw: string[]) => T,
): QueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch_ = useCallback(async () => {
    if (options.enabled === false) return;
    setLoading(true);
    setError(null);
    try {
      const raw = await vmQuery(options.scAddress, options.funcName, options.args ?? []);
      setData(parser(raw));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [options.scAddress, options.funcName, JSON.stringify(options.args), options.enabled]);

  useEffect(() => {
    fetch_();
    if (options.refetchInterval && options.refetchInterval > 0) {
      intervalRef.current = setInterval(fetch_, options.refetchInterval);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetch_, options.refetchInterval]);

  return { data, loading, error, refetch: fetch_ };
}
