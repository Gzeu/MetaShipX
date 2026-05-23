import { Address, ContractFunction, ResultsParser, SmartContract } from '@multiversx/sdk-core';
import { sendTransactions } from '@multiversx/sdk-dapp/services';
import { CONTRACTS } from '../config';

export interface MarketListing {
  listingId: string;
  seller: string;
  nonce: number;
  shipType: string;
  shipName: string;
  level: number;
  wins: number;
  priceEgld: string;
}

/**
 * Fetch all active P2P listings from the marketplace contract.
 * Falls back to empty array on error (devnet may have no listings).
 */
export async function getActiveListings(): Promise<MarketListing[]> {
  try {
    const addr = CONTRACTS.MARKETPLACE_ADDRESS;
    if (!addr) return [];
    const response = await fetch(
      `${import.meta.env.VITE_MX_API || 'https://devnet-api.multiversx.com'}/vm-values/query`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scAddress: addr,
          funcName: 'getActiveListings',
          args: [],
        }),
      }
    );
    const json = await response.json();
    const rawList: string[] = json?.data?.data?.returnData ?? [];
    return rawList.map((b64, idx) => decodeListingB64(b64, idx));
  } catch {
    return [];
  }
}

function decodeListingB64(b64: string, idx: number): MarketListing {
  // Minimal stub decode — replace with proper TopDecode when ABI types are stable
  // Real decode parses: seller(32 bytes) + nonce(8) + shipType(1) + name(len+bytes) + level(1) + wins(4) + price(bigint)
  return {
    listingId: `listing-${idx}`,
    seller: '0x0000000000000000000000000000000000000000',
    nonce: idx + 1,
    shipType: 'Destroyer',
    shipName: `Ship #${idx + 1}`,
    level: 1,
    wins: 0,
    priceEgld: '0.1',
  };
}

export async function listShipForSale(nonce: number, priceEgld: string): Promise<void> {
  const priceWei = BigInt(Math.round(parseFloat(priceEgld) * 1e18)).toString();
  await sendTransactions({
    transactions: [{
      receiver: CONTRACTS.MARKETPLACE_ADDRESS,
      data: `ESDTNFTTransfer@${nonce.toString(16).padStart(16,'0')}@01@listShip@${priceWei}`,
      gasLimit: 10_000_000,
    }],
    transactionsDisplayInfo: {
      processingMessage: 'Listing ship...',
      errorMessage: 'Listing failed',
      successMessage: 'Ship listed!',
    },
  });
}

export async function buyListing(listingId: string, priceEgld: string): Promise<void> {
  const priceWei = BigInt(Math.round(parseFloat(priceEgld) * 1e18)).toString();
  const listingHex = Buffer.from(listingId).toString('hex');
  await sendTransactions({
    transactions: [{
      receiver: CONTRACTS.MARKETPLACE_ADDRESS,
      value: priceWei,
      data: `buyShip@${listingHex}`,
      gasLimit: 15_000_000,
    }],
    transactionsDisplayInfo: {
      processingMessage: 'Buying ship...',
      errorMessage: 'Purchase failed',
      successMessage: 'Ship purchased!',
    },
  });
}

export async function cancelListing(listingId: string): Promise<void> {
  const listingHex = Buffer.from(listingId).toString('hex');
  await sendTransactions({
    transactions: [{
      receiver: CONTRACTS.MARKETPLACE_ADDRESS,
      data: `cancelListing@${listingHex}`,
      gasLimit: 8_000_000,
    }],
    transactionsDisplayInfo: {
      processingMessage: 'Cancelling listing...',
      errorMessage: 'Cancel failed',
      successMessage: 'Listing cancelled.',
    },
  });
}
