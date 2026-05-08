import React from 'react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { useStaking } from '../hooks/useStaking';
import './StakingPage.css';

export const StakingPage: React.FC = () => {
  const { account } = useGetAccountInfo();
  const {
    stakeInfo,
    pendingRewards,
    totalStaked,
    rewardPool,
    apr,
    loading,
    stake,
    unstake,
    claimRewards,
    staking: txPending,
  } = useStaking();

  const [stakeAmount, setStakeAmount] = React.useState('');
  const [unstakeAmount, setUnstakeAmount] = React.useState('');

  const handleStake = () => {
    const egld = parseFloat(stakeAmount);
    if (isNaN(egld) || egld <= 0) return;
    stake(BigInt(Math.floor(egld * 1e18)));
    setStakeAmount('');
  };

  const handleUnstake = () => {
    const egld = parseFloat(unstakeAmount);
    if (isNaN(egld) || egld <= 0) return;
    unstake(BigInt(Math.floor(egld * 1e18)));
    setUnstakeAmount('');
  };

  return (
    <div className="staking-page">
      <h1>⚓ EGLD Staking</h1>
      <p className="staking-subtitle">
        Stake EGLD to earn rewards from game fees. APR updates after each match.
      </p>

      {/* Pool stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">APR</span>
          <span className="stat-value apr">{apr ? (apr / 100).toFixed(2) : '—'}%</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Staked</span>
          <span className="stat-value">{formatEgld(totalStaked)} EGLD</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Reward Pool</span>
          <span className="stat-value">{formatEgld(rewardPool)} EGLD</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">My Stake</span>
          <span className="stat-value">{stakeInfo ? formatEgld(BigInt(stakeInfo.amount) * BigInt(1e18 / 1e18)) : '0'} EGLD</span>
        </div>
      </div>

      {/* Pending rewards */}
      {pendingRewards !== null && pendingRewards > 0n && (
        <div className="rewards-banner">
          <span>🎁 Pending Rewards: <strong>{formatEgld(pendingRewards)} EGLD</strong></span>
          <button
            className="btn-claim"
            onClick={claimRewards}
            disabled={txPending}
          >
            {txPending ? 'Processing…' : 'Claim Rewards'}
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="staking-actions">
        <div className="action-card">
          <h3>Stake EGLD</h3>
          <div className="input-row">
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount in EGLD"
              value={stakeAmount}
              onChange={e => setStakeAmount(e.target.value)}
            />
            <button
              className="btn-primary"
              onClick={handleStake}
              disabled={txPending || !stakeAmount}
            >
              Stake
            </button>
          </div>
        </div>

        <div className="action-card">
          <h3>Unstake EGLD</h3>
          <div className="input-row">
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount in EGLD"
              value={unstakeAmount}
              onChange={e => setUnstakeAmount(e.target.value)}
            />
            <button
              className="btn-secondary"
              onClick={handleUnstake}
              disabled={txPending || !unstakeAmount}
            >
              Unstake
            </button>
          </div>
        </div>
      </div>

      {/* Stake info detail */}
      {stakeInfo && (
        <div className="stake-detail">
          <h3>Your Position</h3>
          <div className="detail-row">
            <span>Staked since</span>
            <span>{new Date(Number(stakeInfo.stakedAtMs)).toLocaleString()}</span>
          </div>
          <div className="detail-row">
            <span>Last claimed</span>
            <span>{new Date(Number(stakeInfo.lastClaimedMs)).toLocaleString()}</span>
          </div>
          <div className="detail-row">
            <span>Total claimed</span>
            <span>{formatEgld(BigInt(stakeInfo.totalClaimed))} EGLD</span>
          </div>
        </div>
      )}
    </div>
  );
};

function formatEgld(attoEgld: bigint | number | undefined): string {
  if (attoEgld === undefined || attoEgld === null) return '0.0000';
  const n = typeof attoEgld === 'bigint' ? Number(attoEgld) : attoEgld;
  return (n / 1e18).toFixed(4);
}

export default StakingPage;
