import { useState, useCallback, useEffect } from 'react';
import {
  stake,
  unstake,
  claimRewards,
  getStakingInfo,
  StakingInfo,
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

export function useStaking(address: string | null): UseStakingReturn {
  const [info, setInfo] = useState<StakingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!address) return;
    try {
      const data = await getStakingInfo(address);
      setInfo(data);
    } catch (e: any) {
      setError(e.message);
    }
  }, [address]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleStake = useCallback(async (egld: string) => {
    setLoading(true); setError(null);
    try { await stake(egld); await refresh(); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [refresh]);

  const handleUnstake = useCallback(async (egld: string) => {
    setLoading(true); setError(null);
    try { await unstake(egld); await refresh(); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [refresh]);

  const handleClaim = useCallback(async () => {
    setLoading(true); setError(null);
    try { await claimRewards(); await refresh(); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [refresh]);

  return { info, loading, error, handleStake, handleUnstake, handleClaim, refresh };
}
