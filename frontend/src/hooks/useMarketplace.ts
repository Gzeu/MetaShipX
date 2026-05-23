import { useState, useEffect, useCallback } from 'react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import {
  getActiveListings,
  listShip,
  buyShip,
  cancelListing,
  type MarketplaceListing,
} from '../services/marketplace.service';

export function useMarketplace() {
  const { address } = useGetAccountInfo();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getActiveListings();
      setListings(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleList = useCallback(
    async (nonce: number, priceEgld: string, tokenIdentifier: string) => {
      if (!address) throw new Error('Wallet not connected');
      await listShip({ nonce, priceEgld, tokenIdentifier, senderAddress: address });
      setTimeout(refresh, 3000);
    },
    [address, refresh]
  );

  const handleBuy = useCallback(
    async (listing: MarketplaceListing) => {
      if (!address) throw new Error('Wallet not connected');
      await buyShip({ listingId: listing.listingId, priceRaw: listing.priceRaw, senderAddress: address });
      setTimeout(refresh, 3000);
    },
    [address, refresh]
  );

  const handleCancel = useCallback(
    async (listingId: string) => {
      if (!address) throw new Error('Wallet not connected');
      await cancelListing({ listingId, senderAddress: address });
      setTimeout(refresh, 3000);
    },
    [address, refresh]
  );

  return { listings, loading, error, refresh, handleList, handleBuy, handleCancel, myAddress: address };
}
