import { useState, useEffect, useCallback } from 'react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { sendTransactions } from '@multiversx/sdk-dapp/services';
import { NftService } from '../services/nft.service';
import { CONTRACTS } from '../config';

const nftService = new NftService(CONTRACTS.NFT_ADDRESS);

export interface ShipDisplay {
  nonce: number;
  name: string;
  shipType: number;
  level: number;
  wins: number;
  mintedAtMs: bigint;
}

interface UseNft {
  ships: ShipDisplay[];
  mintPrice: bigint;
  loading: boolean;
  txPending: boolean;
  mint: (shipType: number, name: string) => Promise<void>;
  upgrade: (nonce: number) => Promise<void>;
}

export function useNft(): UseNft {
  const { account } = useGetAccountInfo();
  const [ships, setShips] = useState<ShipDisplay[]>([]);
  const [mintPrice, setMintPrice] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);
  const [txPending, setTxPending] = useState(false);

  const fetchData = useCallback(async () => {
    if (!account.address) return;
    setLoading(true);
    try {
      const [userShips, price] = await Promise.all([
        nftService.getUserShips(account.address),
        nftService.getMintPrice(),
      ]);
      setMintPrice(BigInt(price));

      const detailed = await Promise.all(
        userShips.map(async (nonce: number) => {
          const meta = await nftService.getShipMetadata(nonce);
          return {
            nonce,
            name: meta.name,
            shipType: meta.shipType,
            level: meta.level,
            wins: meta.wins,
            mintedAtMs: BigInt(meta.mintedAtMs ?? 0),
          } as ShipDisplay;
        })
      );
      setShips(detailed);
    } finally {
      setLoading(false);
    }
  }, [account.address]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const mint = useCallback(async (shipType: number, name: string) => {
    setTxPending(true);
    try {
      const tx = nftService.buildMintTx(shipType, name, mintPrice, account.address);
      await sendTransactions({ transactions: [tx] });
      await fetchData();
    } finally { setTxPending(false); }
  }, [mintPrice, account.address, fetchData]);

  const upgrade = useCallback(async (nonce: number) => {
    setTxPending(true);
    try {
      const ship = ships.find(s => s.nonce === nonce);
      if (!ship) return;
      const cost = mintPrice * BigInt(ship.level);
      const tx = nftService.buildUpgradeTx(nonce, cost, account.address);
      await sendTransactions({ transactions: [tx] });
      await fetchData();
    } finally { setTxPending(false); }
  }, [ships, mintPrice, account.address, fetchData]);

  return { ships, mintPrice, loading, txPending, mint, upgrade };
}
