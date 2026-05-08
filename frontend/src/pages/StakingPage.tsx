import React, { useEffect, useState } from 'react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { useStaking } from '../hooks/useStaking';
import './StakingPage.css';

export const StakingPage: React.FC = () => {
  const { address } = useGetAccountInfo();
  const { info, loading: infoLoading, refresh } = useStaking(address);

  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => { refresh(); }, [address]);

  const wrap = async (label: string, fn: () => Promise<void>) => {
    setLoading(true);
    setFeedback(null);
    try {
      await fn();
      setFeedback({ ok: true, msg: `${label} transaction sent!` });
      setTimeout(refresh, 2000);
    } catch (e: unknown) {
      setFeedback({ ok: false, msg: e instanceof Error ? e.message : `${label} failed` });
    } finally {
      setLoading(false);
    }
  };

  const handleStake = () =>
    wrap('Stake', async () => {
      if (!address || !stakeAmount) throw new Error('Missing address or amount');
      const { stakingService } = await import('../services/staking.service');
      await stakingService.stake(address, stakeAmount);
      setStakeAmount('');
    });

  const handleUnstake = () =>
    wrap('Unstake', async () => {
      if (!address || !unstakeAmount) throw new Error('Missing address or amount');
      const { stakingService } = await import('../services/staking.service');
      await stakingService.unstake(address, unstakeAmount);
      setUnstakeAmount('');
    });

  const handleClaim = () =>
    wrap('Claim', async () => {
      if (!address) throw new Error('Wallet not connected');
      const { stakingService } = await import('../services/staking.service');
      await stakingService.claimRewards(address);
    });

  return (
    <div className="staking-page">
      <h1 className="sp-title">💎 EGLD Staking</h1>
      <p className="sp-subtitle">Stake EGLD to earn rewards from the MetaShipX battle pool</p>

      {feedback && (
        <div className={`sp-feedback ${feedback.ok ? 'ok' : 'err'}`}>{feedback.msg}</div>
      )}

      <div className="sp-stats-bar">
        <div className="sp-stat">
          <span className="sp-stat-label">My Stake</span>
          <span className="sp-stat-value">{infoLoading ? '…' : `${info?.stakedAmount ?? '0'} EGLD`}</span>
        </div>
        <div className="sp-stat">
          <span className="sp-stat-label">Pending Rewards</span>
          <span className="sp-stat-value reward">{infoLoading ? '…' : `${info?.pendingRewards ?? '0'} EGLD`}</span>
        </div>
        <div className="sp-stat">
          <span className="sp-stat-label">APR</span>
          <span className="sp-stat-value apr">{infoLoading ? '…' : `${info?.apr ?? '20'}%`}</span>
        </div>
        <div className="sp-stat">
          <span className="sp-stat-label">Total Staked</span>
          <span className="sp-stat-value">{infoLoading ? '…' : `${info?.totalStaked ?? '0'} EGLD`}</span>
        </div>
        <div className="sp-stat">
          <span className="sp-stat-label">Reward Pool</span>
          <span className="sp-stat-value">{infoLoading ? '…' : `${info?.rewardPool ?? '0'} EGLD`}</span>
        </div>
      </div>

      <div className="sp-actions">
        <div className="sp-action-card">
          <h3>Stake</h3>
          <div className="sp-input-row">
            <input
              type="number"
              min="0.001"
              step="0.001"
              placeholder="Amount (EGLD)"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
            />
            <button className="btn-primary" onClick={handleStake} disabled={loading || !address || !stakeAmount}>
              {loading ? '…' : 'Stake'}
            </button>
          </div>
        </div>

        <div className="sp-action-card">
          <h3>Unstake</h3>
          <div className="sp-input-row">
            <input
              type="number"
              min="0.001"
              step="0.001"
              placeholder="Amount (EGLD)"
              value={unstakeAmount}
              onChange={(e) => setUnstakeAmount(e.target.value)}
            />
            <button className="btn-secondary" onClick={handleUnstake} disabled={loading || !address || !unstakeAmount}>
              {loading ? '…' : 'Unstake'}
            </button>
          </div>
        </div>

        <div className="sp-action-card">
          <h3>Claim Rewards</h3>
          <p className="sp-claimable">
            Available: <strong>{info?.pendingRewards ?? '0'} EGLD</strong>
          </p>
          <button
            className="btn-accent"
            onClick={handleClaim}
            disabled={loading || !address || !info?.pendingRewards || info.pendingRewards === '0'}
          >
            {loading ? '…' : 'Claim'}
          </button>
        </div>
      </div>

      {!address && <p className="sp-warn">Connect your MultiversX wallet to start staking.</p>}
    </div>
  );
};

export default StakingPage;
