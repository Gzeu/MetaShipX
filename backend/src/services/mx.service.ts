import { config } from '../config';

/** Low-level MultiversX API client with retry + timeout */
async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retries = 3,
): Promise<T> {
  let lastError: Error = new Error('Unknown error');
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8_000);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
      return await res.json() as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries - 1) await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function getAccountTransactions(
  address: string,
  size = 25,
): Promise<unknown[]> {
  return fetchWithRetry<unknown[]>(
    `${config.mxApiUrl}/accounts/${address}/transactions?size=${size}&status=success`,
  );
}

export async function getAccountTokens(address: string): Promise<unknown[]> {
  return fetchWithRetry<unknown[]>(
    `${config.mxApiUrl}/accounts/${address}/tokens`,
  );
}

export async function getAccountNfts(address: string): Promise<unknown[]> {
  return fetchWithRetry<unknown[]>(
    `${config.mxApiUrl}/accounts/${address}/nfts?size=100`,
  );
}

export async function vmQuery(
  scAddress: string,
  funcName: string,
  args: string[] = [],
): Promise<string[]> {
  const data = await fetchWithRetry<{ data: { returnData: string[] } }>(
    `${config.mxApiUrl}/vm-values/query`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scAddress, funcName, args }),
    },
  );
  return data?.data?.returnData ?? [];
}

export function b64ToHex(b64: string): string {
  return Buffer.from(b64, 'base64').toString('hex');
}

export function parseU64(b64: string): number {
  const hex = b64ToHex(b64);
  return hex ? parseInt(hex, 16) : 0;
}

export function parseBigUint(b64: string): string {
  const hex = b64ToHex(b64);
  return hex ? BigInt('0x' + hex).toString() : '0';
}
