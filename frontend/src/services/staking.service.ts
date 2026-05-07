import {
  Address,
  ContractFunction,
  SmartContract,
  BigUIntValue,
  BytesValue,
  ResultsParser,
} from '@multiversx/sdk-core';
import { ProxyNetworkProvider } from '@multiversx/sdk-network-providers';
import { sendTransactions } from '@multiversx/sdk-dapp/services';
import { refreshAccount } from '@multiversx/sdk-dapp/utils';
import { STAKING_CONTRACT_ADDRESS, NETWORK_CONFIG } from '../config';

export interface StakingInfo {
  amount: string;        // in denomination (atto EGLD)
  stakedAt: number;     // timestamp
  lastClaimed: number;  // timestamp
  totalClaimed: string; // in denomination
  pendingRewards: string;
  apr: number;          // numerator, divide by 10_000 for %
  totalStaked: string;
  rewardPool: string;
}

const provider = new ProxyNetworkProvider(NETWORK_CONFIG.apiUrl);
const contract = new SmartContract({ address: new Address(STAKING_CONTRACT_ADDRESS) });

/** Stake EGLD */
export async function stake(egldAmount: string) {
  const wei = BigInt(Math.round(parseFloat(egldAmount) * 1e18));
  const tx = contract.methods
    .stake([])
    .withValue(wei)
    .withGasLimit(15_000_000)
    .withChainID(NETWORK_CONFIG.chainId)
    .buildTransaction();

  await refreshAccount();
  const { sessionId } = await sendTransactions({ transactions: [tx], transactionsDisplayInfo: { processingMessage: 'Staking...', errorMessage: 'Error staking', successMessage: 'Staked!' } });
  return sessionId;
}

/** Unstake EGLD */
export async function unstake(egldAmount: string) {
  const wei = BigInt(Math.round(parseFloat(egldAmount) * 1e18)).toString();
  const tx = contract.methods
    .unstake([new BigUIntValue(wei)])
    .withGasLimit(15_000_000)
    .withChainID(NETWORK_CONFIG.chainId)
    .buildTransaction();

  await refreshAccount();
  const { sessionId } = await sendTransactions({ transactions: [tx], transactionsDisplayInfo: { processingMessage: 'Unstaking...', errorMessage: 'Error unstaking', successMessage: 'Unstaked!' } });
  return sessionId;
}

/** Claim accumulated rewards */
export async function claimRewards() {
  const tx = contract.methods
    .claimRewards([])
    .withGasLimit(10_000_000)
    .withChainID(NETWORK_CONFIG.chainId)
    .buildTransaction();

  await refreshAccount();
  const { sessionId } = await sendTransactions({ transactions: [tx], transactionsDisplayInfo: { processingMessage: 'Claiming rewards...', errorMessage: 'Error claiming', successMessage: 'Rewards claimed!' } });
  return sessionId;
}

/** Read full staking info for a user */
export async function getStakingInfo(address: string): Promise<StakingInfo> {
  const addrBytes = BytesValue.fromHex(new Address(address).hex());

  const [infoRes, pendingRes, totalStakedRes, poolRes, aprRes] = await Promise.all([
    provider.queryContract(contract.createQuery({ func: new ContractFunction('getStakeInfo'), args: [addrBytes] })),
    provider.queryContract(contract.createQuery({ func: new ContractFunction('getPendingRewards'), args: [addrBytes] })),
    provider.queryContract(contract.createQuery({ func: new ContractFunction('getTotalStaked'), args: [] })),
    provider.queryContract(contract.createQuery({ func: new ContractFunction('getRewardPool'), args: [] })),
    provider.queryContract(contract.createQuery({ func: new ContractFunction('getApr'), args: [] })),
  ]);

  const parser = new ResultsParser();
  const info = parser.parseQueryResponse(infoRes, contract.getEndpoint('getStakeInfo')).firstValue!.valueOf();
  const pending = parser.parseQueryResponse(pendingRes, contract.getEndpoint('getPendingRewards')).firstValue!.valueOf();
  const totalStaked = parser.parseQueryResponse(totalStakedRes, contract.getEndpoint('getTotalStaked')).firstValue!.valueOf();
  const pool = parser.parseQueryResponse(poolRes, contract.getEndpoint('getRewardPool')).firstValue!.valueOf();
  const apr = parser.parseQueryResponse(aprRes, contract.getEndpoint('getApr')).firstValue!.valueOf();

  return {
    amount: info[0].toString(),
    stakedAt: Number(info[1]),
    lastClaimed: Number(info[2]),
    totalClaimed: info[3].toString(),
    pendingRewards: pending.toString(),
    apr: Number(apr),
    totalStaked: totalStaked.toString(),
    rewardPool: pool.toString(),
  };
}
