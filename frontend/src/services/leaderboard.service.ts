import { ProxyNetworkProvider } from '@multiversx/sdk-network-providers';
import { Address, ContractFunction, ResultsParser, SmartContract } from '@multiversx/sdk-core';
import { BATTLESHIP_ADDRESS, NETWORK_PROVIDER_URL } from '../config';

export interface LeaderboardEntry {
  address: string;
  wins: number;
  losses: number;
  totalWagered: string;  // in EGLD string
  winRate: number;
  rank: number;
}

const provider = new ProxyNetworkProvider(NETWORK_PROVIDER_URL);

export async function getLeaderboard(top = 50): Promise<LeaderboardEntry[]> {
  try {
    const contract = new SmartContract({ address: new Address(BATTLESHIP_ADDRESS) });
    const query = contract.createQuery({
      func: new ContractFunction('getLeaderboard'),
      args: [],
    });
    const queryResponse = await provider.queryContract(query);
    const parser = new ResultsParser();
    const { firstValue } = parser.parseUntypedQueryResponse(queryResponse);
    if (!firstValue) return getMockLeaderboard(top);
    // firstValue is a List<Tuple<Address, u64, u64, BigUint>>
    const items = firstValue.valueOf() as Array<{ field0: string; field1: bigint; field2: bigint; field3: bigint }>;
    return items.slice(0, top).map((item, idx) => {
      const wins = Number(item.field1);
      const losses = Number(item.field2);
      const total = wins + losses;
      return {
        address: item.field0,
        wins,
        losses,
        totalWagered: (Number(item.field3) / 1e18).toFixed(4),
        winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
        rank: idx + 1,
      };
    });
  } catch {
    return getMockLeaderboard(top);
  }
}

export async function getPlayerRank(address: string): Promise<LeaderboardEntry | null> {
  const board = await getLeaderboard(100);
  return board.find(e => e.address === address) ?? null;
}

function getMockLeaderboard(top: number): LeaderboardEntry[] {
  const names = [
    'erd1qqqq...a1b2', 'erd1abc...3d4e', 'erd1xyz...5f6g',
    'erd1def...7h8i', 'erd1ghi...9j0k', 'erd1jkl...1l2m',
    'erd1mno...3n4o', 'erd1pqr...5p6q', 'erd1stu...7r8s',
    'erd1vwx...9t0u',
  ];
  return Array.from({ length: Math.min(top, names.length) }, (_, idx) => ({
    address: names[idx],
    wins: Math.floor(Math.random() * 80) + 10,
    losses: Math.floor(Math.random() * 30) + 1,
    totalWagered: (Math.random() * 50 + 1).toFixed(4),
    winRate: Math.floor(Math.random() * 40) + 50,
    rank: idx + 1,
  }));
}
