import React, { useState } from 'react';
import { useStaking } from '../hooks/useStaking';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import './StakingPage.css';

function formatEgld(raw: string, decimals = 4): string {
  try {
    const val = Number(BigInt(raw)) / 1e18;
    return val.toFixed(decimals);
  } catch {
    return '0';
  }
}

export default function StakingPage() {
  const { address }     = useGetAccountInfo();
  const { info, loading, error, stake, unstake, claimRewards } = useStaking();
  const [stakeInput, setStakeInput]     = useState('');
  const [unstakeInput, setUnstakeInput] = useState('');
  const [txPending, setTxPending]       = useState(false);
  const [txMsg, setTxMsg]               = useState('');

  const apr         = info ? (Number(info.apr) / 100).toFixed(2) : '20.00';
  const staked      = info?.stakeInfo?.amount         ?? '0';
  const pending     = info?.stakeInfo?.pendingRewards ?? '0';
  const totalStaked = info?.totalStaked               ?? '0';
  const rewardPool  = info?.rewardPool                ?? '0';

  async function wrap(fn: () => Promise<void>, successMsg: string) {
    setTxPending(true); setTxMsg('');
    try {
      await fn();
      setTxMsg(`✅ ${successMsg}`);
    } catch (e: unknown) {
      setTxMsg(`❌ ${e instanceof Error ? e.message : 'Transaction failed'}`);
    } finally {
      setTxPending(false);
    }
  }

  return (
    <main className="staking-page">
      <h1 className="staking-title">⚓ Staking</h1>

      <div className="staking-stats">
        <div className="staking-stat">
          <span className="stat-label">APR</span>
          <span className="stat-value stat-value--accent">{apr}%</span>
        </div>
        <div className="staking-stat">
          <span className="stat-label">Total Staked</span>
          <span className="stat-value">{formatEgld(totalStaked)} EGLD</span>
        </div>
        <div className="staking-stat">
          <span className="stat-label">Reward Pool</span>
          <span className="stat-value">{formatEgld(rewardPool)} EGLD</span>
        </div>
      </div>

      {!address ? (
        <div className="staking-connect">
          <p>Connect your wallet to start staking.</p>
          <a href="/unlock" className="btn btn-primary">Connect Wallet</a>
        </div>
      ) : (
        <>
          <div className="staking-personal">
            <div className="staking-stat">
              <span className="stat-label">Your Stake</span>
              <span className="stat-value">{formatEgld(staked)} EGLD</span>
            </div>
            <div className="staking-stat">
              <span className="stat-label">Pending Rewards</span>
              <span className="stat-value stat-value--green">{formatEgld(pending)} EGLD</span>
            </div>
          </div>

          <div className="staking-actions">
            <div className="staking-action-card">
              <h2>Stake EGLD</h2>
              <div className="staking-input-row">
                <input
                  type="number" min="0" step="0.01"
                  placeholder="Amount EGLD"
                  value={stakeInput}
                  onChange={e => setStakeInput(e.target.value)}
                  disabled={txPending}
                  aria-label="Stake amount in EGLD"
                />
                <button
                  className="btn btn-primary"
                  onClick={() => wrap(() => stake(stakeInput), 'Stake submitted!')}
                  disabled={txPending || !stakeInput}
                >Stake</button>
              </div>
            </div>

            <div className="staking-action-card">
              <h2>Unstake EGLD</h2>
              <div className="staking-input-row">
                <input
                  type="number" min="0" step="0.01"
                  placeholder="Amount EGLD"
                  value={unstakeInput}
                  onChange={e => setUnstakeInput(e.target.value)}
                  disabled={txPending}
                  aria-label="Unstake amount in EGLD"
                />
                <button
                  className="btn btn-secondary"
                  onClick={() => wrap(() => unstake(unstakeInput), 'Unstake submitted!')}
                  disabled={txPending || !unstakeInput}
                >Unstake</button>
              </div>
            </div>

            <div className="staking-action-card">
              <h2>Claim Rewards</h2>
              <p className="staking-reward-preview">
                Available: <strong>{formatEgld(pending)} EGLD</strong>
              </p>
              <button
                className="btn btn-accent"
                onClick={() => wrap(claimRewards, 'Claim submitted!')}
                disabled={txPending || pending === '0'}
              >Claim</button>
            </div>
          </div>

          {txMsg && (
            <p
              role="status"
              className={`staking-tx-msg${txMsg.startsWith('✅') ? ' staking-tx-msg--ok' : ' staking-tx-msg--err'}`}
            >
              {txMsg}
            </p>
          )}
        </>
      )}

      {error && <p className="staking-error" role="alert">⚠ {error}</p>}
    </main>
  );
}
