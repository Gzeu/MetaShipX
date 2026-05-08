import { useState, useCallback, useEffect } from 'react';
import {
  stake, unstake, claimRewards, getStakingInfo, StakingInfo,
} from '../services/staking.service';

export interface UseStakingReturn {
  info: StakingInfo | null;
  loading: boolean;
  error: string | null;
  handleStake: (egld: string) => Promise<void>;
  handleUnstake: (egld: string) => Promise<void>;
  handleClaim: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useStaking(address: string | null | undefined): UseStakingReturn {
  const [info, setInfo]       = useState<StakingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!address) return;
    try {
      setInfo(await getStakingInfo(address));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load staking info');
    }
  }, [address]);

  useEffect(() => { refresh(); }, [refresh]);

  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      setLoading(true); setError(null);
      try { await fn(); await refresh(); }
      catch (e: unknown) { setError(e instanceof Error ? e.message : 'Action failed'); }
      finally { setLoading(false); }
    },
    [refresh],
  );

  const handleStake   = useCallback((egld: string) => run(() => stake(egld)),   [run]);
  const handleUnstake = useCallback((egld: string) => run(() => unstake(egld)), [run]);
  const handleClaim   = useCallback(() => run(() => claimRewards()),            [run]);

  return { info, loading, error, handleStake, handleUnstake, handleClaim, refresh };
}
