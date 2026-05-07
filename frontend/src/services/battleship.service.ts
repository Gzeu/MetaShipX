import {
  Address,
  ContractFunction,
  SmartContract,
  BigUIntValue,
  U64Value,
  BooleanValue,
  BytesValue,
  ArgSerializer,
  ResultsParser,
  TransactionWatcher,
} from '@multiversx/sdk-core';
import { ProxyNetworkProvider } from '@multiversx/sdk-network-providers';
import { sendTransactions } from '@multiversx/sdk-dapp/services';
import { refreshAccount } from '@multiversx/sdk-dapp/utils';
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

export interface ShipPlacement {
  x: number;
  y: number;
  length: number;
  isVertical: boolean;
}

const provider = new ProxyNetworkProvider(NETWORK_CONFIG.apiUrl);
const contract = new SmartContract({ address: new Address(BATTLESHIP_CONTRACT_ADDRESS) });

/** Create a new game with a bet amount in EGLD */
export async function createGame(betEgld: string) {
  const betWei = BigInt(Math.round(parseFloat(betEgld) * 1e18));
  const tx = contract.methods
    .createGame([])
    .withValue(betWei)
    .withGasLimit(10_000_000)
    .withChainID(NETWORK_CONFIG.chainId)
    .buildTransaction();

  await refreshAccount();
  const { sessionId } = await sendTransactions({ transactions: [tx], transactionsDisplayInfo: { processingMessage: 'Creating game...', errorMessage: 'Error creating game', successMessage: 'Game created!' } });
  return sessionId;
}

/** Join an existing game */
export async function joinGame(gameId: number, betEgld: string) {
  const betWei = BigInt(Math.round(parseFloat(betEgld) * 1e18));
  const tx = contract.methods
    .joinGame([new U64Value(gameId)])
    .withValue(betWei)
    .withGasLimit(10_000_000)
    .withChainID(NETWORK_CONFIG.chainId)
    .buildTransaction();

  await refreshAccount();
  const { sessionId } = await sendTransactions({ transactions: [tx], transactionsDisplayInfo: { processingMessage: 'Joining game...', errorMessage: 'Error joining game', successMessage: 'Joined game!' } });
  return sessionId;
}

/** Place ships on the board */
export async function placeShips(gameId: number, ships: ShipPlacement[]) {
  // Encode as MultiValueEncoded<MultiValue4<u8, u8, u8, bool>>
  const args = ships.flatMap((s) => [
    new U64Value(s.x),
    new U64Value(s.y),
    new U64Value(s.length),
    new BooleanValue(s.isVertical),
  ]);

  const tx = contract.methods
    .placeShips([new U64Value(gameId), ...args])
    .withGasLimit(20_000_000)
    .withChainID(NETWORK_CONFIG.chainId)
    .buildTransaction();

  await refreshAccount();
  const { sessionId } = await sendTransactions({ transactions: [tx], transactionsDisplayInfo: { processingMessage: 'Placing ships...', errorMessage: 'Error placing ships', successMessage: 'Ships placed!' } });
  return sessionId;
}

/** Attack a cell */
export async function attack(gameId: number, x: number, y: number) {
  const tx = contract.methods
    .attack([new U64Value(gameId), new U64Value(x), new U64Value(y)])
    .withGasLimit(15_000_000)
    .withChainID(NETWORK_CONFIG.chainId)
    .buildTransaction();

  await refreshAccount();
  const { sessionId } = await sendTransactions({ transactions: [tx], transactionsDisplayInfo: { processingMessage: 'Attacking...', errorMessage: 'Error attacking', successMessage: 'Attack sent!' } });
  return sessionId;
}

/** Withdraw bet (creator only, before opponent joins) */
export async function withdraw(gameId: number) {
  const tx = contract.methods
    .withdraw([new U64Value(gameId)])
    .withGasLimit(8_000_000)
    .withChainID(NETWORK_CONFIG.chainId)
    .buildTransaction();

  await refreshAccount();
  const { sessionId } = await sendTransactions({ transactions: [tx], transactionsDisplayInfo: { processingMessage: 'Withdrawing...', errorMessage: 'Error withdrawing', successMessage: 'Withdrawn!' } });
  return sessionId;
}

/** Query game state (read-only) */
export async function getGameState(gameId: number): Promise<GameState> {
  const query = contract.createQuery({
    func: new ContractFunction('getGameState'),
    args: [new U64Value(gameId)],
  });
  const queryResponse = await provider.queryContract(query);
  const parser = new ResultsParser();
  const bundle = parser.parseQueryResponse(queryResponse, contract.getEndpoint('getGameState'));

  if (!bundle.firstValue) throw new Error('No result');
  const decoded = bundle.firstValue.valueOf();
  return {
    creator: decoded.creator.toString(),
    opponent: decoded.opponent?.toString() ?? null,
    bet: decoded.bet.toString(),
    phase: decoded.phase.name as GameState['phase'],
    currentTurn: Number(decoded.current_turn),
    winner: decoded.winner?.toString() ?? null,
  };
}

/** Query player games */
export async function getPlayerGames(address: string): Promise<number[]> {
  const query = contract.createQuery({
    func: new ContractFunction('getPlayerGames'),
    args: [BytesValue.fromHex(new Address(address).hex())],
  });
  const queryResponse = await provider.queryContract(query);
  const parser = new ResultsParser();
  const bundle = parser.parseQueryResponse(queryResponse, contract.getEndpoint('getPlayerGames'));
  return bundle.values.map((v) => Number(v.valueOf()));
}
