import { useState, useEffect, useCallback } from 'react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { sendTransactions } from '@multiversx/sdk-dapp/services';
import { BattleshipService } from '../services/battleship.service';
import { CONTRACTS } from '../config';

const battleshipService = new BattleshipService(CONTRACTS.BATTLESHIP_ADDRESS);

interface UseAbandonedGame {
  blocksRemaining: number | null;
  canClaim: boolean;
  claiming: boolean;
  claimAbandoned: () => Promise<void>;
  refresh: () => void;
}

/**
 * Supernova-aware hook: polls getTurnBlocksRemaining every 6 seconds.
 * At 600 ms/block (Supernova), 6 s = ~10 blocks, reasonable polling rate.
 * Exposes claimAbandoned() which calls claimAbandonedGame on-chain.
 */
export function useAbandonedGame(gameId: number): UseAbandonedGame {
  const { account } = useGetAccountInfo();
  const [blocksRemaining, setBlocksRemaining] = useState<number | null>(null);
  const [claiming, setClaiming] = useState(false);

  const fetchBlocks = useCallback(async () => {
    if (!gameId) return;
    try {
      const remaining = await battleshipService.getTurnBlocksRemaining(gameId);
      setBlocksRemaining(remaining);
    } catch {
      // silent — game may be finished
    }
  }, [gameId]);

  useEffect(() => {
    fetchBlocks();
    // Poll every 6 s — fast enough to detect timeout without hammering the API
    const interval = setInterval(fetchBlocks, 6_000);
    return () => clearInterval(interval);
  }, [fetchBlocks]);

  const canClaim = blocksRemaining === 0 && !!account.address;

  const claimAbandoned = useCallback(async () => {
    if (!canClaim) return;
    setClaiming(true);
    try {
      const tx = battleshipService.buildClaimAbandonedTx(gameId, account.address);
      await sendTransactions({ transactions: [tx] });
    } finally {
      setClaiming(false);
    }
  }, [canClaim, gameId, account.address]);

  return { blocksRemaining, canClaim, claiming, claimAbandoned, refresh: fetchBlocks };
}
