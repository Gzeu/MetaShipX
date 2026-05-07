import {
  Address, ContractFunction, SmartContract,
  U64Value, BooleanValue, BytesValue, ResultsParser,
} from '@multiversx/sdk-core';
import { ProxyNetworkProvider } from '@multiversx/sdk-network-providers';
import { refreshAccount } from '@multiversx/sdk-dapp/out/utils/account/refreshAccount';
import { TransactionManager } from '@multiversx/sdk-dapp/out/managers/TransactionManager';
import { ProviderFactory } from '@multiversx/sdk-dapp/out/providers/ProviderFactory';
import { ProviderTypeEnum } from '@multiversx/sdk-dapp/out/providers/types/providerFactory.types';
import { BATTLESHIP_CONTRACT_ADDRESS, NETWORK_CONFIG } from '../config';

export interface GameState {
  creator: string;
  opponent: string | null;
  bet: string;
  phase: 'WaitingForOpponent' | 'PlacingShips' | 'InProgress' | 'Finished';
  currentTurn: number;
  winner: string | null;
}
export type AttackResult = 'Hit' | 'Miss' | 'Sunk' | 'GameOver';
export interface ShipPlacement { x: number; y: number; length: number; isVertical: boolean; }

const provider = new ProxyNetworkProvider(NETWORK_CONFIG.apiUrl);
const contract = new SmartContract({ address: new Address(BATTLESHIP_CONTRACT_ADDRESS) });

async function sendTx(
  tx: any,
  displayInfo: { processingMessage: string; errorMessage: string; successMessage: string }
) {
  await refreshAccount();
  const dappProvider = await ProviderFactory.create({ type: ProviderTypeEnum.extension });
  const signed = await dappProvider.signTransactions([tx]);
  const txManager = TransactionManager.getInstance();
  const sent = await txManager.send(signed);
  return txManager.track(sent, { transactionsDisplayInfo: displayInfo });
}

export async function createGame(betEgld: string) {
  const betWei = BigInt(Math.round(parseFloat(betEgld) * 1e18));
  const tx = contract.methods.createGame([]).withValue(betWei).withGasLimit(10_000_000).withChainID(NETWORK_CONFIG.chainId).buildTransaction();
  return sendTx(tx, { processingMessage: 'Creating game...', errorMessage: 'Error creating game', successMessage: 'Game created!' });
}

export async function joinGame(gameId: number, betEgld: string) {
  const betWei = BigInt(Math.round(parseFloat(betEgld) * 1e18));
  const tx = contract.methods.joinGame([new U64Value(gameId)]).withValue(betWei).withGasLimit(10_000_000).withChainID(NETWORK_CONFIG.chainId).buildTransaction();
  return sendTx(tx, { processingMessage: 'Joining game...', errorMessage: 'Error joining game', successMessage: 'Joined game!' });
}

export async function placeShips(gameId: number, ships: ShipPlacement[]) {
  const args = ships.flatMap((s) => [new U64Value(s.x), new U64Value(s.y), new U64Value(s.length), new BooleanValue(s.isVertical)]);
  const tx = contract.methods.placeShips([new U64Value(gameId), ...args]).withGasLimit(20_000_000).withChainID(NETWORK_CONFIG.chainId).buildTransaction();
  return sendTx(tx, { processingMessage: 'Placing ships...', errorMessage: 'Error placing ships', successMessage: 'Ships placed!' });
}

export async function attack(gameId: number, x: number, y: number) {
  const tx = contract.methods.attack([new U64Value(gameId), new U64Value(x), new U64Value(y)]).withGasLimit(15_000_000).withChainID(NETWORK_CONFIG.chainId).buildTransaction();
  return sendTx(tx, { processingMessage: 'Attacking...', errorMessage: 'Error attacking', successMessage: 'Attack sent!' });
}

export async function withdraw(gameId: number) {
  const tx = contract.methods.withdraw([new U64Value(gameId)]).withGasLimit(8_000_000).withChainID(NETWORK_CONFIG.chainId).buildTransaction();
  return sendTx(tx, { processingMessage: 'Withdrawing...', errorMessage: 'Error withdrawing', successMessage: 'Withdrawn!' });
}

export async function getGameState(gameId: number): Promise<GameState> {
  const query = contract.createQuery({ func: new ContractFunction('getGameState'), args: [new U64Value(gameId)] });
  const qr = await provider.queryContract(query);
  const bundle = new ResultsParser().parseQueryResponse(qr, contract.getEndpoint('getGameState'));
  if (!bundle.firstValue) throw new Error('No result');
  const d = bundle.firstValue.valueOf();
  return { creator: d.creator.toString(), opponent: d.opponent?.toString() ?? null, bet: d.bet.toString(), phase: d.phase.name as GameState['phase'], currentTurn: Number(d.current_turn), winner: d.winner?.toString() ?? null };
}

export async function getPlayerGames(address: string): Promise<number[]> {
  const query = contract.createQuery({ func: new ContractFunction('getPlayerGames'), args: [BytesValue.fromHex(new Address(address).hex())] });
  const qr = await provider.queryContract(query);
  const bundle = new ResultsParser().parseQueryResponse(qr, contract.getEndpoint('getPlayerGames'));
  return bundle.values.map((v) => Number(v.valueOf()));
}

export const battleshipService = { createGame, joinGame, placeShips, attack, withdraw, getGameState, getPlayerGames };
