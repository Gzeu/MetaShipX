/** MultiversX network & contract configuration */
export const NETWORK_CONFIG = {
  chainId: 'D',
  apiUrl: 'https://devnet-api.multiversx.com',
  explorerUrl: 'https://devnet-explorer.multiversx.com',
};

export const ENVIRONMENT =
  (import.meta.env.VITE_NETWORK ?? 'devnet') as 'devnet' | 'testnet' | 'mainnet';

export const WALLETCONNECT_PROJECT_ID: string =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? '';

export const NETWORK_PROVIDER_URL = NETWORK_CONFIG.apiUrl;

export const BATTLESHIP_CONTRACT_ADDRESS: string =
  import.meta.env.VITE_BATTLESHIP_ADDRESS ??
  'erd1qqqqqqqqqqqqqpgqd9kvjv4qvkzmxkjk0rlrhtgdmrjgfe8jkvfq6yq8dl';

export const NFT_CONTRACT_ADDRESS: string =
  import.meta.env.VITE_NFT_ADDRESS ??
  'erd1qqqqqqqqqqqqqpgqd9kvjv4qvkzmxkjk0rlrhtgdmrjgfe8jkvfq6yq8dm';

export const STAKING_CONTRACT_ADDRESS: string =
  import.meta.env.VITE_STAKING_ADDRESS ??
  'erd1qqqqqqqqqqqqqpgqd9kvjv4qvkzmxkjk0rlrhtgdmrjgfe8jkvfq6yq8dn';

export const TOURNAMENT_CONTRACT_ADDRESS: string =
  import.meta.env.VITE_TOURNAMENT_ADDRESS ??
  'erd1qqqqqqqqqqqqqpgqd9kvjv4qvkzmxkjk0rlrhtgdmrjgfe8jkvfq6yq8dp';

export const MINT_PRICE_EGLD = '0.05';

// Network overrides based on VITE_NETWORK env var
const CHAIN_CONFIGS: Record<string, Partial<typeof NETWORK_CONFIG>> = {
  testnet: {
    chainId: 'T',
    apiUrl: 'https://testnet-api.multiversx.com',
    explorerUrl: 'https://testnet-explorer.multiversx.com',
  },
  mainnet: {
    chainId: '1',
    apiUrl: 'https://api.multiversx.com',
    explorerUrl: 'https://explorer.multiversx.com',
  },
};

if (CHAIN_CONFIGS[ENVIRONMENT]) {
  Object.assign(NETWORK_CONFIG, CHAIN_CONFIGS[ENVIRONMENT]);
}
