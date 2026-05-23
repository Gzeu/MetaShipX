import React, { useState, useEffect, useCallback } from 'react';
import { useGetAccountInfo, useGetIsLoggedIn } from '@multiversx/sdk-dapp/hooks';
import {
  mintShip, upgradeShip, getUserShips, getShipMetadata,
  getMintPrice, ShipType, ShipMetadata, SHIP_TYPE_INDEX,
} from '../../services/nft.service';
import {
  getActiveListings, listShipForSale, buyListing, cancelListing,
  MarketListing,
} from '../../services/marketplace.service';
import './Marketplace.css';

const SHIP_CATALOG: { type: ShipType; length: number; desc: string; rarity: string; basePriceEgld: string }[] = [
  { type: 'Carrier',    length: 5, desc: 'The flagship. Dominates the board.', rarity: 'Legendary', basePriceEgld: '0.25' },
  { type: 'Battleship', length: 4, desc: 'Firepower and resilience.',           rarity: 'Epic',      basePriceEgld: '0.15' },
  { type: 'Cruiser',    length: 3, desc: 'Balanced speed and armor.',           rarity: 'Rare',      basePriceEgld: '0.10' },
  { type: 'Submarine',  length: 3, desc: 'Stealthy strike capability.',         rarity: 'Rare',      basePriceEgld: '0.08' },
  { type: 'Destroyer',  length: 2, desc: 'Fast, nimble, first to strike.',      rarity: 'Common',    basePriceEgld: '0.05' },
];

const RARITY_CLASS: Record<string, string> = {
  Common: 'rarity-common', Rare: 'rarity-rare',
  Epic: 'rarity-epic',     Legendary: 'rarity-legendary',
};

type Tab = 'catalog' | 'fleet' | 'listings';
type TxState = 'idle' | 'pending' | 'success' | 'error';

const MarketplacePage: React.FC = () => {
  const { address } = useGetAccountInfo();
  const isLoggedIn  = useGetIsLoggedIn();

  // Data
  const [mintPrice,   setMintPrice]   = useState<string | null>(null);
  const [ownedShips,  setOwnedShips]  = useState<ShipMetadata[]>([]);
  const [listings,    setListings]    = useState<MarketListing[]>([]);

  // UI state
  const [tab,         setTab]         = useState<Tab>('catalog');
  const [txState,     setTxState]     = useState<TxState>('idle');
  const [txMsg,       setTxMsg]       = useState('');
  const [loadingData, setLoadingData] = useState(false);

  // Modals
  const [mintTarget,   setMintTarget]   = useState<typeof SHIP_CATALOG[0] | null>(null);
  const [mintName,     setMintName]     = useState('');
  const [upgradeTarget,setUpgradeTarget]= useState<ShipMetadata | null>(null);
  const [listTarget,   setListTarget]   = useState<ShipMetadata | null>(null);
  const [listPrice,    setListPrice]    = useState('');

  // Filters
  const [filterType,  setFilterType]  = useState('all');
  const [sortBy,      setSortBy]      = useState<'price_asc'|'price_desc'|'level'|'wins'>('price_asc');

  const mintPriceEgld = mintPrice ? (Number(BigInt(mintPrice)) / 1e18).toFixed(4) : '...';

  const reloadFleet = useCallback(async () => {
    if (!address) return;
    const nonces = await getUserShips(address);
    const ships  = await Promise.all(nonces.map(getShipMetadata));
    setOwnedShips(ships);
  }, [address]);

  const reloadListings = useCallback(async () => {
    const data = await getActiveListings();
    setListings(data);
  }, []);

  useEffect(() => { getMintPrice().then(setMintPrice).catch(() => {}); }, []);

  useEffect(() => {
    setLoadingData(true);
    Promise.all([reloadFleet(), reloadListings()]).finally(() => setLoadingData(false));
  }, [reloadFleet, reloadListings]);

  const withTx = async (fn: () => Promise<void>, successMsg: string) => {
    if (txState === 'pending') return;
    setTxState('pending'); setTxMsg('Waiting for wallet signature...');
    try {
      await fn();
      setTxState('success'); setTxMsg(successMsg);
      await Promise.all([reloadFleet(), reloadListings()]);
      setTimeout(() => setTxState('idle'), 3000);
    } catch (e: any) {
      setTxState('error'); setTxMsg(e?.message ?? 'Transaction failed');
      setTimeout(() => setTxState('idle'), 5000);
    }
  };

  const handleMint = () => withTx(async () => {
    if (!mintTarget || !mintName.trim()) throw new Error('Invalid ship name');
    await mintShip(mintTarget.type, mintName.trim(), mintTarget.basePriceEgld);
    setMintTarget(null); setMintName('');
  }, `${mintTarget?.type} minted successfully!`);

  const handleUpgrade = () => withTx(async () => {
    if (!upgradeTarget || !mintPrice) throw new Error('Missing upgrade data');
    const costEgld = ((Number(BigInt(mintPrice)) / 1e18) * upgradeTarget.level).toString();
    await upgradeShip(upgradeTarget.nonce, costEgld);
    setUpgradeTarget(null);
  }, `Ship upgraded to level ${(upgradeTarget?.level ?? 0) + 1}!`);

  const handleList = () => withTx(async () => {
    if (!listTarget || !listPrice || isNaN(parseFloat(listPrice))) throw new Error('Invalid price');
    await listShipForSale(listTarget.nonce, listPrice);
    setListTarget(null); setListPrice('');
  }, 'Ship listed on marketplace!');

  const handleBuy = (listing: MarketListing) => withTx(async () => {
    await buyListing(listing.listingId, listing.priceEgld);
  }, 'Ship purchased!');

  const handleCancel = (listing: MarketListing) => withTx(async () => {
    await cancelListing(listing.listingId);
  }, 'Listing cancelled.');

  const filteredListings = listings
    .filter(l => filterType === 'all' || l.shipType === filterType)
    .sort((a, b) => {
      if (sortBy === 'price_asc')  return parseFloat(a.priceEgld) - parseFloat(b.priceEgld);
      if (sortBy === 'price_desc') return parseFloat(b.priceEgld) - parseFloat(a.priceEgld);
      if (sortBy === 'level')      return b.level - a.level;
      return b.wins - a.wins;
    });

  return (
    <div className="marketplace-page">
      <div className="marketplace-hero">
        <h1>🚢 Ship Marketplace</h1>
        <p>Mint ships, upgrade your fleet, and trade with other players.</p>
        <div className="mint-price-badge">Base Mint Price: <strong>{mintPriceEgld} EGLD</strong></div>
      </div>

      {/* TX STATUS BANNER */}
      {txState !== 'idle' && (
        <div className={`tx-banner tx-banner--${txState}`}>
          {txState === 'pending' && <span className="tx-spinner" />}
          {txMsg}
        </div>
      )}

      <div className="marketplace-tabs">
        {(['catalog','fleet','listings'] as Tab[]).map(t => (
          <button key={t} className={`mp-tab${tab === t ? ' mp-tab--active' : ''}`} onClick={() => setTab(t)}>
            {t === 'catalog'  ? '🛒 Shop'    : ''}
            {t === 'fleet'    ? `⚓ My Fleet${ownedShips.length ? ` (${ownedShips.length})` : ''}` : ''}
            {t === 'listings' ? `📋 P2P Market${listings.length ? ` (${listings.length})` : ''}` : ''}
          </button>
        ))}
      </div>

      {/* ── CATALOG ── */}
      {tab === 'catalog' && (
        <div className="ship-catalog">
          {SHIP_CATALOG.map((ship) => (
            <div key={ship.type} className="ship-card">
              <div className="ship-card-top">
                <div className="ship-visual">
                  {Array.from({ length: ship.length }).map((_, i) => <div key={i} className="ship-block" />)}
                </div>
                <span className={`ship-rarity ${RARITY_CLASS[ship.rarity]}`}>{ship.rarity}</span>
              </div>
              <div className="ship-card-body">
                <h3 className="ship-name">{ship.type}</h3>
                <p className="ship-desc">{ship.desc}</p>
                <div className="ship-stats"><span>Length: <strong>{ship.length}</strong></span></div>
              </div>
              <button
                className="btn-mint"
                onClick={() => { setMintTarget(ship); setMintName(`${ship.type} #${Math.floor(Math.random()*9000+1000)}`); }}
                disabled={!isLoggedIn || txState === 'pending'}
                title={!isLoggedIn ? 'Connect wallet to mint' : ''}
              >
                {!isLoggedIn ? '🔌 Connect wallet' : `⚓ Mint — ${ship.basePriceEgld} EGLD`}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── FLEET ── */}
      {tab === 'fleet' && (
        <div className="fleet-section">
          {!isLoggedIn && <div className="fleet-empty">🔌 Connect your wallet to view your fleet.</div>}
          {isLoggedIn && loadingData && <div className="fleet-empty">⏳ Loading your ships...</div>}
          {isLoggedIn && !loadingData && ownedShips.length === 0 && (
            <div className="fleet-empty">
              <div style={{ fontSize: '2.5rem' }}>🌊</div>
              <p>No ships yet. Mint one or buy from the P2P market!</p>
              <div style={{ display:'flex', gap:'0.5rem', justifyContent:'center' }}>
                <button className="btn-primary-sm" onClick={() => setTab('catalog')}>Go to Shop</button>
                <button className="btn-secondary-sm" onClick={() => setTab('listings')}>P2P Market</button>
              </div>
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
                <div className="ship-card-actions">
                  <button
                    className="btn-upgrade"
                    onClick={() => setUpgradeTarget(ship)}
                    disabled={ship.level >= 10 || txState === 'pending'}
                  >
                    {ship.level >= 10 ? '✨ Max' : `⬆️ Lvl ${ship.level + 1}`}
                  </button>
                  <button
                    className="btn-list"
                    onClick={() => { setListTarget(ship); setListPrice(''); }}
                    disabled={txState === 'pending'}
                  >
                    📋 List
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── P2P LISTINGS ── */}
      {tab === 'listings' && (
        <div className="listings-section">
          <div className="listings-filters">
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="filter-select">
              <option value="all">All Types</option>
              {SHIP_CATALOG.map(s => <option key={s.type} value={s.type}>{s.type}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="filter-select">
              <option value="price_asc">Price ↑</option>
              <option value="price_desc">Price ↓</option>
              <option value="level">Highest Level</option>
              <option value="wins">Most Wins</option>
            </select>
          </div>
          {loadingData && <div className="fleet-empty">⏳ Loading listings...</div>}
          {!loadingData && filteredListings.length === 0 && (
            <div className="fleet-empty">
              <div style={{ fontSize: '2.5rem' }}>🏴‍☠️</div>
              <p>No ships listed yet. List yours from My Fleet!</p>
            </div>
          )}
          <div className="ship-catalog">
            {filteredListings.map((listing) => (
              <div key={listing.listingId} className="ship-card ship-card--listing">
                <div className="ship-card-top">
                  <div className="ship-visual">
                    {Array.from({ length: SHIP_CATALOG.find(s => s.type === listing.shipType)?.length ?? 3 }).map((_, i) => (
                      <div key={i} className="ship-block ship-block--listing" />
                    ))}
                  </div>
                  <span className={`ship-rarity ${RARITY_CLASS[SHIP_CATALOG.find(s=>s.type===listing.shipType)?.rarity??'Common']}`}>
                    {SHIP_CATALOG.find(s=>s.type===listing.shipType)?.rarity}
                  </span>
                </div>
                <div className="ship-card-body">
                  <h3 className="ship-name">{listing.shipName}</h3>
                  <p className="ship-type-tag">{listing.shipType}</p>
                  <div className="ship-stats">
                    <span>🏆 Wins: <strong>{listing.wins}</strong></span>
                    <span>Lvl: <strong>{listing.level}</strong></span>
                  </div>
                  <div className="listing-seller">Seller: {listing.seller.slice(0,8)}…{listing.seller.slice(-4)}</div>
                </div>
                <div className="listing-price">{listing.priceEgld} EGLD</div>
                {listing.seller === address
                  ? <button className="btn-cancel-listing" onClick={() => handleCancel(listing)} disabled={txState==='pending'}>✕ Cancel</button>
                  : <button className="btn-buy" onClick={() => handleBuy(listing)} disabled={!isLoggedIn || txState==='pending'}>
                      {!isLoggedIn ? '🔌 Connect wallet' : `Buy — ${listing.priceEgld} EGLD`}
                    </button>
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MINT MODAL */}
      {mintTarget && (
        <div className="modal-overlay" onClick={() => setMintTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Mint {mintTarget.type}</h2>
            <p className="modal-desc">{mintTarget.desc}</p>
            <label className="modal-label">Ship Name
              <input type="text" value={mintName} onChange={e => setMintName(e.target.value)}
                placeholder="Enter a name" maxLength={32} className="modal-input" />
            </label>
            <div className="modal-cost">Cost: <strong>{mintTarget.basePriceEgld} EGLD</strong></div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setMintTarget(null)}>Cancel</button>
              <button className="btn-confirm" onClick={handleMint} disabled={txState==='pending' || !mintName.trim()}>
                {txState === 'pending' ? '⏳ Minting...' : '⚓ Confirm Mint'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPGRADE MODAL */}
      {upgradeTarget && mintPrice && (
        <div className="modal-overlay" onClick={() => setUpgradeTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Upgrade {upgradeTarget.name}</h2>
            <p>Level <strong>{upgradeTarget.level}</strong> → <strong>{upgradeTarget.level + 1}</strong></p>
            <div className="modal-cost">Cost: <strong>{((Number(BigInt(mintPrice))/1e18)*upgradeTarget.level).toFixed(4)} EGLD</strong></div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setUpgradeTarget(null)}>Cancel</button>
              <button className="btn-confirm" onClick={handleUpgrade} disabled={txState==='pending'}>
                {txState === 'pending' ? '⏳ Upgrading...' : '⬆️ Confirm Upgrade'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIST MODAL */}
      {listTarget && (
        <div className="modal-overlay" onClick={() => setListTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>List {listTarget.name}</h2>
            <p>Set a price in EGLD. Other players can buy it directly.</p>
            <label className="modal-label">Price (EGLD)
              <input type="number" value={listPrice} onChange={e => setListPrice(e.target.value)}
                placeholder="e.g. 0.5" min="0.01" step="0.01" className="modal-input" />
            </label>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setListTarget(null)}>Cancel</button>
              <button className="btn-confirm" onClick={handleList}
                disabled={txState==='pending' || !listPrice || isNaN(parseFloat(listPrice)) || parseFloat(listPrice) <= 0}>
                {txState === 'pending' ? '⏳ Listing...' : '📋 Confirm Listing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplacePage;
