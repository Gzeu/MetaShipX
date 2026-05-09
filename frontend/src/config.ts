// MetaShipX — frontend config
// Contract addresses are injected at build time via VITE_ env vars.
// Run deploy-devnet.sh to auto-generate frontend/.env.local.

export const NETWORK = {
  // Supernova devnet: block time 600 ms, same chain ID as legacy devnet
  CHAIN_ID: 'D',
  API_URL: import.meta.env.VITE_NETWORK_URL ?? 'https://devnet-api.multiversx.com',
  EXPLORER_URL: 'https://devnet-explorer.multiversx.com',
  /** Average block time in ms (Supernova: 600 ms) */
  BLOCK_TIME_MS: 600,
  /** Blocks produced per minute at Supernova cadence */
  BLOCKS_PER_MINUTE: 100,
} as const;

export const CONTRACTS = {
  BATTLESHIP_ADDRESS:  import.meta.env.VITE_BATTLESHIP_ADDRESS  ?? '',
  NFT_ADDRESS:         import.meta.env.VITE_NFT_ADDRESS         ?? '',
  STAKING_ADDRESS:     import.meta.env.VITE_STAKING_ADDRESS     ?? '',
  MARKETPLACE_ADDRESS: import.meta.env.VITE_MARKETPLACE_ADDRESS ?? '',
  TOURNAMENT_ADDRESS:  import.meta.env.VITE_TOURNAMENT_ADDRESS  ?? '',
} as const;

export const WALLET_CONNECT_V2_PROJECT_ID =
  import.meta.env.VITE_WC_PROJECT_ID ?? '';

/**
 * Default polling interval for game-state hooks.
 * At Supernova cadence (600 ms/block) this equals ~10 blocks per poll cycle.
 * Individual hooks may override this — e.g. useAttackPolling uses 600 ms
 * for near-instant attack feedback.
 */
export const POLL_INTERVAL_MS = 6_000;

/** Fast polling used by attack-result hooks (1 block cadence). */
export const ATTACK_POLL_INTERVAL_MS = NETWORK.BLOCK_TIME_MS; // 600 ms

// Turn timeout in blocks (must match contract constant TURN_TIMEOUT_BLOCKS = 3_000)
export const TURN_TIMEOUT_BLOCKS = 3_000;
/** Human-readable: at 600 ms/block → 30 minutes */
export const TURN_TIMEOUT_MINUTES =
  (TURN_TIMEOUT_BLOCKS * NETWORK.BLOCK_TIME_MS) / 60_000; // 30

// Staking: APR denominator (matches contract APR_DENOMINATOR = 10_000)
export const APR_DENOMINATOR = 10_000;
