import { Address, TokenTransfer, Transaction } from '@multiversx/sdk-core';
import { sendTransactions } from '@multiversx/sdk-dapp/services';
import { getNetworkProvider } from '@multiversx/sdk-dapp/utils';
import { CONTRACTS, CHAIN_ID } from '../config';

export interface MarketplaceListing {
  listingId: string;
  seller: string;
  nonce: number;
  shipType: string;
  level: number;
  wins: number;
  rarity: string;
  price: string; // in EGLD string (e.g. "0.15")
  priceRaw: bigint;
  tokenIdentifier: string;
}

/** Fetch all active listings from the marketplace contract via API view */
export async function getActiveListings(): Promise<MarketplaceListing[]> {
  const provider = getNetworkProvider();
  const result = await provider.queryContract({
    address: new Address(CONTRACTS.MARKETPLACE_ADDRESS),
    func: 'getActiveListings',
    args: [],
  });
  if (!result?.returnData?.length) return [];
  return result.returnData.map((raw: string, i: number) => {
    const buf = Buffer.from(raw, 'base64');
    // Simple decode: [listingId(8)][seller(32)][nonce(8)][price(bigint variable)]
    const listingId = buf.readBigUInt64BE(0).toString();
    const seller = new Address(buf.subarray(8, 40)).bech32();
    const nonce = Number(buf.readBigUInt64BE(40));
    const priceRaw = buf.readBigUInt64BE(48);
    const price = (Number(priceRaw) / 1e18).toFixed(4);
    return {
      listingId,
      seller,
      nonce,
      shipType: 'Unknown',
      level: 1,
      wins: 0,
      rarity: 'Common',
      price,
      priceRaw: BigInt(priceRaw),
      tokenIdentifier: '',
    } as MarketplaceListing;
  });
}

/** List an NFT ship on the marketplace */
export async function listShip({
  nonce,
  priceEgld,
  tokenIdentifier,
  senderAddress,
}: {
  nonce: number;
  priceEgld: string;
  tokenIdentifier: string;
  senderAddress: string;
}): Promise<void> {
  const priceRaw = BigInt(Math.round(parseFloat(priceEgld) * 1e18));
  const data = `listShip@${priceRaw.toString(16).padStart(16, '0')}`;
  const tx = new Transaction({
    value: TokenTransfer.egldFromAmount(0),
    data: Buffer.from(data),
    receiver: new Address(CONTRACTS.MARKETPLACE_ADDRESS),
    sender: new Address(senderAddress),
    gasLimit: 10_000_000,
    chainID: CHAIN_ID,
  });
  await sendTransactions({ transactions: [tx], transactionsDisplayInfo: { processingMessage: 'Listing ship...', errorMessage: 'Failed to list ship', successMessage: 'Ship listed!' } });
}

/** Buy a listed NFT ship */
export async function buyShip({
  listingId,
  priceRaw,
  senderAddress,
}: {
  listingId: string;
  priceRaw: bigint;
  senderAddress: string;
}): Promise<void> {
  const listingIdHex = BigInt(listingId).toString(16).padStart(16, '0');
  const data = `buyShip@${listingIdHex}`;
  const tx = new Transaction({
    value: priceRaw,
    data: Buffer.from(data),
    receiver: new Address(CONTRACTS.MARKETPLACE_ADDRESS),
    sender: new Address(senderAddress),
    gasLimit: 15_000_000,
    chainID: CHAIN_ID,
  });
  await sendTransactions({ transactions: [tx], transactionsDisplayInfo: { processingMessage: 'Buying ship...', errorMessage: 'Failed to buy ship', successMessage: 'Ship purchased!' } });
}

/** Cancel/delist a ship listing */
export async function cancelListing({
  listingId,
  senderAddress,
}: {
  listingId: string;
  senderAddress: string;
}): Promise<void> {
  const listingIdHex = BigInt(listingId).toString(16).padStart(16, '0');
  const data = `cancelListing@${listingIdHex}`;
  const tx = new Transaction({
    value: TokenTransfer.egldFromAmount(0),
    data: Buffer.from(data),
    receiver: new Address(CONTRACTS.MARKETPLACE_ADDRESS),
    sender: new Address(senderAddress),
    gasLimit: 8_000_000,
    chainID: CHAIN_ID,
  });
  await sendTransactions({ transactions: [tx], transactionsDisplayInfo: { processingMessage: 'Cancelling listing...', errorMessage: 'Failed to cancel', successMessage: 'Listing cancelled' } });
}
