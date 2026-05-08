export const config = {
  PORT: parseInt(process.env.PORT ?? '4000', 10),
  NODE_ENV: (process.env.NODE_ENV ?? 'development') as 'development' | 'production',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:5173',

  // MultiversX
  MX_API_URL: process.env.MX_API_URL ?? 'https://devnet-api.multiversx.com',
  BATTLESHIP_CONTRACT: process.env.BATTLESHIP_CONTRACT ?? 'erd1qqqqqqqqqqqqqpgqd9rvv2n378e27esnhcpgn6l76pv3nf8nvs9sn4600g',
  NFT_CONTRACT: process.env.NFT_CONTRACT ?? 'erd1qqqqqqqqqqqqqpgqe9rvv2n378e27esnhcpgn6l76pv3nf8nvs9sn4600g',
  STAKING_CONTRACT: process.env.STAKING_CONTRACT ?? 'erd1qqqqqqqqqqqqqpgqf9rvv2n378e27esnhcpgn6l76pv3nf8nvs9sn4600g',

  // Cache TTL in ms
  LEADERBOARD_CACHE_TTL: parseInt(process.env.LEADERBOARD_CACHE_TTL ?? '30000', 10),
  STATS_CACHE_TTL: parseInt(process.env.STATS_CACHE_TTL ?? '60000', 10),
} as const;
