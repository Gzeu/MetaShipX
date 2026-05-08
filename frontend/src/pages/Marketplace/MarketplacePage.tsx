import React, { useEffect, useState } from 'react';
import { useGetAccountInfo, useGetIsLoggedIn } from '@multiversx/sdk-dapp/hooks';
import { getUserShips, mintShip, getMintPrice, ShipInfo } from '../../services/nft.service';
import { playButtonClick, playPlacement } from '../../utils/sounds';
import './MarketplacePage.css';

const SHIP_CATALOG = [
  { type: 'Destroyer',  size: 2, rarity: 'Common',    price: '0.05', emoji: '🛥' },
  { type: 'Submarine',  size: 3, rarity: 'Uncommon',  price: '0.08', emoji: '🤿' },
  { type: 'Cruiser',    size: 3, rarity: 'Uncommon',  price: '0.08', emoji: '⛵' },
  { type: 'Battleship', size: 4, rarity: 'Rare',      price: '0.15', emoji: '🚢' },
  { type: 'Carrier',    size: 5, rarity: 'Legendary', price: '0.30', emoji: '🛸' },
] as const;

const RARITY_COLOR: Record<string, string> = {
  Common: '#64748b',
  Uncommon: '#4ade80',
  Rare: '#7dd3fc',
  Legendary: '#fbbf24',
};

type Tab = 'mint' | 'fleet';

export default function MarketplacePage() {
  const { address } = useGetAccountInfo();
  const isLoggedIn = useGetIsLoggedIn();
  const [tab, setTab] = useState<Tab>('mint');
  const [myShips, setMyShips] = useState<ShipInfo[]>([]);
  const [mintPrice, setMintPrice] = useState<string>('0.05');
  const [minting, setMinting] = useState<string | null>(null);
  const [loadingFleet, setLoadingFleet] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    getMintPrice().then(p => setMintPrice(p)).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'fleet' && address) {
      setLoadingFleet(true);
      getUserShips(address)
        .then(ships => setMyShips(ships))
        .finally(() => setLoadingFleet(false));
    }
  }, [tab, address]);

  const handleMint = async (shipType: string, price: string) => {
    if (!isLoggedIn || minting) return;
    playButtonClick();
    setMinting(shipType);
    setTxHash(null);
    try {
      const hash = await mintShip(shipType, price);
      setTxHash(hash);
      playPlacement();
    } catch (e) {
      console.error(e);
    } finally {
      setMinting(null);
    }
  };

  return (
    <div className="mp-page">
      <div className="mp-hero">
        <h1 className="mp-title">🚢 Ship Marketplace</h1>
        <p className="mp-sub">Mint NFT ships to command in battle. Each ship is a unique SFT on MultiversX.</p>
      </div>

      <div className="mp-tabs">
        <button className={`mp-tab ${tab === 'mint' ? 'active' : ''}`} onClick={() => { setTab('mint'); playButtonClick(); }}>Mint Ships</button>
        <button className={`mp-tab ${tab === 'fleet' ? 'active' : ''}`} onClick={() => { setTab('fleet'); playButtonClick(); }}>My Fleet ({myShips.length})</button>
      </div>

      {txHash && (
        <div className="mp-tx-success">
          ✅ Transaction sent! <a href={`https://devnet-explorer.multiversx.com/transactions/${txHash}`} target="_blank" rel="noopener noreferrer">View on Explorer ↗</a>
        </div>
      )}

      {tab === 'mint' && (
        <div className="mp-catalog">
          {SHIP_CATALOG.map(ship => (
            <div key={ship.type} className={`mp-card rarity-${ship.rarity.toLowerCase()}`}>
              <div className="mp-card-emoji">{ship.emoji}</div>
              <div className="mp-card-name">{ship.type}</div>
              <div className="mp-card-rarity" style={{ color: RARITY_COLOR[ship.rarity] }}>
                {ship.rarity}
              </div>
              <div className="mp-card-stats">
                <span>Size: {ship.size}</span>
                <span>Cells</span>
              </div>
              <div className="mp-card-ship-viz">
                {Array.from({ length: ship.size }).map((_, i) => (
                  <div key={i} className="mp-ship-cell" />
                ))}
              </div>
              <div className="mp-card-price">{ship.price} EGLD</div>
              <button
                className="mp-mint-btn"
                onClick={() => handleMint(ship.type, ship.price)}
                disabled={!isLoggedIn || minting !== null}
              >
                {minting === ship.type ? 'Minting…' : 'Mint Now'}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'fleet' && (
        <div className="mp-fleet">
          {loadingFleet ? (
            <div className="mp-fleet-loading">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="mp-skeleton" />)}
            </div>
          ) : myShips.length === 0 ? (
            <div className="mp-empty">
              <div className="mp-empty-icon">⚓</div>
              <h3>No ships yet</h3>
              <p>Mint your first ship to build your fleet.</p>
              <button className="mp-mint-btn" onClick={() => setTab('mint')}>Mint a Ship</button>
            </div>
          ) : (
            <div className="mp-catalog">
              {myShips.map(ship => (
                <div key={ship.nonce} className="mp-card mp-card--owned">
                  <div className="mp-card-emoji">
                    {SHIP_CATALOG.find(s => s.type === ship.shipType)?.emoji ?? '🚢'}
                  </div>
                  <div className="mp-card-name">{ship.shipType}</div>
                  <div className="mp-card-badge">Lv. {ship.level}</div>
                  <div className="mp-card-wins">{ship.wins} wins</div>
                  <div className="mp-card-nonce">#{ship.nonce}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
