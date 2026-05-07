import { useState, useEffect, useCallback } from 'react';
import { useGetAccountInfo, useGetIsLoggedIn } from '@multiversx/sdk-dapp/hooks';
import { nftService } from '../services/nft.service';

export function useNft() {
  const { address } = useGetAccountInfo();
  const isLoggedIn = useGetIsLoggedIn();

  const [userShips, setUserShips] = useState<any[]>([]);
  const [mintPrice, setMintPrice] = useState<string>('50000000000000000');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!isLoggedIn || !address) return;
    setIsLoading(true);
    setError(null);
    try {
      const [ships, price] = await Promise.all([
        nftService.getUserShips(address),
        nftService.getMintPrice(),
      ]);
      setUserShips(ships || []);
      setMintPrice(price || '50000000000000000');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [address, isLoggedIn]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const mintShip = useCallback(async (shipType: number, name: string) => {
    return nftService.mintShip(shipType, name);
  }, []);

  const upgradeShip = useCallback(async (nonce: number) => {
    return nftService.upgradeShip(nonce);
  }, []);

  return {
    userShips,
    mintPrice,
    isLoading,
    error,
    mintShip,
    upgradeShip,
    refetch: fetchData,
  };
}
