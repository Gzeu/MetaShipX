/**
 * MetaShipX — Fail-Fast Config
 * requireEnv() throws in production if a contract address is missing.
 * In dev it logs a visible console.error so you notice immediately.
 * Never use empty-string fallbacks for contract addresses — silent failures
 * cause confusing "tx to erd1000…" errors that are hard to debug.
 */
function requireEnv(key: string): string {
  const val = import.meta.env[key];
  if (!val || val.trim() === '') {
    if (import.meta.env.DEV) {
      console.error(
        `%c⚠️ MetaShipX: Missing env var "${key}"\n` +
        `Contract calls WILL fail. Run deploy-devnet.sh to regenerate frontend/.env.local`,
        'color: orange; font-weight: bold;'
      );
      return '';
    }
    throw new Error(
      `[MetaShipX] Missing required env var: "${key}". ` +
      `Run scripts/mainnet-deploy.sh (mainnet) or deploy-devnet.sh (devnet) first.`
    );
  }
  return val;
}

export const CONTRACTS = {
  BATTLESHIP_ADDRESS:  requireEnv('VITE_BATTLESHIP_ADDRESS'),
  NFT_ADDRESS:         requireEnv('VITE_NFT_ADDRESS'),
  STAKING_ADDRESS:     requireEnv('VITE_STAKING_ADDRESS'),
  MARKETPLACE_ADDRESS: requireEnv('VITE_MARKETPLACE_ADDRESS'),
  TOURNAMENT_ADDRESS:  requireEnv('VITE_TOURNAMENT_ADDRESS'),
} as const;

export const CHAIN_CONFIG = {
  id:       (import.meta.env.VITE_ENV as 'devnet' | 'testnet' | 'mainnet') ?? 'devnet',
  proxyUrl: import.meta.env.VITE_API_URL ?? 'https://devnet-api.multiversx.com',
} as const;

export const APP_CONFIG = {
  WS_URL:        import.meta.env.VITE_WS_URL  ?? 'ws://localhost:3001',
  BACKEND_URL:   import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001',
  PRACTICE_URL:  import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001',
} as const;
