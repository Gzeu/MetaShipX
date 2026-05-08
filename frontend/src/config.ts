// ─── Environment helpers ───────────────────────────────────────────────────
const env = (key: string, fallback = ''): string =>
  (import.meta.env[key] as string | undefined) ?? fallback;

// ─── Network ────────────────────────────────────────────────────────────────
export const CHAIN_ID = env('VITE_CHAIN_ID', 'D');           // D=devnet 1=mainnet
export const MX_API_URL = env('VITE_MX_API_URL', 'https://devnet-api.multiversx.com');
export const MX_EXPLORER_URL = env('VITE_MX_EXPLORER_URL', 'https://devnet-explorer.multiversx.com');
export const WALLETCONNECT_PROJECT_ID = env('VITE_WALLETCONNECT_PROJECT_ID', '');

// ─── Contract addresses ────────────────────────────────────────────────────
// After devnet deploy, update .env.devnet and set these via VITE_ env vars
export const BATTLESHIP_CONTRACT = env(
  'VITE_BATTLESHIP_CONTRACT',
  'erd1qqqqqqqqqqqqqpgq_BATTLESHIP_PLACEHOLDER',
);
export const NFT_CONTRACT = env(
  'VITE_NFT_CONTRACT',
  'erd1qqqqqqqqqqqqqpgq_NFT_PLACEHOLDER',
);
export const STAKING_CONTRACT = env(
  'VITE_STAKING_CONTRACT',
  'erd1qqqqqqqqqqqqqpgq_STAKING_PLACEHOLDER',
);
export const MARKETPLACE_CONTRACT = env(
  'VITE_MARKETPLACE_CONTRACT',
  'erd1qqqqqqqqqqqqqpgq_MARKETPLACE_PLACEHOLDER',
);

// ─── Token identifiers (set after registerShipCollection) ──────────────────
export const NFT_COLLECTION_ID = env('VITE_NFT_COLLECTION_ID', 'SHIP-000000');

// ─── Backend ────────────────────────────────────────────────────────────────
export const BACKEND_URL = env('VITE_API_URL', 'http://localhost:4000');
export const WS_URL = env('VITE_WS_URL', 'ws://localhost:4000/ws');

// ─── Game constants ─────────────────────────────────────────────────────────
export const BOARD_SIZE = 10;
export const TURN_TIMEOUT_SECONDS = 120;  // 2 min per turn
export const GAME_TIMEOUT_HOURS = 24;     // withdraw after 24h inactivity

// ─── Staking ────────────────────────────────────────────────────────────────
export const STAKING_APR_DISPLAY = 20; // % — for UI display only, real APR is on-chain

// ─── Explorer helper ────────────────────────────────────────────────────────
export const txUrl = (hash: string) => `${MX_EXPLORER_URL}/transactions/${hash}`;
export const addressUrl = (addr: string) => `${MX_EXPLORER_URL}/accounts/${addr}`;
