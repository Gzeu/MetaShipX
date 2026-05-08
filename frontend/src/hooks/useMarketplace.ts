import { useEffect, useState } from 'react';
import { MarketplaceListing } from '../types/marketplace';
import { marketplaceService } from '../services/marketplace.service';

export function useMarketplace() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await marketplaceService.getListings();
      setListings(data);
    } finally {
      setLoading(false);
    }
  };

  const createListing = async (shipNonce: number, price: string) => {
    await marketplaceService.createListing({ shipNonce, price });
    await refresh();
  };

  const buyListing = async (listingId: string, price: string) => {
    await marketplaceService.buyListing({ listingId, price });
    await refresh();
  };

  useEffect(() => {
    void refresh();
  }, []);

  return { listings, loading, refresh, createListing, buyListing };
}
