import { useMarketplace } from '../hooks/useMarketplace';
import { formatEgld, shortenAddress, timeAgo } from '../utils/format';

export default function MarketplacePage() {
  const { listings, loading, buyListing } = useMarketplace();

  return (
    <div style={{ padding: '2rem' }}>
      <h1>NFT Marketplace</h1>
      <p>List and buy upgraded ships on the secondary market.</p>
      {loading ? <p>Loading listings...</p> : null}
      <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
        {listings.map((listing) => (
          <div key={listing.listingId} style={{ border: '1px solid #2d3748', borderRadius: 16, padding: '1rem', background: '#111827' }}>
            <h3>{listing.shipName} · {listing.shipType}</h3>
            <p>Level {listing.level} · {listing.wins} wins</p>
            <p>Skin: {listing.skin || 'Default Steel'}</p>
            <p>Seller: {shortenAddress(listing.seller)}</p>
            <p>Listed {timeAgo(listing.createdAt)}</p>
            <strong>{formatEgld(listing.price)}</strong>
            <div style={{ marginTop: '0.75rem' }}>
              <button onClick={() => void buyListing(listing.listingId, listing.price)}>Buy ship</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
