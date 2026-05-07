import {
  Address, ContractFunction, SmartContract,
  U64Value, BytesValue, ResultsParser,
} from '@multiversx/sdk-core';
import { ProxyNetworkProvider } from '@multiversx/sdk-network-providers';
import { refreshAccount } from '@multiversx/sdk-dapp/out/utils/account/refreshAccount';
import { TransactionManager } from '@multiversx/sdk-dapp/out/managers/TransactionManager';
import { ProviderFactory } from '@multiversx/sdk-dapp/out/providers/ProviderFactory';
import { ProviderTypeEnum } from '@multiversx/sdk-dapp/out/providers/types/providerFactory.types';
import { BATTLESHIP_CONTRACT_ADDRESS, NETWORK_CONFIG } from '../config';

export interface Tournament {
  id: number;
  name: string;
  entryFee: string;
  prizePool: string;
  maxPlayers: number;
  currentPlayers: number;
  status: 'Registration' | 'InProgress' | 'Finished';
  winner: string | null;
  startTime: number;
}

const provider = new ProxyNetworkProvider(NETWORK_CONFIG.apiUrl);
const contract = new SmartContract({ address: new Address(BATTLESHIP_CONTRACT_ADDRESS) });

async function sendTx(tx: any, displayInfo: { processingMessage: string; errorMessage: string; successMessage: string }) {
  await refreshAccount();
  const dappProvider = await ProviderFactory.create({ type: ProviderTypeEnum.extension });
  const signed = await dappProvider.signTransactions([tx]);
  const txManager = TransactionManager.getInstance();
  const sent = await txManager.send(signed);
  return txManager.track(sent, { transactionsDisplayInfo: displayInfo });
}

export async function joinTournament(tournamentId: number, entryFeeEgld: string) {
  const feeWei = BigInt(Math.round(parseFloat(entryFeeEgld) * 1e18));
  const tx = contract.methods.joinTournament([new U64Value(tournamentId)]).withValue(feeWei).withGasLimit(15_000_000).withChainID(NETWORK_CONFIG.chainId).buildTransaction();
  return sendTx(tx, { processingMessage: 'Joining tournament...', errorMessage: 'Error joining', successMessage: 'Joined tournament!' });
}

export async function getTournament(id: number): Promise<Tournament> {
  const query = contract.createQuery({ func: new ContractFunction('getTournament'), args: [new U64Value(id)] });
  const qr = await provider.queryContract(query);
  const bundle = new ResultsParser().parseQueryResponse(qr, contract.getEndpoint('getTournament'));
  const d = bundle.firstValue!.valueOf();
  return {
    id,
    name: d.name?.toString() ?? `Tournament #${id}`,
    entryFee: d.entry_fee?.toString() ?? '0',
    prizePool: d.prize_pool?.toString() ?? '0',
    maxPlayers: Number(d.max_players ?? 8),
    currentPlayers: Number(d.current_players ?? 0),
    status: d.status?.name ?? 'Registration',
    winner: d.winner?.toString() ?? null,
    startTime: Number(d.start_time ?? 0),
  };
}

export async function getActiveTournaments(): Promise<number[]> {
  const query = contract.createQuery({ func: new ContractFunction('getActiveTournaments'), args: [] });
  const qr = await provider.queryContract(query);
  const bundle = new ResultsParser().parseQueryResponse(qr, contract.getEndpoint('getActiveTournaments'));
  return bundle.values.map((v) => Number(v.valueOf()));
}

export const tournamentService = { joinTournament, getTournament, getActiveTournaments };
