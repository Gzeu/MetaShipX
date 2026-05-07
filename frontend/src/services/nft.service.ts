import {
  Address, ContractFunction, SmartContract,
  U64Value, BytesValue, ResultsParser,
} from '@multiversx/sdk-core';
import { ProxyNetworkProvider } from '@multiversx/sdk-network-providers';
import { refreshAccount } from '@multiversx/sdk-dapp/out/utils/account/refreshAccount';
import { TransactionManager } from '@multiversx/sdk-dapp/out/managers/TransactionManager';
import { ProviderFactory } from '@multiversx/sdk-dapp/out/providers/ProviderFactory';
import { ProviderTypeEnum } from '@multiversx/sdk-dapp/out/providers/types/providerFactory.types';
import { NFT_CONTRACT_ADDRESS, NETWORK_CONFIG } from '../config';

export type ShipType = 'Destroyer' | 'Submarine' | 'Cruiser' | 'Battleship' | 'Carrier';
export const SHIP_TYPE_INDEX: Record<ShipType, number> = { Destroyer: 0, Submarine: 1, Cruiser: 2, Battleship: 3, Carrier: 4 };
export interface ShipMetadata { nonce: number; shipType: ShipType; level: number; wins: number; name: string; }

const provider = new ProxyNetworkProvider(NETWORK_CONFIG.apiUrl);
const contract = new SmartContract({ address: new Address(NFT_CONTRACT_ADDRESS) });

async function sendTx(tx: any, displayInfo: { processingMessage: string; errorMessage: string; successMessage: string }) {
  await refreshAccount();
  const dappProvider = await ProviderFactory.create({ type: ProviderTypeEnum.extension });
  const signed = await dappProvider.signTransactions([tx]);
  const txManager = TransactionManager.getInstance();
  const sent = await txManager.send(signed);
  return txManager.track(sent, { transactionsDisplayInfo: displayInfo });
}

export async function mintShip(shipType: ShipType, name: string, mintPriceEgld: string) {
  const mintWei = BigInt(Math.round(parseFloat(mintPriceEgld) * 1e18));
  const tx = contract.methods.mintShip([new U64Value(SHIP_TYPE_INDEX[shipType]), BytesValue.fromUTF8(name)]).withValue(mintWei).withGasLimit(20_000_000).withChainID(NETWORK_CONFIG.chainId).buildTransaction();
  return sendTx(tx, { processingMessage: 'Minting ship...', errorMessage: 'Error minting', successMessage: 'Ship minted!' });
}

export async function upgradeShip(nonce: number, upgradeCostEgld: string) {
  const costWei = BigInt(Math.round(parseFloat(upgradeCostEgld) * 1e18));
  const tx = contract.methods.upgradeShip([new U64Value(nonce)]).withValue(costWei).withGasLimit(15_000_000).withChainID(NETWORK_CONFIG.chainId).buildTransaction();
  return sendTx(tx, { processingMessage: 'Upgrading ship...', errorMessage: 'Error upgrading', successMessage: 'Ship upgraded!' });
}

export async function getUserShips(address: string): Promise<number[]> {
  const query = contract.createQuery({ func: new ContractFunction('getOwnerShips'), args: [BytesValue.fromHex(new Address(address).hex())] });
  const qr = await provider.queryContract(query);
  const bundle = new ResultsParser().parseQueryResponse(qr, contract.getEndpoint('getOwnerShips'));
  return bundle.values.map((v) => Number(v.valueOf()));
}

export async function getShipMetadata(nonce: number): Promise<ShipMetadata> {
  const query = contract.createQuery({ func: new ContractFunction('getShipMetadata'), args: [new U64Value(nonce)] });
  const qr = await provider.queryContract(query);
  const bundle = new ResultsParser().parseQueryResponse(qr, contract.getEndpoint('getShipMetadata'));
  const v = bundle.firstValue!.valueOf();
  const shipTypes: ShipType[] = ['Destroyer', 'Submarine', 'Cruiser', 'Battleship', 'Carrier'];
  return { nonce, shipType: shipTypes[Number(v.ship_type.discriminant)], level: Number(v.level), wins: Number(v.wins), name: v.name.toString() };
}

export async function getMintPrice(): Promise<string> {
  const query = contract.createQuery({ func: new ContractFunction('getMintPrice'), args: [] });
  const qr = await provider.queryContract(query);
  const bundle = new ResultsParser().parseQueryResponse(qr, contract.getEndpoint('getMintPrice'));
  return bundle.firstValue!.valueOf().toString();
}

export const nftService = { mintShip, upgradeShip, getUserShips, getShipMetadata, getMintPrice };
