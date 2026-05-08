import { useState, useEffect, useCallback } from 'react';
import { useGetNetworkConfig } from '@multiversx/sdk-dapp/hooks';
import { ProxyNetworkProvider } from '@multiversx/sdk-network-providers';
import { ContractFunction, ResultsParser, SmartContract, AbiRegistry } from '@multiversx/sdk-core';
import { Address } from '@multiversx/sdk-core';
import { BATTLESHIP_CONTRACT_ADDRESS } from '../config';

export interface LeaderboardEntry {
  rank: number;
  address: string;
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
  totalWagered: string;
  totalEarned: string;
}

interface UseLeaderboardReturn {
  entries: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  lastUpdated: Date | null;
}

const REFRESH_INTERVAL = 30_000; // 30s

export function useLeaderboard(limit = 50): UseLeaderboardReturn {
  const { network } = useGetNetworkConfig();
  const [entries, setEntries]       = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new ProxyNetworkProvider(network.apiAddress, { timeout: 10_000 });
      const contract = new SmartContract({ address: new Address(BATTLESHIP_CONTRACT_ADDRESS) });

      // Query getLeaderboard(limit: u32) -> MultiValueEncoded<(address, wins, losses, wagered, earned)>
      const query = contract.createQuery({
        func: new ContractFunction('getLeaderboard'),
        args: [],
      });

      const queryResponse = await provider.queryContract(query);
      const resultsParser = new ResultsParser();

      // Parse raw MultiValue pairs from the response buffers
      const rawEntries: LeaderboardEntry[] = queryResponse.returnData
        .slice(0, limit)
        .map((encoded: string, idx: number) => {
          try {
            const buf = Buffer.from(encoded, 'base64');
            // Layout: 32 bytes address | 8 bytes wins | 8 bytes losses | 16 bytes wagered | 16 bytes earned
            const addressHex = buf.subarray(0, 32).toString('hex');
            const wins       = Number(buf.readBigUInt64BE(32));
            const losses     = Number(buf.readBigUInt64BE(40));
            const wagered    = buf.readBigUInt64BE(48).toString();
            const earned     = buf.readBigUInt64BE(56).toString();
            const totalGames = wins + losses;
            const winRate    = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
            return {
              rank: idx + 1,
              address: addressHex,
              wins,
              losses,
              totalGames,
              winRate,
              totalWagered: wagered,
              totalEarned: earned,
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean) as LeaderboardEntry[];

      setEntries(rawEntries);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err?.message ?? 'Failed to fetch leaderboard');
    } finally {
      setLoading(false);
    }
  }, [network.apiAddress, limit]);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  return { entries, loading, error, refresh: fetchLeaderboard, lastUpdated };
}
