import {
  Address,
  ContractFunction,
  SmartContract,
  BigUIntValue,
  U64Value,
  BytesValue,
  ResultsParser,
} from '@multiversx/sdk-core';
import { ProxyNetworkProvider } from '@multiversx/sdk-network-providers';
import { sendTransactions } from '@multiversx/sdk-dapp/services';
import { refreshAccount } from '@multiversx/sdk-dapp/utils';
import { NFT_CONTRACT_ADDRESS, NETWORK_CONFIG } from '../config';

export type ShipType = 'Destroyer' | 'Submarine' | 'Cruiser' | 'Battleship' | 'Carrier';

export const SHIP_TYPE_INDEX: Record<ShipType, number> = {
  Destroyer: 0,
  Submarine: 1,
  Cruiser: 2,
  Battleship: 3,
  Carrier: 4,
};

export interface ShipMetadata {
  nonce: number;
  shipType: ShipType;
  level: number;
  wins: number;
  name: string;
}

const provider = new ProxyNetworkProvider(NETWORK_CONFIG.apiUrl);
const contract = new SmartContract({ address: new Address(NFT_CONTRACT_ADDRESS) });

/** Mint a new ship. Pays mint price in EGLD. */
export async function mintShip(shipType: ShipType, name: string, mintPriceEgld: string) {
  const mintWei = BigInt(Math.round(parseFloat(mintPriceEgld) * 1e18));
  const tx = contract.methods
    .mintShip([new U64Value(SHIP_TYPE_INDEX[shipType]), BytesValue.fromUTF8(name)])
    .withValue(mintWei)
    .withGasLimit(20_000_000)
    .withChainID(NETWORK_CONFIG.chainId)
    .buildTransaction();

  await refreshAccount();
  const { sessionId } = await sendTransactions({ transactions: [tx], transactionsDisplayInfo: { processingMessage: 'Minting ship...', errorMessage: 'Error minting', successMessage: 'Ship minted!' } });
  return sessionId;
}

/** Upgrade a ship by nonce. */
export async function upgradeShip(nonce: number, upgradeCostEgld: string) {
  const costWei = BigInt(Math.round(parseFloat(upgradeCostEgld) * 1e18));
  const tx = contract.methods
    .upgradeShip([new U64Value(nonce)])
    .withValue(costWei)
    .withGasLimit(15_000_000)
    .withChainID(NETWORK_CONFIG.chainId)
    .buildTransaction();

  await refreshAccount();
  const { sessionId } = await sendTransactions({ transactions: [tx], transactionsDisplayInfo: { processingMessage: 'Upgrading ship...', errorMessage: 'Error upgrading', successMessage: 'Ship upgraded!' } });
  return sessionId;
}

/** Get all ship nonces owned by an address. */
export async function getUserShips(address: string): Promise<number[]> {
  const query = contract.createQuery({
    func: new ContractFunction('getOwnerShips'),
    args: [BytesValue.fromHex(new Address(address).hex())],
  });
  const queryResponse = await provider.queryContract(query);
  const parser = new ResultsParser();
  const bundle = parser.parseQueryResponse(queryResponse, contract.getEndpoint('getOwnerShips'));
  return bundle.values.map((v) => Number(v.valueOf()));
}

/** Get metadata for a ship by nonce. */
export async function getShipMetadata(nonce: number): Promise<ShipMetadata> {
  const query = contract.createQuery({
    func: new ContractFunction('getShipMetadata'),
    args: [new U64Value(nonce)],
  });
  const queryResponse = await provider.queryContract(query);
  const parser = new ResultsParser();
  const bundle = parser.parseQueryResponse(queryResponse, contract.getEndpoint('getShipMetadata'));
  const v = bundle.firstValue!.valueOf();
  const shipTypes: ShipType[] = ['Destroyer', 'Submarine', 'Cruiser', 'Battleship', 'Carrier'];
  return {
    nonce,
    shipType: shipTypes[Number(v.ship_type.discriminant)],
    level: Number(v.level),
    wins: Number(v.wins),
    name: v.name.toString(),
  };
}

/** Get mint price. */
export async function getMintPrice(): Promise<string> {
  const query = contract.createQuery({ func: new ContractFunction('getMintPrice'), args: [] });
  const queryResponse = await provider.queryContract(query);
  const parser = new ResultsParser();
  const bundle = parser.parseQueryResponse(queryResponse, contract.getEndpoint('getMintPrice'));
  return bundle.firstValue!.valueOf().toString();
}
