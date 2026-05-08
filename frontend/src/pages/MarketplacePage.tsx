import React, { useEffect, useState } from 'react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { nftService, ShipMetadata } from '../services/nft.service';
import './MarketplacePage.css';

const SHIP_TYPES = ['Destroyer', 'Submarine', 'Cruiser', 'Battleship', 'Carrier'] as const;
type ShipType = typeof SHIP_TYPES[number];

const SHIP_PRICES: Record<ShipType, string> = {
  Destroyer: '0.05',
  Submarine: '0.08',
  Cruiser: '0.12',
  Battleship: '0.18',
  Carrier: '0.25',
};

const SHIP_EMOJI: Record<ShipType, string> = {
  Destroyer: '🚤',
  Submarine: '🤿',
  Cruiser: '⛵',
  Battleship: '🛥️',
  Carrier: '🛳️',
};

const TABS = ['Mint Ship', 'My Fleet', 'Upgrade'] as const;
type Tab = typeof TABS[number];

export const MarketplacePage: React.FC = () => {
  const { address } = useGetAccountInfo();
  const [activeTab, setActiveTab] = useState<Tab>('Mint Ship');
  const [mintPrice, setMintPrice] = useState<string>('0');
  const [userShips, setUserShips] = useState<ShipMetadata[]>([]);
  const [selectedShip, setSelectedShip] = useState<ShipType>('Destroyer');
  const [upgradeNonce, setUpgradeNonce] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [confirmMint, setConfirmMint] = useState(false);

  useEffect(() => {
    nftService.getMintPrice().then(setMintPrice);
  }, []);

  useEffect(() => {
    if (address) {
      nftService.getUserShips(address).then(setUserShips);
    }
  }, [address]);

  const handleMint = async () => {
    if (!address) return;
    setLoading(true);
    setFeedback(null);
    try {
      await nftService.mintShip(address, selectedShip, `${selectedShip} #${Date.now()}`);
      setFeedback({ ok: true, msg: `${selectedShip} minted! Check wallet for confirmation.` });
      setConfirmMint(false);
      const ships = await nftService.getUserShips(address);
      setUserShips(ships);
    } catch (e: unknown) {
      setFeedback({ ok: false, msg: e instanceof Error ? e.message : 'Mint failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!address || !upgradeNonce) return;
    setLoading(true);
    setFeedback(null);
    try {
      await nftService.upgradeShip(address, parseInt(upgradeNonce, 10));
      setFeedback({ ok: true, msg: `Ship #${upgradeNonce} upgrade transaction sent!` });
      const ships = await nftService.getUserShips(address);
      setUserShips(ships);
    } catch (e: unknown) {
      setFeedback({ ok: false, msg: e instanceof Error ? e.message : 'Upgrade failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="marketplace-page">
      <h1 className="mp-title">⚓ Ship Marketplace</h1>

      <div className="mp-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`mp-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {feedback && (
        <div className={`mp-feedback ${feedback.ok ? 'ok' : 'err'}`}>{feedback.msg}</div>
      )}

      {activeTab === 'Mint Ship' && (
        <div className="mp-mint-section">
          <p className="mp-subtitle">Select a ship type to mint as NFT on MultiversX</p>
          <div className="ship-grid">
            {SHIP_TYPES.map((ship) => (
              <button
                key={ship}
                className={`ship-card ${selectedShip === ship ? 'selected' : ''}`}
                onClick={() => { setSelectedShip(ship); setConfirmMint(false); }}
              >
                <span className="ship-emoji">{SHIP_EMOJI[ship]}</span>
                <span className="ship-name">{ship}</span>
                <span className="ship-price">{SHIP_PRICES[ship]} EGLD</span>
              </button>
            ))}
          </div>

          {!confirmMint ? (
            <button className="btn-primary" onClick={() => setConfirmMint(true)} disabled={!address}>
              Mint {selectedShip}
            </button>
          ) : (
            <div className="confirm-panel">
              <p>Confirm mint of <strong>{selectedShip}</strong> for <strong>{SHIP_PRICES[selectedShip]} EGLD</strong>?</p>
              <div className="confirm-actions">
                <button className="btn-primary" onClick={handleMint} disabled={loading}>
                  {loading ? 'Sending…' : 'Confirm'}
                </button>
                <button className="btn-ghost" onClick={() => setConfirmMint(false)}>Cancel</button>
              </div>
            </div>
          )}

          {!address && <p className="mp-warn">Connect wallet to mint ships.</p>}
        </div>
      )}

      {activeTab === 'My Fleet' && (
        <div className="mp-fleet-section">
          {userShips.length === 0 ? (
            <div className="fleet-empty">
              <span>🌊</span>
              <p>No ships yet. Mint your first ship!</p>
              <button className="btn-primary" onClick={() => setActiveTab('Mint Ship')}>Go to Mint</button>
            </div>
          ) : (
            <div className="fleet-grid">
              {userShips.map((ship) => (
                <div key={ship.nonce} className="fleet-card">
                  <div className="fleet-card-emoji">{SHIP_EMOJI[ship.shipType as ShipType] ?? '🚢'}</div>
                  <div className="fleet-card-name">{ship.name}</div>
                  <div className="fleet-card-meta">
                    <span>Type: {ship.shipType}</span>
                    <span>Level: {ship.level}</span>
                    <span>Wins: {ship.wins}</span>
                  </div>
                  <div className="fleet-card-nonce">Nonce #{ship.nonce}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'Upgrade' && (
        <div className="mp-upgrade-section">
          <p className="mp-subtitle">Upgrade a ship to increase its level (max 10)</p>
          <div className="upgrade-form">
            <label htmlFor="upgrade-nonce">Ship Nonce</label>
            <input
              id="upgrade-nonce"
              type="number"
              min={1}
              placeholder="e.g. 1"
              value={upgradeNonce}
              onChange={(e) => setUpgradeNonce(e.target.value)}
            />
            <button className="btn-primary" onClick={handleUpgrade} disabled={loading || !upgradeNonce || !address}>
              {loading ? 'Sending…' : 'Upgrade Ship'}
            </button>
          </div>
          {!address && <p className="mp-warn">Connect wallet to upgrade ships.</p>}
        </div>
      )}
    </div>
  );
};

export default MarketplacePage;
