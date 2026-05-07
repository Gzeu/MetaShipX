import {
  Address, ContractFunction, SmartContract,
  BigUIntValue, BytesValue, ResultsParser,
} from '@multiversx/sdk-core';
import { ProxyNetworkProvider } from '@multiversx/sdk-network-providers';
import { refreshAccount } from '@multiversx/sdk-dapp/out/utils/account/refreshAccount';
import { TransactionManager } from '@multiversx/sdk-dapp/out/managers/TransactionManager';
import { ProviderFactory } from '@multiversx/sdk-dapp/out/providers/ProviderFactory';
import { ProviderTypeEnum } from '@multiversx/sdk-dapp/out/providers/types/providerFactory.types';
import { STAKING_CONTRACT_ADDRESS, NETWORK_CONFIG } from '../config';

export interface StakingInfo {
  amount: string;
  stakedAt: number;
  lastClaimed: number;
  pendingRewards: string;
  totalStaked: string;
  rewardPool: string;
  apr: number;
}

const provider = new ProxyNetworkProvider(NETWORK_CONFIG.apiUrl);
const contract = new SmartContract({ address: new Address(STAKING_CONTRACT_ADDRESS) });

async function sendTx(tx: any, displayInfo: { processingMessage: string; errorMessage: string; successMessage: string }) {
  await refreshAccount();
  const dappProvider = await ProviderFactory.create({ type: ProviderTypeEnum.extension });
  const signed = await dappProvider.signTransactions([tx]);
  const txManager = TransactionManager.getInstance();
  const sent = await txManager.send(signed);
  return txManager.track(sent, { transactionsDisplayInfo: displayInfo });
}

export async function stake(egld: string) {
  const wei = BigInt(Math.round(parseFloat(egld) * 1e18));
  const tx = contract.methods.stake([]).withValue(wei).withGasLimit(10_000_000).withChainID(NETWORK_CONFIG.chainId).buildTransaction();
  return sendTx(tx, { processingMessage: 'Staking...', errorMessage: 'Error staking', successMessage: 'Staked!' });
}

export async function unstake(egld: string) {
  const wei = BigInt(Math.round(parseFloat(egld) * 1e18));
  const tx = contract.methods.unstake([new BigUIntValue(wei)]).withGasLimit(10_000_000).withChainID(NETWORK_CONFIG.chainId).buildTransaction();
  return sendTx(tx, { processingMessage: 'Unstaking...', errorMessage: 'Error unstaking', successMessage: 'Unstaked!' });
}

export async function claimRewards() {
  const tx = contract.methods.claimRewards([]).withGasLimit(8_000_000).withChainID(NETWORK_CONFIG.chainId).buildTransaction();
  return sendTx(tx, { processingMessage: 'Claiming rewards...', errorMessage: 'Error claiming', successMessage: 'Rewards claimed!' });
}

export async function getStakingInfo(address: string): Promise<StakingInfo> {
  const addrBytes = BytesValue.fromHex(new Address(address).hex());
  const queries = [
    contract.createQuery({ func: new ContractFunction('getStakeInfo'), args: [addrBytes] }),
    contract.createQuery({ func: new ContractFunction('getPendingRewards'), args: [addrBytes] }),
    contract.createQuery({ func: new ContractFunction('getTotalStaked'), args: [] }),
    contract.createQuery({ func: new ContractFunction('getRewardPool'), args: [] }),
    contract.createQuery({ func: new ContractFunction('getApr'), args: [] }),
  ];
  const parser = new ResultsParser();
  const [stakeQr, rewardsQr, totalQr, poolQr, aprQr] = await Promise.all(queries.map((q) => provider.queryContract(q)));
  const stakeVal = parser.parseQueryResponse(stakeQr, contract.getEndpoint('getStakeInfo')).firstValue?.valueOf();
  return {
    amount: stakeVal?.amount?.toString() ?? '0',
    stakedAt: Number(stakeVal?.staked_at ?? 0),
    lastClaimed: Number(stakeVal?.last_claimed ?? 0),
    pendingRewards: parser.parseQueryResponse(rewardsQr, contract.getEndpoint('getPendingRewards')).firstValue?.valueOf().toString() ?? '0',
    totalStaked: parser.parseQueryResponse(totalQr, contract.getEndpoint('getTotalStaked')).firstValue?.valueOf().toString() ?? '0',
    rewardPool: parser.parseQueryResponse(poolQr, contract.getEndpoint('getRewardPool')).firstValue?.valueOf().toString() ?? '0',
    apr: Number(parser.parseQueryResponse(aprQr, contract.getEndpoint('getApr')).firstValue?.valueOf() ?? 2000) / 100,
  };
}

export const stakingService = { stake, unstake, claimRewards, getStakingInfo };
