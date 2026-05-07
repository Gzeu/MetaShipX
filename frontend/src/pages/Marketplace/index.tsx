import React, { useState, useEffect } from 'react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import {
  mintShip, upgradeShip, getUserShips, getShipMetadata,
  getMintPrice, ShipType, ShipMetadata, SHIP_TYPE_INDEX,
} from '../../services/nft.service';
import './Marketplace.css';

const SHIP_CATALOG: { type: ShipType; length: number; desc: string; rarity: string }[] = [
  { type: 'Carrier',    length: 5, desc: 'The flagship. Dominates the board.', rarity: 'Legendary' },
  { type: 'Battleship', length: 4, desc: 'Firepower and resilience.',           rarity: 'Epic' },
  { type: 'Cruiser',    length: 3, desc: 'Balanced speed and armor.',           rarity: 'Rare' },
  { type: 'Submarine',  length: 3, desc: 'Stealthy strike capability.',         rarity: 'Rare' },
  { type: 'Destroyer',  length: 2, desc: 'Fast, nimble, first to strike.',      rarity: 'Common' },
];

const RARITY_CLASS: Record<string, string> = {
  Common: 'rarity-common',
  Rare: 'rarity-rare',
  Epic: 'rarity-epic',
  Legendary: 'rarity-legendary',
};

const MarketplacePage: React.FC = () => {
  const { address } = useGetAccountInfo();
  const [mintPrice, setMintPrice] = useState<string | null>(null);
  const [ownedShips, setOwnedShips] = useState<ShipMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mint modal
  const [mintTarget, setMintTarget] = useState<typeof SHIP_CATALOG[0] | null>(null);
  const [mintName, setMintName] = useState('');

  // Upgrade modal
  const [upgradeTarget, setUpgradeTarget] = useState<ShipMetadata | null>(null);

  const [tab, setTab] = useState<'catalog' | 'fleet'>('catalog');

  useEffect(() => {
    getMintPrice().then(setMintPrice).catch(() => {});
  }, []);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    getUserShips(address)
      .then((nonces) => Promise.all(nonces.map(getShipMetadata)))
      .then(setOwnedShips)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [address]);

  const handleMint = async () => {
    if (!mintTarget || !mintName.trim()) return;
    setLoading(true); setError(null);
    try {
      const priceEgld = mintPrice ? (Number(BigInt(mintPrice)) / 1e18).toString() : '0.05';
      await mintShip(mintTarget.type, mintName.trim(), priceEgld);
      setMintTarget(null);
      setMintName('');
      // Refresh fleet
      if (address) {
        const nonces = await getUserShips(address);
        const ships = await Promise.all(nonces.map(getShipMetadata));
        setOwnedShips(ships);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!upgradeTarget || !mintPrice) return;
    setLoading(true); setError(null);
    try {
      const baseEgld = Number(BigInt(mintPrice)) / 1e18;
      const costEgld = (baseEgld * upgradeTarget.level).toString();
      await upgradeShip(upgradeTarget.nonce, costEgld);
      setUpgradeTarget(null);
      if (address) {
        const nonces = await getUserShips(address);
        const ships = await Promise.all(nonces.map(getShipMetadata));
        setOwnedShips(ships);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const mintPriceEgld = mintPrice ? (Number(BigInt(mintPrice)) / 1e18).toFixed(4) : '...';

  return (
    <div className="marketplace-page">
      <div className="marketplace-hero">
        <h1>🚢 Ship Marketplace</h1>
        <p>Mint unique NFT ships to use in MetaShipX battles. Upgrade them to increase power.</p>
        <div className="mint-price-badge">Mint Price: <strong>{mintPriceEgld} EGLD</strong></div>
      </div>

      {error && <div className="marketplace-error">{error}</div>}

      <div className="marketplace-tabs">
        <button className={`mp-tab${tab === 'catalog' ? ' mp-tab--active' : ''}`} onClick={() => setTab('catalog')}>Ship Catalog</button>
        <button className={`mp-tab${tab === 'fleet' ? ' mp-tab--active' : ''}`} onClick={() => setTab('fleet')}>
          My Fleet {ownedShips.length > 0 && <span className="fleet-count">{ownedShips.length}</span>}
        </button>
      </div>

      {/* CATALOG */}
      {tab === 'catalog' && (
        <div className="ship-catalog">
          {SHIP_CATALOG.map((ship) => (
            <div key={ship.type} className="ship-card">
              <div className="ship-card-top">
                <div className="ship-visual">
                  {Array.from({ length: ship.length }).map((_, i) => (
                    <div key={i} className="ship-block" />
                  ))}
                </div>
                <span className={`ship-rarity ${RARITY_CLASS[ship.rarity]}`}>{ship.rarity}</span>
              </div>
              <div className="ship-card-body">
                <h3 className="ship-name">{ship.type}</h3>
                <p className="ship-desc">{ship.desc}</p>
                <div className="ship-stats">
                  <span>Length: <strong>{ship.length}</strong></span>
                </div>
              </div>
              <button
                className="btn-mint"
                onClick={() => { setMintTarget(ship); setMintName(ship.type + ' #' + Math.floor(Math.random() * 9000 + 1000)); }}
                disabled={!address}
              >
                ⚓ Mint for {mintPriceEgld} EGLD
              </button>
            </div>
          ))}
        </div>
      )}

      {/* FLEET */}
      {tab === 'fleet' && (
        <div className="fleet-section">
          {!address && <div className="fleet-empty">🔌 Connect your wallet to view your fleet.</div>}
          {address && loading && <div className="fleet-empty">⏳ Loading your ships...</div>}
          {address && !loading && ownedShips.length === 0 && (
            <div className="fleet-empty">
              <div style={{ fontSize: '2rem' }}>🌊</div>
              <p>You have no ships yet. Mint one from the catalog!</p>
              <button className="btn-primary-sm" onClick={() => setTab('catalog')}>Go to Catalog</button>
            </div>
          )}
          <div className="ship-catalog">
            {ownedShips.map((ship) => (
              <div key={ship.nonce} className="ship-card ship-card--owned">
                <div className="ship-card-top">
                  <div className="ship-visual">
                    {Array.from({ length: SHIP_CATALOG.find(s => s.type === ship.shipType)?.length ?? 3 }).map((_, i) => (
                      <div key={i} className="ship-block ship-block--owned" />
                    ))}
                  </div>
                  <span className="ship-level">Lvl {ship.level}</span>
                </div>
                <div className="ship-card-body">
                  <h3 className="ship-name">{ship.name}</h3>
                  <p className="ship-type-tag">{ship.shipType}</p>
                  <div className="ship-stats">
                    <span>🏆 Wins: <strong>{ship.wins}</strong></span>
                    <span>Level: <strong>{ship.level}/10</strong></span>
                  </div>
                  <div className="ship-level-bar">
                    <div className="ship-level-fill" style={{ width: `${ship.level * 10}%` }} />
                  </div>
                </div>
                <button
                  className="btn-upgrade"
                  onClick={() => setUpgradeTarget(ship)}
                  disabled={ship.level >= 10}
                >
                  {ship.level >= 10 ? '✨ Max Level' : `⬆️ Upgrade to Lvl ${ship.level + 1}`}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MINT MODAL */}
      {mintTarget && (
        <div className="modal-overlay" onClick={() => setMintTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Mint {mintTarget.type}</h2>
            <p>{mintTarget.desc}</p>
            <label>Ship Name
              <input
                type="text"
                value={mintName}
                onChange={(e) => setMintName(e.target.value)}
                placeholder="Enter a name for your ship"
                maxLength={32}
              />
            </label>
            <div className="modal-cost">Cost: <strong>{mintPriceEgld} EGLD</strong></div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setMintTarget(null)}>Cancel</button>
              <button className="btn-confirm" onClick={handleMint} disabled={loading || !mintName.trim()}>
                {loading ? 'Minting...' : '⚓ Confirm Mint'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPGRADE MODAL */}
      {upgradeTarget && mintPrice && (
        <div className="modal-overlay" onClick={() => setUpgradeTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Upgrade {upgradeTarget.name}</h2>
            <p>Upgrade from <strong>Level {upgradeTarget.level}</strong> to <strong>Level {upgradeTarget.level + 1}</strong>.</p>
            <div className="modal-cost">
              Cost: <strong>{((Number(BigInt(mintPrice)) / 1e18) * upgradeTarget.level).toFixed(4)} EGLD</strong>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setUpgradeTarget(null)}>Cancel</button>
              <button className="btn-confirm" onClick={handleUpgrade} disabled={loading}>
                {loading ? 'Upgrading...' : '⬆️ Confirm Upgrade'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplacePage;
