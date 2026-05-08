import React, { useState } from 'react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { useNft } from '../hooks/useNft';
import './FleetPage.css';

const SHIP_TYPE_LABELS: Record<number, string> = {
  0: 'Destroyer',
  1: 'Submarine',
  2: 'Cruiser',
  3: 'Battleship',
  4: 'Carrier',
};

const SHIP_ICONS: Record<number, string> = {
  0: '🚤', 1: '🤿', 2: '⚓', 3: '🛳', 4: '✈️',
};

export const FleetPage: React.FC = () => {
  const { account } = useGetAccountInfo();
  const { ships, mintPrice, mint, upgrade, loading, txPending } = useNft();
  const [selectedType, setSelectedType] = useState(0);
  const [shipName, setShipName] = useState('');

  const handleMint = () => {
    if (!shipName.trim()) return;
    mint(selectedType, shipName.trim());
    setShipName('');
  };

  return (
    <div className="fleet-page">
      <h1>⚓ My Fleet</h1>
      <p className="fleet-subtitle">Mint, upgrade and manage your ship NFTs.</p>

      {/* Mint panel */}
      <div className="mint-panel">
        <h2>Mint New Ship</h2>
        <div className="mint-form">
          <div className="type-selector">
            {Object.entries(SHIP_TYPE_LABELS).map(([val, label]) => (
              <button
                key={val}
                className={`type-btn ${selectedType === Number(val) ? 'active' : ''}`}
                onClick={() => setSelectedType(Number(val))}
              >
                {SHIP_ICONS[Number(val)]} {label}
              </button>
            ))}
          </div>
          <div className="name-row">
            <input
              type="text"
              placeholder="Ship name"
              value={shipName}
              onChange={e => setShipName(e.target.value)}
              maxLength={32}
            />
            <button
              className="btn-mint"
              onClick={handleMint}
              disabled={txPending || !shipName.trim()}
            >
              {txPending ? 'Minting…' : `Mint — ${formatEgld(mintPrice)} EGLD`}
            </button>
          </div>
        </div>
      </div>

      {/* Ship list */}
      {loading ? (
        <div className="fleet-loading">Loading fleet…</div>
      ) : ships.length === 0 ? (
        <div className="fleet-empty">
          <span>🌊</span>
          <p>No ships yet. Mint your first vessel above!</p>
        </div>
      ) : (
        <div className="ships-grid">
          {ships.map(ship => (
            <div key={ship.nonce} className="ship-card">
              <div className="ship-icon">{SHIP_ICONS[ship.shipType] ?? '🚢'}</div>
              <div className="ship-info">
                <h3>{ship.name}</h3>
                <span className="ship-type">{SHIP_TYPE_LABELS[ship.shipType]}</span>
                <div className="ship-stats">
                  <span>Lv.{ship.level}</span>
                  <span>🏆 {ship.wins}</span>
                  <span title={new Date(Number(ship.mintedAtMs)).toLocaleString()}>
                    🕐 {timeAgo(Number(ship.mintedAtMs))}
                  </span>
                </div>
              </div>
              {ship.level < 10 && (
                <button
                  className="btn-upgrade"
                  onClick={() => upgrade(ship.nonce)}
                  disabled={txPending}
                  title={`Upgrade cost: ${formatEgld(mintPrice * BigInt(ship.level))} EGLD`}
                >
                  ⬆ Upgrade
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function formatEgld(attoEgld: bigint | undefined): string {
  if (!attoEgld) return '?';
  return (Number(attoEgld) / 1e18).toFixed(3);
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const days = Math.floor(diff / 86_400_000);
  if (days > 0) return `${days}d ago`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours > 0) return `${hours}h ago`;
  const mins = Math.floor(diff / 60_000);
  return mins > 0 ? `${mins}m ago` : 'just now';
}

export default FleetPage;
