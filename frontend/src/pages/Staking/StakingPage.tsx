import React, { useState } from 'react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { useStaking } from '../../hooks/useStaking';
import './StakingPage.css';

function formatEGLD(raw: string | bigint, decimals = 4) {
  const val = Number(BigInt(raw.toString())) / 1e18;
  return val.toFixed(decimals);
}

export default function StakingPage() {
  const { address } = useGetAccountInfo();
  const { info, stake, unstake, claimRewards, loading } = useStaking();

  const [stakeInput, setStakeInput] = useState('');
  const [unstakeInput, setUnstakeInput] = useState('');
  const [tab, setTab] = useState<'stake' | 'unstake'>('stake');
  const [txPending, setTxPending] = useState(false);

  const handleStake = async () => {
    if (!stakeInput || txPending) return;
    setTxPending(true);
    try { await stake(stakeInput); setStakeInput(''); }
    finally { setTxPending(false); }
  };

  const handleUnstake = async () => {
    if (!unstakeInput || txPending) return;
    setTxPending(true);
    try { await unstake(unstakeInput); setUnstakeInput(''); }
    finally { setTxPending(false); }
  };

  const handleClaim = async () => {
    if (txPending) return;
    setTxPending(true);
    try { await claimRewards(); }
    finally { setTxPending(false); }
  };

  const stakedEGLD  = info?.stakedAmount ? formatEGLD(info.stakedAmount) : '0.0000';
  const pendingRewards = info?.pendingRewards ? formatEGLD(info.pendingRewards) : '0.0000';
  const poolSize    = info?.rewardPool ? formatEGLD(info.rewardPool) : '0.0000';
  const apr         = info?.apr ? (Number(info.apr) / 100).toFixed(0) : '20';
  const totalStaked = info?.totalStaked ? formatEGLD(info.totalStaked) : '0.0000';

  return (
    <div className="staking-page">
      <div className="staking-hero">
        <h1 className="staking-title">⚓ Staking</h1>
        <p className="staking-sub">Earn EGLD rewards from match fees. No lock-up, claim anytime.</p>
      </div>

      {/* Stats row */}
      <div className="staking-stats">
        <div className="ss-card">
          <div className="ss-label">APR</div>
          <div className="ss-value ss-apr">{apr}%</div>
        </div>
        <div className="ss-card">
          <div className="ss-label">Reward Pool</div>
          <div className="ss-value">{loading ? '…' : poolSize} <span className="ss-unit">EGLD</span></div>
        </div>
        <div className="ss-card">
          <div className="ss-label">Total Staked</div>
          <div className="ss-value">{loading ? '…' : totalStaked} <span className="ss-unit">EGLD</span></div>
        </div>
        <div className="ss-card ss-card--accent">
          <div className="ss-label">Your Stake</div>
          <div className="ss-value">{loading ? '…' : stakedEGLD} <span className="ss-unit">EGLD</span></div>
        </div>
      </div>

      <div className="staking-main">
        {/* Rewards card */}
        <div className="staking-rewards-card">
          <div className="src-header">
            <div>
              <div className="src-label">Pending Rewards</div>
              <div className="src-amount">{loading ? '…' : pendingRewards} <span className="src-unit">EGLD</span></div>
            </div>
            <button
              className="src-claim-btn"
              onClick={handleClaim}
              disabled={txPending || !address || parseFloat(pendingRewards) === 0}
            >
              {txPending ? 'Claiming…' : 'Claim Rewards'}
            </button>
          </div>
          <div className="src-progress">
            <div
              className="src-progress-fill"
              style={{ width: `${Math.min(parseFloat(pendingRewards) / 0.1 * 100, 100)}%` }}
            />
          </div>
          <p className="src-hint">Rewards accrue in real-time based on your share of the pool.</p>
        </div>

        {/* Stake/Unstake panel */}
        <div className="staking-action-card">
          <div className="sac-tabs">
            <button
              className={`sac-tab ${tab === 'stake' ? 'active' : ''}`}
              onClick={() => setTab('stake')}
            >Stake</button>
            <button
              className={`sac-tab ${tab === 'unstake' ? 'active' : ''}`}
              onClick={() => setTab('unstake')}
            >Unstake</button>
          </div>

          {tab === 'stake' && (
            <div className="sac-form">
              <label className="sac-label">Amount to stake</label>
              <div className="sac-input-row">
                <input
                  type="number"
                  className="sac-input"
                  placeholder="0.0"
                  min="0"
                  step="0.01"
                  value={stakeInput}
                  onChange={e => setStakeInput(e.target.value)}
                />
                <span className="sac-currency">EGLD</span>
              </div>
              <button
                className="sac-action-btn"
                onClick={handleStake}
                disabled={txPending || !address || !stakeInput}
              >
                {txPending ? 'Staking…' : '⚓ Stake EGLD'}
              </button>
            </div>
          )}

          {tab === 'unstake' && (
            <div className="sac-form">
              <label className="sac-label">Amount to unstake</label>
              <div className="sac-input-row">
                <input
                  type="number"
                  className="sac-input"
                  placeholder="0.0"
                  min="0"
                  step="0.01"
                  value={unstakeInput}
                  onChange={e => setUnstakeInput(e.target.value)}
                />
                <span className="sac-currency">EGLD</span>
              </div>
              <button
                className="sac-action-btn sac-action-btn--warn"
                onClick={handleUnstake}
                disabled={txPending || !address || !unstakeInput}
              >
                {txPending ? 'Unstaking…' : '↩ Unstake EGLD'}
              </button>
              <p className="sac-note">Max: {stakedEGLD} EGLD</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
