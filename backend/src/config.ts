function requireEnv(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback;
  if (val === undefined) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  cacheTtl: parseInt(process.env.CACHE_TTL ?? '30', 10),

  mxApiUrl: process.env.MX_API_URL ?? 'https://devnet-api.multiversx.com',
  mxChain: process.env.MX_CHAIN ?? 'D',

  battleshipContract: process.env.BATTLESHIP_CONTRACT ?? '',
  nftContract: process.env.NFT_CONTRACT ?? '',
  stakingContract: process.env.STAKING_CONTRACT ?? '',
  tournamentContract: process.env.TOURNAMENT_CONTRACT ?? '',
} as const;
