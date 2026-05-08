// ─── Contract addresses ────────────────────────────────────────────────────
export const BATTLESHIP_CONTRACT_ADDRESS: string =
  process.env.REACT_APP_BATTLESHIP_ADDRESS ?? 'erd1qqqqqqqqqqqqqpgq_BATTLESHIP_PLACEHOLDER';

export const NFT_CONTRACT_ADDRESS: string =
  process.env.REACT_APP_NFT_ADDRESS ?? 'erd1qqqqqqqqqqqqqpgq_NFT_PLACEHOLDER';

export const STAKING_CONTRACT_ADDRESS: string =
  process.env.REACT_APP_STAKING_ADDRESS ?? 'erd1qqqqqqqqqqqqqpgq_STAKING_PLACEHOLDER';

export const MARKETPLACE_CONTRACT_ADDRESS: string =
  process.env.REACT_APP_MARKETPLACE_ADDRESS ?? 'erd1qqqqqqqqqqqqqpgq_MARKETPLACE_PLACEHOLDER';

// ─── Token identifiers ─────────────────────────────────────────────────────
export const NFT_COLLECTION_ID: string =
  process.env.REACT_APP_NFT_COLLECTION_ID ?? 'SHIP-000000';

// ─── Network ────────────────────────────────────────────────────────────────
export const NETWORK_PROVIDER_URL: string =
  process.env.REACT_APP_NETWORK_URL ?? 'https://devnet-api.multiversx.com';

export const CHAIN_ID: string =
  process.env.REACT_APP_CHAIN_ID ?? 'D'; // D = devnet, 1 = mainnet

// ─── Backend ────────────────────────────────────────────────────────────────
export const BACKEND_URL: string =
  process.env.REACT_APP_BACKEND_URL ?? 'http://localhost:3001';

export const WS_URL: string =
  process.env.REACT_APP_WS_URL ?? 'ws://localhost:3001/ws';
