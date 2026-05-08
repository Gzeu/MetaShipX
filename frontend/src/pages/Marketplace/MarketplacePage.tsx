import React, { useState } from 'react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { useNft } from '../../hooks/useNft';
import { useSound } from '../../hooks/useSound';
import './MarketplacePage.css';

const SHIP_CATALOG = [
  { type: 'Destroyer',   size: 2, price: '0.05', rarity: 'Common',    icon: '🔫', color: '#64748b' },
  { type: 'Submarine',   size: 3, price: '0.08', rarity: 'Uncommon',  icon: '🤿', color: '#2563eb' },
  { type: 'Cruiser',     size: 3, price: '0.08', rarity: 'Uncommon',  icon: '⚓', color: '#2563eb' },
  { type: 'Battleship',  size: 4, price: '0.15', rarity: 'Rare',      icon: '🚢', color: '#7c3aed' },
  { type: 'Carrier',     size: 5, price: '0.30', rarity: 'Legendary', icon: '🛸', color: '#fbbf24' },
];

const RARITY_COLORS: Record<string, string> = {
  Common: '#64748b', Uncommon: '#2563eb', Rare: '#7c3aed', Legendary: '#fbbf24',
};

type Tab = 'mint' | 'fleet' | 'upgrade';

export default function MarketplacePage() {
  const { address } = useGetAccountInfo();
  const { ships, mintPrice, mint, upgrade, loading } = useNft();
  const { play } = useSound();
  const [tab, setTab] = useState<Tab>('mint');
  const [minting, setMinting] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState<number | null>(null);
  const [txMsg, setTxMsg] = useState<string | null>(null);

  const handleMint = async (shipType: string, price: string) => {
    if (!address || minting) return;
    setMinting(shipType);
    setTxMsg(null);
    try {
      await mint(shipType, price);
      play('join');
      setTxMsg(`✅ ${shipType} minted successfully!`);
    } catch (e) {
      setTxMsg(`❌ Mint failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setMinting(null);
    }
  };

  const handleUpgrade = async (nonce: number) => {
    if (!address || upgrading !== null) return;
    setUpgrading(nonce);
    setTxMsg(null);
    try {
      await upgrade(nonce);
      play('click');
      setTxMsg(`✅ Ship #${nonce} upgraded!`);
    } catch (e) {
      setTxMsg(`❌ Upgrade failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setUpgrading(null);
    }
  };

  return (
    <div className="mp-page">
      <div className="mp-hero">
        <h1 className="mp-title">⚓ Ship Marketplace</h1>
        <p className="mp-sub">Mint NFT ships, upgrade your fleet, and dominate the seas.</p>
      </div>

      {txMsg && (
        <div className={`mp-toast ${txMsg.startsWith('✅') ? 'mp-toast--ok' : 'mp-toast--err'}`}>
          {txMsg}
          <button className="mp-toast-close" onClick={() => setTxMsg(null)}>✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="mp-tabs">
        {(['mint', 'fleet', 'upgrade'] as Tab[]).map(t => (
          <button
            key={t}
            className={`mp-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'mint' ? '🪙 Mint' : t === 'fleet' ? '🚢 My Fleet' : '⬆️ Upgrade'}
          </button>
        ))}
      </div>

      {/* Mint tab */}
      {tab === 'mint' && (
        <div className="mp-catalog">
          {SHIP_CATALOG.map(ship => (
            <div key={ship.type} className="mp-card">
              <div className="mp-card-icon" style={{ color: ship.color }}>{ship.icon}</div>
              <div className="mp-card-body">
                <div className="mp-card-name">{ship.type}</div>
                <div className="mp-card-meta">
                  <span className="mp-rarity" style={{ color: RARITY_COLORS[ship.rarity] }}>
                    {ship.rarity}
                  </span>
                  <span className="mp-size">Size {ship.size}</span>
                </div>
                <div className="mp-card-cells">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div
                      key={i}
                      className={`mp-cell ${i < ship.size ? 'filled' : ''}`}
                    />
                  ))}
                </div>
              </div>
              <div className="mp-card-footer">
                <span className="mp-price">{ship.price} EGLD</span>
                <button
                  className="mp-mint-btn"
                  onClick={() => handleMint(ship.type, ship.price)}
                  disabled={!address || minting !== null}
                >
                  {minting === ship.type ? 'Minting…' : 'Mint'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fleet tab */}
      {tab === 'fleet' && (
        <div className="mp-fleet">
          {loading ? (
            <div className="mp-loading">
              <div className="mp-spinner" />
              <p>Loading your fleet…</p>
            </div>
          ) : !address ? (
            <div className="mp-empty">Connect your wallet to see your fleet.</div>
          ) : ships.length === 0 ? (
            <div className="mp-empty">
              <div className="mp-empty-icon">⚓</div>
              <p>No ships yet. Mint your first ship!</p>
              <button className="mp-mint-cta" onClick={() => setTab('mint')}>Go Mint</button>
            </div>
          ) : (
            <div className="mp-fleet-grid">
              {ships.map(ship => {
                const def = SHIP_CATALOG.find(s => s.type === ship.shipType);
                return (
                  <div key={ship.nonce} className="mp-fleet-card">
                    <div className="mp-fleet-icon" style={{ color: def?.color }}>{def?.icon ?? '🚢'}</div>
                    <div className="mp-fleet-info">
                      <div className="mp-fleet-name">{ship.shipType}</div>
                      <div className="mp-fleet-level">Level {ship.level}</div>
                      <div className="mp-fleet-wins">{ship.wins} wins</div>
                    </div>
                    <div className="mp-fleet-bar">
                      <div className="mp-fleet-fill" style={{ width: `${ship.level * 10}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Upgrade tab */}
      {tab === 'upgrade' && (
        <div className="mp-fleet">
          {!address ? (
            <div className="mp-empty">Connect your wallet to upgrade ships.</div>
          ) : ships.length === 0 ? (
            <div className="mp-empty">No ships to upgrade. Mint some first!</div>
          ) : (
            <div className="mp-upgrade-grid">
              {ships.map(ship => {
                const def = SHIP_CATALOG.find(s => s.type === ship.shipType);
                const upgCost = ((ship.level) * parseFloat(def?.price ?? '0.05')).toFixed(4);
                const maxLevel = ship.level >= 10;
                return (
                  <div key={ship.nonce} className="mp-upgrade-card">
                    <div className="mp-upg-icon" style={{ color: def?.color }}>{def?.icon ?? '🚢'}</div>
                    <div className="mp-upg-info">
                      <div className="mp-upg-name">{ship.shipType} <span className="mp-upg-nonce">#{ship.nonce}</span></div>
                      <div className="mp-upg-level">
                        {'★'.repeat(ship.level)}{'☆'.repeat(10 - ship.level)}
                      </div>
                    </div>
                    <div className="mp-upg-action">
                      {maxLevel ? (
                        <span className="mp-upg-max">MAX</span>
                      ) : (
                        <>
                          <span className="mp-upg-cost">{upgCost} EGLD</span>
                          <button
                            className="mp-upg-btn"
                            onClick={() => handleUpgrade(ship.nonce)}
                            disabled={upgrading !== null}
                          >
                            {upgrading === ship.nonce ? '…' : '⬆'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
