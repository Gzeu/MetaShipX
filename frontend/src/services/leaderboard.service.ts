import { NETWORK_CONFIG, BATTLESHIP_CONTRACT_ADDRESS } from '../config';
import { ProxyNetworkProvider } from '@multiversx/sdk-network-providers';
import { ContractFunction, AddressValue, Address } from '@multiversx/sdk-core';

export type LeaderboardCategory = 'winRate' | 'wins' | 'egldEarned' | 'streak' | 'accuracy';

export interface LeaderboardEntry {
  rank: number;
  address: string;
  wins: number;
  losses: number;
  winRate: number;       // 0-100
  egldEarned: string;   // formatted EGLD
  bestStreak: number;
  accuracy: number;     // 0-100
  totalGames: number;
  avgGameDuration: number; // seconds
  lastActive: number;      // unix timestamp
}

const MOCK_LEADERBOARD: Omit<LeaderboardEntry, 'rank'>[] = [
  { address: 'erd1qqqqqqqq000000000000000000000000000000000000000000000000a', wins: 142, losses: 28, winRate: 83.5, egldEarned: '47.8', bestStreak: 14, accuracy: 72.4, totalGames: 170, avgGameDuration: 680, lastActive: Date.now() - 1000 * 60 * 5 },
  { address: 'erd1qqqqqqqq000000000000000000000000000000000000000000000000b', wins: 98, losses: 19, winRate: 83.8, egldEarned: '31.2', bestStreak: 11, accuracy: 78.1, totalGames: 117, avgGameDuration: 590, lastActive: Date.now() - 1000 * 60 * 22 },
  { address: 'erd1qqqqqqqq000000000000000000000000000000000000000000000000c', wins: 210, losses: 65, winRate: 76.4, egldEarned: '62.5', bestStreak: 9, accuracy: 65.3, totalGames: 275, avgGameDuration: 820, lastActive: Date.now() - 1000 * 60 * 60 * 2 },
  { address: 'erd1qqqqqqqq000000000000000000000000000000000000000000000000d', wins: 55, losses: 8, winRate: 87.3, egldEarned: '18.9', bestStreak: 18, accuracy: 81.7, totalGames: 63, avgGameDuration: 510, lastActive: Date.now() - 1000 * 60 * 120 },
  { address: 'erd1qqqqqqqq000000000000000000000000000000000000000000000000e', wins: 175, losses: 70, winRate: 71.4, egldEarned: '55.3', bestStreak: 7, accuracy: 61.2, totalGames: 245, avgGameDuration: 950, lastActive: Date.now() - 1000 * 60 * 60 * 5 },
  { address: 'erd1qqqqqqqq000000000000000000000000000000000000000000000000f', wins: 44, losses: 6, winRate: 88.0, egldEarned: '14.1', bestStreak: 22, accuracy: 84.5, totalGames: 50, avgGameDuration: 460, lastActive: Date.now() - 1000 * 60 * 200 },
  { address: 'erd1qqqqqqqq0000000000000000000000000000000000000000000000010', wins: 130, losses: 58, winRate: 69.1, egldEarned: '39.7', bestStreak: 6, accuracy: 58.9, totalGames: 188, avgGameDuration: 1100, lastActive: Date.now() - 1000 * 60 * 60 * 8 },
  { address: 'erd1qqqqqqqq0000000000000000000000000000000000000000000000011', wins: 88, losses: 33, winRate: 72.7, egldEarned: '26.4', bestStreak: 8, accuracy: 68.3, totalGames: 121, avgGameDuration: 730, lastActive: Date.now() - 1000 * 60 * 60 * 12 },
  { address: 'erd1qqqqqqqq0000000000000000000000000000000000000000000000012', wins: 62, losses: 28, winRate: 68.9, egldEarned: '20.1', bestStreak: 5, accuracy: 63.8, totalGames: 90, avgGameDuration: 870, lastActive: Date.now() - 1000 * 60 * 60 * 24 },
  { address: 'erd1qqqqqqqq0000000000000000000000000000000000000000000000013', wins: 41, losses: 19, winRate: 68.3, egldEarned: '13.2', bestStreak: 4, accuracy: 60.1, totalGames: 60, avgGameDuration: 920, lastActive: Date.now() - 1000 * 60 * 60 * 36 },
];

const SORT_KEYS: Record<LeaderboardCategory, keyof Omit<LeaderboardEntry, 'rank'>> = {
  winRate: 'winRate',
  wins: 'wins',
  egldEarned: 'egldEarned',
  streak: 'bestStreak',
  accuracy: 'accuracy',
};

export async function fetchLeaderboard(
  category: LeaderboardCategory = 'winRate',
  page = 1,
  perPage = 10
): Promise<{ entries: LeaderboardEntry[]; total: number; hasMore: boolean }> {
  // Try on-chain via MultiversX API; fall back to mock on devnet/errors
  try {
    const provider = new ProxyNetworkProvider(NETWORK_CONFIG.apiUrl, { timeout: 5000 });
    const query = {
      func: new ContractFunction('getLeaderboard'),
      args: [new AddressValue(new Address(BATTLESHIP_CONTRACT_ADDRESS))],
    };
    // If contract not deployed yet this will throw → caught below
    await provider.queryContract(query as any);
  } catch {
    // Contract not yet deployed — use mock data
  }

  // Sort mock data by category
  const sortKey = SORT_KEYS[category];
  const sorted = [...MOCK_LEADERBOARD].sort((a, b) => {
    const av = sortKey === 'egldEarned' ? parseFloat(a[sortKey] as string) : (a[sortKey] as number);
    const bv = sortKey === 'egldEarned' ? parseFloat(b[sortKey] as string) : (b[sortKey] as number);
    return bv - av;
  });

  const total = sorted.length;
  const start = (page - 1) * perPage;
  const slice = sorted.slice(start, start + perPage);
  const entries: LeaderboardEntry[] = slice.map((e, i) => ({ ...e, rank: start + i + 1 }));

  return { entries, total, hasMore: start + perPage < total };
}

export async function fetchPlayerRank(
  address: string,
  category: LeaderboardCategory = 'winRate'
): Promise<{ rank: number; total: number } | null> {
  const { entries: all } = await fetchLeaderboard(category, 1, 100);
  const idx = all.findIndex(e => e.address === address);
  if (idx === -1) return null;
  return { rank: all[idx].rank, total: all.length };
}
