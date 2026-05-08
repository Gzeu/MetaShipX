import { useState } from 'react';
import { useMarketplace } from '../hooks/useMarketplace';
import { formatEgld, shortenAddress, timeAgo } from '../utils/format';
import { MarketplaceListing } from '../types/marketplace';
import './MarketplacePage.css';

type SortKey = 'price_asc' | 'price_desc' | 'level_desc' | 'wins_desc' | 'recent';
type FilterType = 'All' | 'Destroyer' | 'Submarine' | 'Cruiser' | 'Battleship' | 'Carrier';

const RARITY_COLOR: Record<string, string> = {
  Destroyer: '#94a3b8',
  Submarine: '#34d399',
  Cruiser:   '#34d399',
  Battleship:'#60a5fa',
  Carrier:   '#f59e0b',
};

export default function MarketplacePage() {
  const { listings, loading, buyListing, createListing } = useMarketplace();
  const [sort, setSort] = useState<SortKey>('recent');
  const [filterType, setFilterType] = useState<FilterType>('All');
  const [listModal, setListModal] = useState(false);
  const [listNonce, setListNonce] = useState('');
  const [listPrice, setListPrice] = useState('');

  const sorted = [...listings]
    .filter((l) => filterType === 'All' || l.shipType === filterType)
    .sort((a, b) => {
      if (sort === 'price_asc')   return Number(BigInt(a.price) - BigInt(b.price));
      if (sort === 'price_desc')  return Number(BigInt(b.price) - BigInt(a.price));
      if (sort === 'level_desc')  return b.level - a.level;
      if (sort === 'wins_desc')   return b.wins - a.wins;
      return b.createdAt - a.createdAt;
    });

  const handleBuy = (listing: MarketplaceListing) => {
    void buyListing(listing.listingId, listing.price);
  };

  const handleList = () => {
    if (!listNonce || !listPrice) return;
    const rawPrice = (parseFloat(listPrice) * 1e18).toFixed(0);
    void createListing(parseInt(listNonce, 10), rawPrice);
    setListModal(false);
    setListNonce('');
    setListPrice('');
  };

  return (
    <div className="marketplace">
      <header className="marketplace__header">
        <div>
          <h1>Ship Marketplace</h1>
          <p>Buy and sell NFT ships. 2.5% marketplace fee on sales.</p>
        </div>
        <button className="marketplace__list-btn" onClick={() => setListModal(true)}>
          + List a Ship
        </button>
      </header>

      {/* Filters */}
      <div className="marketplace__controls">
        <div className="marketplace__filters">
          {(['All','Destroyer','Submarine','Cruiser','Battleship','Carrier'] as FilterType[]).map((t) => (
            <button key={t} onClick={() => setFilterType(t)} className={`filter-pill${filterType === t ? ' filter-pill--active' : ''}`}>{t}</button>
          ))}
        </div>
        <select className="marketplace__sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="recent">Recent</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
          <option value="level_desc">Level ↓</option>
          <option value="wins_desc">Most wins</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="marketplace__loading">Loading listings...</div>
      ) : sorted.length === 0 ? (
        <div className="marketplace__empty">
          <div>🚢</div>
          <p>No listings yet. Be the first to list a ship!</p>
        </div>
      ) : (
        <div className="marketplace__grid">
          {sorted.map((listing) => (
            <div key={listing.listingId} className="ship-card" style={{ '--accent': RARITY_COLOR[listing.shipType] ?? '#64748b' } as React.CSSProperties}>
              <div className="ship-card__type" style={{ color: RARITY_COLOR[listing.shipType] }}>{listing.shipType}</div>
              <div className="ship-card__name">{listing.shipName}</div>
              <div className="ship-card__stats">
                <span>Lvl {listing.level}</span>
                <span>{listing.wins} wins</span>
                {listing.skin && <span className="ship-card__skin">🎨 {listing.skin}</span>}
              </div>
              <div className="ship-card__seller">by {shortenAddress(listing.seller)}</div>
              <div className="ship-card__listed">{timeAgo(listing.createdAt)}</div>
              <div className="ship-card__price">{formatEgld(listing.price)}</div>
              <button className="ship-card__buy-btn" onClick={() => handleBuy(listing)}>Buy Now</button>
            </div>
          ))}
        </div>
      )}

      {/* List modal */}
      {listModal && (
        <div className="modal-overlay" onClick={() => setListModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>List a Ship</h2>
            <label>Ship NFT nonce
              <input type="number" value={listNonce} onChange={(e) => setListNonce(e.target.value)} placeholder="e.g. 12" />
            </label>
            <label>Price (EGLD)
              <input type="number" step="0.01" value={listPrice} onChange={(e) => setListPrice(e.target.value)} placeholder="e.g. 1.5" />
            </label>
            <div className="modal__actions">
              <button onClick={() => setListModal(false)}>Cancel</button>
              <button className="modal__confirm" onClick={handleList}>List ship</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
