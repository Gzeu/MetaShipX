import React, { useState, useEffect, useCallback } from 'react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { stakingService } from '../../services/staking.service';
import './staking-page.css';

interface StakingInfo {
  stakedAmount: string;
  pendingRewards: string;
  totalStaked: string;
  rewardPool: string;
  apr: number;
}

const EMPTY: StakingInfo = {
  stakedAmount: '0', pendingRewards: '0',
  totalStaked: '0', rewardPool: '0', apr: 20,
};

export const StakingPage: React.FC = () => {
  const { address } = useGetAccountInfo();

  const [info, setInfo]           = useState<StakingInfo>(EMPTY);
  const [loading, setLoading]     = useState(false);
  const [stakeAmt, setStakeAmt]   = useState('');
  const [unstakeAmt, setUnstakeAmt] = useState('');
  const [txPending, setTxPending] = useState<string | null>(null); // 'stake'|'unstake'|'claim'
  const [tab, setTab]             = useState<'stake' | 'unstake'>('stake');

  const egld  = (v: string | number) => (Number(BigInt(String(v))) / 1e18).toFixed(4);
  const egldF = (v: string)          => parseFloat(v) >= 0 ? egld(v) : '0.0000';

  const loadInfo = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const data = await stakingService.getStakingInfo(address);
      setInfo(data);
    } catch {
      /* silently ignore if contract not deployed */
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { loadInfo(); }, [loadInfo]);

  const handleStake = async () => {
    if (!stakeAmt || !address) return;
    setTxPending('stake');
    try {
      const wei = BigInt(Math.round(parseFloat(stakeAmt) * 1e18)).toString();
      await stakingService.stake(wei);
      setStakeAmt('');
      await loadInfo();
    } catch (e: any) { alert(e?.message); }
    finally { setTxPending(null); }
  };

  const handleUnstake = async () => {
    if (!unstakeAmt || !address) return;
    setTxPending('unstake');
    try {
      const wei = BigInt(Math.round(parseFloat(unstakeAmt) * 1e18)).toString();
      await stakingService.unstake(wei);
      setUnstakeAmt('');
      await loadInfo();
    } catch (e: any) { alert(e?.message); }
    finally { setTxPending(null); }
  };

  const handleClaim = async () => {
    if (!address) return;
    setTxPending('claim');
    try {
      await stakingService.claimRewards();
      await loadInfo();
    } catch (e: any) { alert(e?.message); }
    finally { setTxPending(null); }
  };

  const stakedEgld  = egldF(info.stakedAmount);
  const pendingEgld = egldF(info.pendingRewards);
  const totalEgld   = egldF(info.totalStaked);
  const poolEgld    = egldF(info.rewardPool);
  const sharePercent = info.totalStaked !== '0'
    ? ((Number(BigInt(info.stakedAmount)) / Number(BigInt(info.totalStaked))) * 100).toFixed(2)
    : '0.00';

  return (
    <div className="sp">
      {/* Header */}
      <header className="sp__header">
        <div>
          <h1 className="sp__title">💰 EGLD Staking</h1>
          <p className="sp__subtitle">Blochează EGLD în pool pentru a primi recompense din meciuri</p>
        </div>
        <div className={`sp__apr-badge ${info.apr >= 20 ? 'sp__apr-badge--high' : ''}`}>
          APR {info.apr}%
        </div>
      </header>

      {/* Global stats */}
      <div className="sp__global-stats">
        <div className="sp-stat">
          <span className="sp-stat__val">{totalEgld}</span>
          <span className="sp-stat__lbl">Total Staked EGLD</span>
        </div>
        <div className="sp-stat">
          <span className="sp-stat__val">{poolEgld}</span>
          <span className="sp-stat__lbl">Reward Pool EGLD</span>
        </div>
        <div className="sp-stat">
          <span className="sp-stat__val">{info.apr}%</span>
          <span className="sp-stat__lbl">APR</span>
        </div>
      </div>

      {!address ? (
        <div className="sp__connect">
          <p>Conectează wallet-ul MultiversX pentru a putea stake.</p>
        </div>
      ) : (
        <div className="sp__body">
          {/* My position card */}
          <div className="sp__position">
            <h2 className="sp__section-title">Poziția Ta</h2>
            <div className="position-grid">
              <div className="position-item">
                <span className="position-item__val">{stakedEgld}</span>
                <span className="position-item__lbl">EGLD Staked</span>
              </div>
              <div className="position-item position-item--rewards">
                <span className="position-item__val">{pendingEgld}</span>
                <span className="position-item__lbl">Recompense pending</span>
              </div>
              <div className="position-item">
                <span className="position-item__val">{sharePercent}%</span>
                <span className="position-item__lbl">Cotă pool</span>
              </div>
            </div>

            {/* Claim button */}
            {parseFloat(pendingEgld) > 0 && (
              <button
                className="btn btn--claim"
                disabled={txPending === 'claim'}
                onClick={handleClaim}
              >
                {txPending === 'claim'
                  ? 'Se revendică...'
                  : `⚡ Claim ${pendingEgld} EGLD`}
              </button>
            )}
          </div>

          {/* Stake / Unstake panel */}
          <div className="sp__panel">
            <div className="sp__tabs">
              <button
                className={`sp-tab ${tab === 'stake' ? 'sp-tab--active' : ''}`}
                onClick={() => setTab('stake')}
              >Stake</button>
              <button
                className={`sp-tab ${tab === 'unstake' ? 'sp-tab--active' : ''}`}
                onClick={() => setTab('unstake')}
              >Unstake</button>
            </div>

            {tab === 'stake' && (
              <div className="sp__form">
                <label className="sp__form-label">
                  Cantitate EGLD
                  <div className="sp__input-wrap">
                    <input
                      className="sp__input"
                      type="number"
                      min="0.001"
                      step="0.1"
                      placeholder="0.00"
                      value={stakeAmt}
                      onChange={e => setStakeAmt(e.target.value)}
                    />
                    <span className="sp__input-suffix">EGLD</span>
                  </div>
                </label>
                <div className="sp__form-hint">
                  Recompensele se calculează continuu. Minimum nu este impus.
                </div>
                <button
                  className="btn btn--primary btn--full"
                  disabled={!stakeAmt || txPending === 'stake'}
                  onClick={handleStake}
                >
                  {txPending === 'stake' ? 'Se trimite...' : `Stake ${stakeAmt || '0'} EGLD`}
                </button>
              </div>
            )}

            {tab === 'unstake' && (
              <div className="sp__form">
                <label className="sp__form-label">
                  Cantitate de retras
                  <div className="sp__input-wrap">
                    <input
                      className="sp__input"
                      type="number"
                      min="0.001"
                      step="0.1"
                      placeholder="0.00"
                      value={unstakeAmt}
                      onChange={e => setUnstakeAmt(e.target.value)}
                    />
                    <span className="sp__input-suffix">EGLD</span>
                  </div>
                </label>
                <button
                  className="btn btn--ghost-red btn--full"
                  onClick={() => setUnstakeAmt(stakedEgld)}
                >Max: {stakedEgld} EGLD</button>
                <div className="sp__form-hint">
                  Unstake-ul face auto-claim al recompenselor pending.
                </div>
                <button
                  className="btn btn--danger btn--full"
                  disabled={!unstakeAmt || txPending === 'unstake'}
                  onClick={handleUnstake}
                >
                  {txPending === 'unstake' ? 'Se retrage...' : `Retrage ${unstakeAmt || '0'} EGLD`}
                </button>
              </div>
            )}
          </div>

          {/* APR explainer */}
          <div className="sp__explainer">
            <h3>💡 Cum funcționează?</h3>
            <ul>
              <li>Mecițurilede battleship alimentează pool-ul cu o cotă din fiecare pariu.</li>
              <li>Recompensele se calculează <strong>continuu</strong> proporțional cu cota ta din pool.</li>
              <li>Formula: <code>reward = staked × APR × elapsed / 365 days</code></li>
              <li>APR curent: <strong>{info.apr}%</strong> pe an, ajustat de owner.</li>
              <li>Unstake-ul automat face claim, deci nu pierzi recompensele acumulate.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default StakingPage;
