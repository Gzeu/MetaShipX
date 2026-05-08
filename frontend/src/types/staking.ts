/**
 * MetaShipX — Staking TypeScript Types
 */

export interface StakeInfo {
  stakedAmount: string;      // raw EGLD denomination
  stakedTimestamp: number;   // unix seconds
  pendingRewards: string;    // raw EGLD denomination
}

export interface StakingStats {
  totalStaked: string;       // raw EGLD denomination
  rewardPool: string;        // raw EGLD denomination
  apr: number;               // basis points (2000 = 20%)
  stakersCount: number;
}

export interface StakingAction {
  type: 'stake' | 'unstake' | 'claim';
  amount?: string;
  txHash?: string;
  timestamp: number;
  status: 'pending' | 'success' | 'failed';
}
