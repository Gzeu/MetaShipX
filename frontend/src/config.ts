/** MultiversX network & contract configuration */
export const NETWORK_CONFIG = {
  chainId: 'D',
  apiUrl: 'https://devnet-api.multiversx.com',
  explorerUrl: 'https://devnet-explorer.multiversx.com',
};

export const environment = {
  id: (import.meta.env.VITE_NETWORK ?? 'devnet') as 'devnet' | 'testnet' | 'mainnet',
  // walletConnectV2ProjectId removed — not used
};

export const BATTLESHIP_CONTRACT_ADDRESS =
  import.meta.env.VITE_BATTLESHIP_ADDRESS ??
  'erd1qqqqqqqqqqqqqpgq000000000000000000000000000000000000000000';

export const NFT_CONTRACT_ADDRESS =
  import.meta.env.VITE_NFT_ADDRESS ??
  'erd1qqqqqqqqqqqqqpgq000000000000000000000000000000000000000001';

export const STAKING_CONTRACT_ADDRESS =
  import.meta.env.VITE_STAKING_ADDRESS ??
  'erd1qqqqqqqqqqqqqpgq000000000000000000000000000000000000000002';

export const TOURNAMENT_CONTRACT_ADDRESS =
  import.meta.env.VITE_TOURNAMENT_ADDRESS ??
  'erd1qqqqqqqqqqqqqpgq000000000000000000000000000000000000000003';

export const MINT_PRICE_EGLD = '0.05';

// Network overrides
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

if (CHAIN_CONFIGS[environment.id]) {
  Object.assign(NETWORK_CONFIG, CHAIN_CONFIGS[environment.id]);
}
