// MetaShipX — frontend config
// Update CONTRACTS addresses after each deploy

export const NETWORK = {
  // Supernova devnet: block time 600 ms, same chain ID as pre-Supernova devnet
  CHAIN_ID: 'D',
  API_URL: 'https://devnet-api.multiversx.com',
  EXPLORER_URL: 'https://devnet-explorer.multiversx.com',
  // Average block time in ms — update to 600 after Supernova mainnet
  BLOCK_TIME_MS: 600,
  // Blocks per minute at Supernova cadence
  BLOCKS_PER_MINUTE: 100,
} as const;

export const CONTRACTS = {
  BATTLESHIP_ADDRESS: import.meta.env.VITE_BATTLESHIP_ADDRESS ?? '',
  NFT_ADDRESS: import.meta.env.VITE_NFT_ADDRESS ?? '',
  STAKING_ADDRESS: import.meta.env.VITE_STAKING_ADDRESS ?? '',
  TOURNAMENT_ADDRESS: import.meta.env.VITE_TOURNAMENT_ADDRESS ?? '',
  MARKETPLACE_ADDRESS: import.meta.env.VITE_MARKETPLACE_ADDRESS ?? '',
} as const;

export const WALLET_CONNECT_V2_PROJECT_ID =
  import.meta.env.VITE_WC_PROJECT_ID ?? '';

// Supernova-aware polling: at 600 ms/block, poll every 6 s = ~10 blocks
export const POLL_INTERVAL_MS = 6_000;

// Turn timeout in blocks (must match contract TURN_TIMEOUT_BLOCKS = 3_000)
export const TURN_TIMEOUT_BLOCKS = 3_000;
// Human-readable: at 600 ms/block, 3_000 blocks = 30 minutes
export const TURN_TIMEOUT_MINUTES = (TURN_TIMEOUT_BLOCKS * NETWORK.BLOCK_TIME_MS) / 60_000;

// Staking: APR denominator (matches contract APR_DENOMINATOR = 10_000)
export const APR_DENOMINATOR = 10_000;
