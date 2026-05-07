import React, { useState } from 'react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { useStaking } from '../../hooks/useStaking';
import './Staking.css';

function formatEgld(atto: string): string {
  const val = Number(BigInt(atto || '0')) / 1e18;
  return val.toLocaleString('en', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function formatApr(numerator: number): string {
  return ((numerator / 10_000) * 100).toFixed(1) + '%';
}

function timeAgo(ts: number): string {
  if (!ts) return '—';
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const StakingPage: React.FC = () => {
  const { address } = useGetAccountInfo();
  const { info, loading, error, handleStake, handleUnstake, handleClaim, refresh } = useStaking(address || null);

  const [stakeInput, setStakeInput] = useState('1');
  const [unstakeInput, setUnstakeInput] = useState('1');
  const [activeTab, setActiveTab] = useState<'stake' | 'unstake'>('stake');

  const hasStake = info && info.amount !== '0';
  const pendingEgld = info ? Number(BigInt(info.pendingRewards || '0')) / 1e18 : 0;

  return (
    <div className="staking-page">
      <div className="staking-hero">
        <h1>⚓ Staking Pool</h1>
        <p>Stake EGLD to earn rewards from the MetaShipX prize pool. Rewards accrue every second.</p>
      </div>

      {error && <div className="staking-error">{error}</div>}

      {/* Global stats */}
      <div className="staking-stats">
        <div className="stat-card">
          <span className="stat-label">APR</span>
          <span className="stat-value stat-value--green">{info ? formatApr(info.apr) : '—'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Staked</span>
          <span className="stat-value">{info ? formatEgld(info.totalStaked) : '—'} EGLD</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Reward Pool</span>
          <span className="stat-value">{info ? formatEgld(info.rewardPool) : '—'} EGLD</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Your Stake</span>
          <span className="stat-value">{info ? formatEgld(info.amount) : '—'} EGLD</span>
        </div>
      </div>

      {/* Pending rewards banner */}
      {hasStake && (
        <div className="staking-rewards-banner">
          <div className="rewards-info">
            <span className="rewards-label">Pending Rewards</span>
            <span className="rewards-amount">{pendingEgld.toFixed(6)} EGLD</span>
            <span className="rewards-meta">Staked {timeAgo(info!.stakedAt)} · Last claimed {timeAgo(info!.lastClaimed)}</span>
          </div>
          <button
            className="btn btn-claim"
            onClick={handleClaim}
            disabled={loading || pendingEgld < 0.000001}
          >
            {loading ? '⏳ Claiming...' : '💰 Claim Rewards'}
          </button>
        </div>
      )}

      {/* Stake / Unstake form */}
      <div className="staking-card">
        <div className="staking-tabs">
          <button
            className={`staking-tab${activeTab === 'stake' ? ' staking-tab--active' : ''}`}
            onClick={() => setActiveTab('stake')}
          >Stake</button>
          <button
            className={`staking-tab${activeTab === 'unstake' ? ' staking-tab--active' : ''}`}
            onClick={() => setActiveTab('unstake')}
            disabled={!hasStake}
          >Unstake</button>
        </div>

        {activeTab === 'stake' && (
          <div className="staking-form">
            <label>Amount (EGLD)
              <input
                type="number" min="0.01" step="0.01"
                value={stakeInput}
                onChange={(e) => setStakeInput(e.target.value)}
              />
            </label>
            <div className="staking-preview">
              Estimated annual return: <strong>{(parseFloat(stakeInput || '0') * (info?.apr ?? 2000) / 10_000).toFixed(4)} EGLD</strong>
            </div>
            <button
              className="btn btn-primary btn-full"
              onClick={() => handleStake(stakeInput)}
              disabled={loading || !address}
            >
              {loading ? 'Processing...' : '⚓ Stake EGLD'}
            </button>
          </div>
        )}

        {activeTab === 'unstake' && (
          <div className="staking-form">
            <label>Amount (EGLD)
              <input
                type="number" min="0.01" step="0.01"
                max={info ? formatEgld(info.amount) : undefined}
                value={unstakeInput}
                onChange={(e) => setUnstakeInput(e.target.value)}
              />
            </label>
            <div className="staking-preview">
              Available to unstake: <strong>{info ? formatEgld(info.amount) : '—'} EGLD</strong>
            </div>
            <button
              className="btn btn-danger btn-full"
              onClick={() => handleUnstake(unstakeInput)}
              disabled={loading || !hasStake}
            >
              {loading ? 'Processing...' : '⬇️ Unstake EGLD'}
            </button>
          </div>
        )}
      </div>

      {/* History */}
      {hasStake && (
        <div className="staking-history">
          <h3>Your Staking Summary</h3>
          <div className="history-row">
            <span>Total Ever Claimed</span>
            <span>{formatEgld(info!.totalClaimed)} EGLD</span>
          </div>
          <div className="history-row">
            <span>Staking Since</span>
            <span>{info!.stakedAt ? new Date(info!.stakedAt * 1000).toLocaleDateString() : '—'}</span>
          </div>
        </div>
      )}

      {!address && (
        <div className="staking-connect-prompt">
          🔌 Connect your MultiversX wallet to stake
        </div>
      )}
    </div>
  );
};

export default StakingPage;
