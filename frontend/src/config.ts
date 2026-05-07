/** MultiversX network & contract configuration */
export const NETWORK_CONFIG = {
  chainId: 'D',
  apiUrl: 'https://devnet-api.multiversx.com',
  explorerUrl: 'https://devnet-explorer.multiversx.com',
};

export const environment = {
  id: 'devnet' as 'devnet' | 'testnet' | 'mainnet',
  walletConnectV2ProjectId: import.meta.env.VITE_WALLET_CONNECT_V2_PROJECT_ID ?? '',
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

export const MINT_PRICE_EGLD = '0.05';
