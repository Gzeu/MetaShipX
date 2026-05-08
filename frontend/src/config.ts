// MetaShipX — Runtime config
// All values come from .env.local / .env.devnet

export const ENV = import.meta.env.VITE_ENV || 'devnet';

export const CHAIN_ID = ENV === 'mainnet' ? '1' : ENV === 'testnet' ? 'T' : 'D';

export const API_URL =
  import.meta.env.VITE_API_URL ||
  (ENV === 'mainnet'
    ? 'https://api.multiversx.com'
    : ENV === 'testnet'
    ? 'https://testnet-api.multiversx.com'
    : 'https://devnet-api.multiversx.com');

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const BATTLESHIP_CONTRACT =
  import.meta.env.VITE_BATTLESHIP_CONTRACT || '';

export const NFT_CONTRACT =
  import.meta.env.VITE_NFT_CONTRACT || '';

export const STAKING_CONTRACT =
  import.meta.env.VITE_STAKING_CONTRACT || '';

export const TOURNAMENT_CONTRACT =
  import.meta.env.VITE_TOURNAMENT_CONTRACT || '';

export const EXPLORER_URL =
  ENV === 'mainnet'
    ? 'https://explorer.multiversx.com'
    : ENV === 'testnet'
    ? 'https://testnet-explorer.multiversx.com'
    : 'https://devnet-explorer.multiversx.com';

/** Returns a full explorer link for a tx hash */
export const txLink = (hash: string) => `${EXPLORER_URL}/transactions/${hash}`;
/** Returns a full explorer link for a contract/wallet address */
export const addrLink = (addr: string) => `${EXPLORER_URL}/accounts/${addr}`;
