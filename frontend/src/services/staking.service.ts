import {
  Address, ContractFunction, SmartContract,
  BigUIntValue, BytesValue, ResultsParser,
} from '@multiversx/sdk-core';
import { ProxyNetworkProvider } from '@multiversx/sdk-network-providers';
import { sendTransactions } from '@multiversx/sdk-dapp/services';
import { refreshAccount } from '@multiversx/sdk-dapp/utils';
import { STAKING_CONTRACT_ADDRESS, NETWORK_CONFIG } from '../config';

export interface StakingInfo {
  stakedAmount: string;   // EGLD as wei string
  stakedAt: number;
  lastClaimed: number;
  pendingRewards: string;
  totalStaked: string;
  rewardPool: string;
  apr: number;            // percentage, e.g. 20
}

const provider = new ProxyNetworkProvider(NETWORK_CONFIG.apiUrl);
const contract = new SmartContract({ address: new Address(STAKING_CONTRACT_ADDRESS) });

function egldWei(amount: string): string {
  return String(BigInt(Math.round(parseFloat(amount) * 1e18)));
}

async function sendTx(data: string, valueEgld = '0', gasLimit = 10_000_000) {
  await refreshAccount();
  const { sessionId } = await sendTransactions({
    transactions: [{
      receiver: STAKING_CONTRACT_ADDRESS,
      value: egldWei(valueEgld),
      data,
      gasLimit,
    }],
    transactionsDisplayInfo: {
      processingMessage: 'Processing…',
      errorMessage: 'Transaction failed',
      successMessage: 'Success!',
    },
  });
  return sessionId;
}

export async function stake(egld: string) {
  return sendTx('stake', egld, 10_000_000);
}

export async function unstake(egld: string) {
  const wei = BigInt(egldWei(egld));
  const amountHex = wei.toString(16).padStart(16, '0');
  return sendTx(`unstake@${amountHex}`, '0', 10_000_000);
}

export async function claimRewards() {
  return sendTx('claimRewards', '0', 8_000_000);
}

export async function getStakingInfo(address: string): Promise<StakingInfo> {
  const addrHex = new Address(address).hex();
  const addrBytes = BytesValue.fromHex(addrHex);

  const queries = [
    contract.createQuery({ func: new ContractFunction('getStakeInfo'), args: [addrBytes] }),
    contract.createQuery({ func: new ContractFunction('getPendingRewards'), args: [addrBytes] }),
    contract.createQuery({ func: new ContractFunction('getTotalStaked'), args: [] }),
    contract.createQuery({ func: new ContractFunction('getRewardPool'), args: [] }),
    contract.createQuery({ func: new ContractFunction('getApr'), args: [] }),
  ];

  const parser = new ResultsParser();
  const [stakeQr, rewardsQr, totalQr, poolQr, aprQr] = await Promise.all(
    queries.map(q => provider.queryContract(q)),
  );

  const stakeVal = parser
    .parseQueryResponse(stakeQr, contract.getEndpoint('getStakeInfo'))
    .firstValue?.valueOf();

  return {
    stakedAmount:   stakeVal?.amount?.toString() ?? '0',
    stakedAt:       Number(stakeVal?.staked_at ?? 0),
    lastClaimed:    Number(stakeVal?.last_claimed ?? 0),
    pendingRewards: parser.parseQueryResponse(rewardsQr, contract.getEndpoint('getPendingRewards')).firstValue?.valueOf().toString() ?? '0',
    totalStaked:    parser.parseQueryResponse(totalQr,   contract.getEndpoint('getTotalStaked')).firstValue?.valueOf().toString() ?? '0',
    rewardPool:     parser.parseQueryResponse(poolQr,    contract.getEndpoint('getRewardPool')).firstValue?.valueOf().toString() ?? '0',
    apr:            Number(parser.parseQueryResponse(aprQr, contract.getEndpoint('getApr')).firstValue?.valueOf() ?? 2000) / 100,
  };
}

export const stakingService = { stake, unstake, claimRewards, getStakingInfo };
