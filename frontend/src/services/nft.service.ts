import {
  Address, ContractFunction, SmartContract,
  U64Value, BytesValue, ResultsParser,
} from '@multiversx/sdk-core';
import { ProxyNetworkProvider } from '@multiversx/sdk-network-providers';
import { sendTransactions } from '@multiversx/sdk-dapp/services';
import { refreshAccount } from '@multiversx/sdk-dapp/utils';
import { NFT_CONTRACT_ADDRESS, NETWORK_CONFIG } from '../config';

export type ShipType = 'Destroyer' | 'Submarine' | 'Cruiser' | 'Battleship' | 'Carrier';
export const SHIP_TYPE_INDEX: Record<ShipType, number> = {
  Destroyer: 0, Submarine: 1, Cruiser: 2, Battleship: 3, Carrier: 4,
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

function egldWei(amount: string): string {
  return String(BigInt(Math.round(parseFloat(amount) * 1e18)));
}

async function sendTx(data: string, valueEgld = '0', gasLimit = 20_000_000) {
  await refreshAccount();
  const { sessionId } = await sendTransactions({
    transactions: [{
      receiver: NFT_CONTRACT_ADDRESS,
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

const SHIP_PRICES: Record<ShipType, string> = {
  Destroyer: '0.05', Submarine: '0.08', Cruiser: '0.12', Battleship: '0.18', Carrier: '0.25',
};

export async function mintShip(shipType: ShipType, name: string) {
  const typeHex = SHIP_TYPE_INDEX[shipType].toString(16).padStart(2, '0');
  const nameHex = Buffer.from(name, 'utf8').toString('hex');
  return sendTx(`mintShip@${typeHex}@${nameHex}`, SHIP_PRICES[shipType], 20_000_000);
}

export async function upgradeShip(nonce: number, upgradeCostEgld: string) {
  const nonceHex = nonce.toString(16).padStart(16, '0');
  return sendTx(`upgradeShip@${nonceHex}`, upgradeCostEgld, 15_000_000);
}

export async function getUserShips(address: string): Promise<ShipMetadata[]> {
  try {
    const addrHex = new Address(address).hex();
    const query = contract.createQuery({
      func: new ContractFunction('getOwnerShips'),
      args: [BytesValue.fromHex(addrHex)],
    });
    const qr = await provider.queryContract(query);
    const parser = new ResultsParser();
    // getOwnerShips returns a variadic list of nonces
    const nonces: number[] = (qr.returnData ?? []).map((raw: string) => {
      const buf = Buffer.from(raw, 'base64');
      return buf.readUInt32BE(Math.max(0, buf.length - 4));
    });
    const ships = await Promise.all(nonces.map(getShipMetadata));
    return ships;
  } catch {
    return [];
  }
}

export async function getShipMetadata(nonce: number): Promise<ShipMetadata> {
  const query = contract.createQuery({
    func: new ContractFunction('getShipMetadata'),
    args: [new U64Value(nonce)],
  });
  const qr = await provider.queryContract(query);
  const bundle = new ResultsParser().parseQueryResponse(
    qr,
    contract.getEndpoint('getShipMetadata'),
  );
  const v = bundle.firstValue!.valueOf();
  const shipTypes: ShipType[] = ['Destroyer', 'Submarine', 'Cruiser', 'Battleship', 'Carrier'];
  return {
    nonce,
    shipType: shipTypes[Number(v.ship_type?.discriminant ?? 0)] ?? 'Destroyer',
    level: Number(v.level ?? 1),
    wins: Number(v.wins ?? 0),
    name: v.name?.toString() ?? '',
  };
}

export async function getMintPrice(): Promise<string> {
  try {
    const query = contract.createQuery({
      func: new ContractFunction('getMintPrice'),
      args: [],
    });
    const qr = await provider.queryContract(query);
    const bundle = new ResultsParser().parseQueryResponse(
      qr,
      contract.getEndpoint('getMintPrice'),
    );
    return bundle.firstValue?.valueOf().toString() ?? '50000000000000000';
  } catch {
    return '50000000000000000';
  }
}

export const nftService = { mintShip, upgradeShip, getUserShips, getShipMetadata, getMintPrice };
