import { useState, useEffect, useCallback } from 'react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { stakingService } from '../services/staking.service';

interface StakeInfo {
  amount: string;
  stakedAtMs: string;
  lastClaimedMs: string;
  totalClaimed: string;
}

interface UseStakingReturn {
  stakeInfo: StakeInfo | null;
  pendingRewards: bigint | null;
  totalStaked: bigint | null;
  rewardPool: bigint | null;
  apr: number | null;
  loading: boolean;
  staking: boolean; // tx in-flight flag
  stake: (amountAtto: bigint) => Promise<void>;
  unstake: (amountAtto: bigint) => Promise<void>;
  claimRewards: () => Promise<void>;
  refresh: () => void;
}

export function useStaking(): UseStakingReturn {
  const { address } = useGetAccountInfo();

  const [stakeInfo, setStakeInfo] = useState<StakeInfo | null>(null);
  const [pendingRewards, setPendingRewards] = useState<bigint | null>(null);
  const [totalStaked, setTotalStaked] = useState<bigint | null>(null);
  const [rewardPool, setRewardPool] = useState<bigint | null>(null);
  const [apr, setApr] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [staking, setStaking] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    stakingService
      .getStakingInfo(address)
      .then(info => {
        if (cancelled) return;
        setStakeInfo(info.stakeInfo);
        setPendingRewards(info.pendingRewards);
        setTotalStaked(info.totalStaked);
        setRewardPool(info.rewardPool);
        setApr(info.apr);
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [address, tick]);

  const stake = useCallback(async (amountAtto: bigint) => {
    setStaking(true);
    try {
      await stakingService.stake(amountAtto);
      refresh();
    } finally {
      setStaking(false);
    }
  }, [refresh]);

  const unstake = useCallback(async (amountAtto: bigint) => {
    setStaking(true);
    try {
      await stakingService.unstake(amountAtto);
      refresh();
    } finally {
      setStaking(false);
    }
  }, [refresh]);

  const claimRewards = useCallback(async () => {
    setStaking(true);
    try {
      await stakingService.claimRewards();
      refresh();
    } finally {
      setStaking(false);
    }
  }, [refresh]);

  return {
    stakeInfo,
    pendingRewards,
    totalStaked,
    rewardPool,
    apr,
    loading,
    staking,
    stake,
    unstake,
    claimRewards,
    refresh,
  };
}
