import React, { useEffect } from 'react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { useStaking } from '../hooks/useStaking';
import './StakingPage.css';

export const StakingPage: React.FC = () => {
  const { address } = useGetAccountInfo();
  const {
    info, loading, error,
    handleStake, handleUnstake, handleClaim,
    refresh,
  } = useStaking(address);

  const [stakeAmt,   setStakeAmt]   = React.useState('');
  const [unstakeAmt, setUnstakeAmt] = React.useState('');

  useEffect(() => { refresh(); }, [address]);

  const fmtEgld = (wei: string) => {
    try { return (Number(BigInt(wei)) / 1e18).toFixed(4); }
    catch { return wei; }
  };

  return (
    <div className="staking-page">
      <h1 className="sp-title">💎 EGLD Staking</h1>
      <p className="sp-subtitle">Stake EGLD to earn rewards from the MetaShipX battle pool</p>

      {error && <div className="sp-feedback err">{error}</div>}

      <div className="sp-stats-bar">
        <div className="sp-stat">
          <span className="sp-stat-label">My Stake</span>
          <span className="sp-stat-value">
            {loading ? '…' : `${fmtEgld(info?.stakedAmount ?? '0')} EGLD`}
          </span>
        </div>
        <div className="sp-stat">
          <span className="sp-stat-label">Pending Rewards</span>
          <span className="sp-stat-value reward">
            {loading ? '…' : `${fmtEgld(info?.pendingRewards ?? '0')} EGLD`}
          </span>
        </div>
        <div className="sp-stat">
          <span className="sp-stat-label">APR</span>
          <span className="sp-stat-value apr">{loading ? '…' : `${info?.apr ?? 20}%`}</span>
        </div>
        <div className="sp-stat">
          <span className="sp-stat-label">Total Staked</span>
          <span className="sp-stat-value">
            {loading ? '…' : `${fmtEgld(info?.totalStaked ?? '0')} EGLD`}
          </span>
        </div>
        <div className="sp-stat">
          <span className="sp-stat-label">Reward Pool</span>
          <span className="sp-stat-value">
            {loading ? '…' : `${fmtEgld(info?.rewardPool ?? '0')} EGLD`}
          </span>
        </div>
      </div>

      <div className="sp-actions">
        <div className="sp-action-card">
          <h3>Stake</h3>
          <div className="sp-input-row">
            <input
              type="number" min="0.001" step="0.001"
              placeholder="Amount (EGLD)"
              value={stakeAmt}
              onChange={e => setStakeAmt(e.target.value)}
            />
            <button
              className="btn-primary"
              onClick={() => handleStake(stakeAmt).then(() => setStakeAmt(''))}
              disabled={loading || !address || !stakeAmt}
            >
              {loading ? '…' : 'Stake'}
            </button>
          </div>
        </div>

        <div className="sp-action-card">
          <h3>Unstake</h3>
          <div className="sp-input-row">
            <input
              type="number" min="0.001" step="0.001"
              placeholder="Amount (EGLD)"
              value={unstakeAmt}
              onChange={e => setUnstakeAmt(e.target.value)}
            />
            <button
              className="btn-secondary"
              onClick={() => handleUnstake(unstakeAmt).then(() => setUnstakeAmt(''))}
              disabled={loading || !address || !unstakeAmt}
            >
              {loading ? '…' : 'Unstake'}
            </button>
          </div>
        </div>

        <div className="sp-action-card">
          <h3>Claim Rewards</h3>
          <p className="sp-claimable">
            Available: <strong>{fmtEgld(info?.pendingRewards ?? '0')} EGLD</strong>
          </p>
          <button
            className="btn-accent"
            onClick={() => handleClaim()}
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
