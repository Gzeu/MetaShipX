// Environment configurations
export const environments = {
  dev: {
    id: 'devnet' as const,
    apiUrl: 'https://devnet-api.multiversx.com',
    walletConnectV2ProjectId: '9b1a7b8d8f5a4c3d8e7f6a5d4c3b2a1a',
    chainId: 'D',
    explorerUrl: 'https://devnet-explorer.multiversx.com',
  },
  test: {
    id: 'testnet' as const,
    apiUrl: 'https://testnet-api.multiversx.com',
    walletConnectV2ProjectId: '9b1a7b8d8f5a4c3d8e7f6a5d4c3b2a1a',
    chainId: 'T',
    explorerUrl: 'https://testnet-explorer.multiversx.com',
  },
  main: {
    id: 'mainnet' as const,
    apiUrl: 'https://api.multiversx.com',
    walletConnectV2ProjectId: '9b1a7b8d8f5a4c3d8e7f6a5d4c3b2a1a',
    chainId: '1',
    explorerUrl: 'https://explorer.multiversx.com',
  },
};

// Default to dev environment
const env = process.env.NODE_ENV || 'dev';
const environment = environments[env as keyof typeof environments] || environments.dev;

export { environment };
