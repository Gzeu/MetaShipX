import { useState, useEffect, useCallback } from 'react';
import { useGetAccountInfo, useGetIsLoggedIn } from '@multiversx/sdk-dapp/hooks';
import { battleshipService } from '../services/battleship.service';
import { nftService } from '../services/nft.service';
import { stakingService } from '../services/staking.service';

export interface MatchRecord {
  gameId: string;
  opponent: string;
  result: 'win' | 'loss';
  betAmount: string;
  timestamp: number;
  duration: number; // seconds
  shotsHit: number;
  shotsMissed: number;
  shipsLost: number;
}

export interface ProfileStats {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  totalEgldWon: string;
  totalEgldLost: string;
  bestWinStreak: number;
  currentStreak: number;
  totalShots: number;
  accuracy: number;
  avgGameDuration: number;
}

export function useProfile() {
  const { address } = useGetAccountInfo();
  const isLoggedIn = useGetIsLoggedIn();

  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [ships, setShips] = useState<any[]>([]);
  const [stakeInfo, setStakeInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!isLoggedIn || !address) return;
    setIsLoading(true);
    setError(null);
    try {
      const [playerGames, userShips, stakingData] = await Promise.allSettled([
        battleshipService.getPlayerGames(address),
        nftService.getUserShips(address),
        stakingService.getStakingInfo(address),
      ]);

      const rawGames: MatchRecord[] = playerGames.status === 'fulfilled'
        ? (playerGames.value || [])
        : generateMockMatches(address);

      const sortedMatches = rawGames.sort((a, b) => b.timestamp - a.timestamp);
      setMatches(sortedMatches);

      // Compute stats
      const wins = sortedMatches.filter(m => m.result === 'win').length;
      const losses = sortedMatches.length - wins;
      const totalShots = sortedMatches.reduce((s, m) => s + m.shotsHit + m.shotsMissed, 0);
      const totalHits = sortedMatches.reduce((s, m) => s + m.shotsHit, 0);

      let currentStreak = 0;
      let bestStreak = 0;
      let streak = 0;
      for (const m of sortedMatches) {
        if (m.result === 'win') { streak++; bestStreak = Math.max(bestStreak, streak); }
        else streak = 0;
      }
      if (sortedMatches[0]?.result === 'win') currentStreak = streak;

      const totalWon = sortedMatches
        .filter(m => m.result === 'win')
        .reduce((s, m) => s + parseFloat(m.betAmount), 0);
      const totalLost = sortedMatches
        .filter(m => m.result === 'loss')
        .reduce((s, m) => s + parseFloat(m.betAmount), 0);

      setStats({
        totalGames: sortedMatches.length,
        wins,
        losses,
        winRate: sortedMatches.length > 0 ? Math.round((wins / sortedMatches.length) * 100) : 0,
        totalEgldWon: totalWon.toFixed(3),
        totalEgldLost: totalLost.toFixed(3),
        bestWinStreak: bestStreak,
        currentStreak,
        totalShots,
        accuracy: totalShots > 0 ? Math.round((totalHits / totalShots) * 100) : 0,
        avgGameDuration: sortedMatches.length > 0
          ? Math.round(sortedMatches.reduce((s, m) => s + m.duration, 0) / sortedMatches.length)
          : 0,
      });

      setShips(userShips.status === 'fulfilled' ? (userShips.value || []) : []);
      setStakeInfo(stakingData.status === 'fulfilled' ? stakingData.value : null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [address, isLoggedIn]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  return { matches, stats, ships, stakeInfo, isLoading, error, refetch: fetchProfile };
}

// Mock data for demo when contract not yet deployed
function generateMockMatches(address: string): MatchRecord[] {
  const now = Date.now();
  const DAY = 86400000;
  return [
    { gameId: 'game_001', opponent: 'erd1abc...xyz', result: 'win', betAmount: '0.5', timestamp: now - 2 * 3600000, duration: 420, shotsHit: 17, shotsMissed: 8, shipsLost: 1 },
    { gameId: 'game_002', opponent: 'erd1def...uvw', result: 'loss', betAmount: '0.2', timestamp: now - 6 * 3600000, duration: 380, shotsHit: 12, shotsMissed: 15, shipsLost: 4 },
    { gameId: 'game_003', opponent: 'erd1ghi...rst', result: 'win', betAmount: '1.0', timestamp: now - DAY, duration: 510, shotsHit: 20, shotsMissed: 5, shipsLost: 0 },
    { gameId: 'game_004', opponent: 'erd1jkl...opq', result: 'win', betAmount: '0.3', timestamp: now - 2 * DAY, duration: 290, shotsHit: 14, shotsMissed: 11, shipsLost: 2 },
    { gameId: 'game_005', opponent: 'erd1mno...lmn', result: 'loss', betAmount: '0.5', timestamp: now - 3 * DAY, duration: 460, shotsHit: 10, shotsMissed: 18, shipsLost: 5 },
    { gameId: 'game_006', opponent: 'erd1pqr...ijk', result: 'win', betAmount: '0.1', timestamp: now - 4 * DAY, duration: 220, shotsHit: 15, shotsMissed: 7, shipsLost: 1 },
    { gameId: 'game_007', opponent: 'erd1stu...fgh', result: 'win', betAmount: '2.0', timestamp: now - 5 * DAY, duration: 600, shotsHit: 22, shotsMissed: 4, shipsLost: 0 },
    { gameId: 'game_008', opponent: 'erd1vwx...cde', result: 'loss', betAmount: '0.3', timestamp: now - 7 * DAY, duration: 340, shotsHit: 9, shotsMissed: 19, shipsLost: 4 },
  ];
}
