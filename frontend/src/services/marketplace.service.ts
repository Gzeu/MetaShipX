import { sendTransactions } from '@multiversx/sdk-dapp/services';
import { CONTRACTS } from '../config';

const MX_API = import.meta.env.VITE_MX_API || 'https://devnet-api.multiversx.com';

export interface MarketListing {
  listingId: number;
  seller: string;
  tokenId: string;
  nonce: number;
  priceEgld: string;    // human-readable e.g. "0.15"
  priceWei: string;     // raw BigInt string e.g. "150000000000000000"
  active: boolean;
}

// ---------------------------------------------------------------------------
// TopDecode for Listing<M> struct from contracts/marketplace/src/lib.rs:
//
//   pub struct Listing<M: ManagedTypeApi> {
//       pub listing_id: u64,          → 8 bytes big-endian
//       pub seller:     ManagedAddress → 32 bytes
//       pub token_id:   TokenIdentifier → 4-byte len + N bytes UTF-8
//       pub nonce:      u64            → 8 bytes big-endian
//       pub price:      BigUint        → 4-byte len + N bytes big-endian
//       pub active:     bool           → 1 byte (0x01 = true)
//   }
// ---------------------------------------------------------------------------
export function decodeListing(buf: Uint8Array): MarketListing {
  let offset = 0;

  const read = (n: number): Uint8Array => {
    const slice = buf.slice(offset, offset + n);
    offset += n;
    return slice;
  };

  const readU64 = (): bigint => {
    const b = read(8);
    return b.reduce((acc, byte) => (acc << 8n) | BigInt(byte), 0n);
  };

  const readU32 = (): number => {
    const b = read(4);
    return (b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3];
  };

  // listing_id: u64
  const listing_id = readU64();

  // seller: ManagedAddress (always 32 bytes on MultiversX)
  const sellerBytes = read(32);
  const seller = '0x' + Array.from(sellerBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  // token_id: TokenIdentifier = 4-byte length prefix + bytes
  const tokenIdLen = readU32();
  const tokenIdBytes = read(tokenIdLen);
  const tokenId = new TextDecoder().decode(tokenIdBytes);

  // nonce: u64
  const nonce = readU64();

  // price: BigUint = 4-byte length prefix + big-endian bytes
  const priceLen = readU32();
  const priceBytes = read(priceLen);
  const priceWei = priceBytes.reduce((acc, byte) => (acc << 8n) | BigInt(byte), 0n);
  const priceWeiStr = priceWei.toString();
  const priceEgld = (Number(priceWei) / 1e18).toFixed(4).replace(/\.?0+$/, '');

  // active: bool
  const activeBytes = read(1);
  const active = activeBytes[0] === 0x01;

  return {
    listingId: Number(listing_id),
    seller,
    tokenId,
    nonce: Number(nonce),
    priceEgld,
    priceWei: priceWeiStr,
    active,
  };
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

async function vmQuery(funcName: string, args: string[] = []): Promise<string[]> {
  const res = await fetch(`${MX_API}/vm-values/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scAddress: CONTRACTS.MARKETPLACE_ADDRESS,
      funcName,
      args,
    }),
  });
  const json = await res.json();
  return (json?.data?.data?.returnData as string[]) ?? [];
}

/** Fetch total listing count from contract storage (listing_counter view). */
export async function getListingCount(): Promise<number> {
  try {
    const data = await vmQuery('getListingCounter');
    if (!data.length || !data[0]) return 0;
    const buf = Uint8Array.from(atob(data[0]), c => c.charCodeAt(0));
    return Number(buf.reduce((acc, b) => (acc << 8n) | BigInt(b), 0n));
  } catch {
    return 0;
  }
}

/** Fetch a single listing by ID using the getListing view. */
export async function getListingById(listingId: number): Promise<MarketListing | null> {
  try {
    const idHex = listingId.toString(16).padStart(16, '0');
    const data = await vmQuery('getListing', [idHex]);
    if (!data.length || !data[0]) return null;
    const buf = Uint8Array.from(atob(data[0]), c => c.charCodeAt(0));
    return decodeListing(buf);
  } catch {
    return null;
  }
}

/**
 * Fetch all active listings.
 * Iterates listing_counter and fetches each, filters active=true.
 * Uses parallel requests (max 20 concurrent) for speed.
 */
export async function getActiveListings(): Promise<MarketListing[]> {
  try {
    const count = await getListingCount();
    if (count === 0) return [];

    const ids = Array.from({ length: count }, (_, i) => i + 1);
    const BATCH = 20;
    const results: MarketListing[] = [];

    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      const listings = await Promise.all(batch.map(id => getListingById(id)));
      listings.forEach(l => { if (l?.active) results.push(l); });
    }

    return results;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

/** List a ship SFT for sale via ESDTNFTTransfer → listShip. */
export async function listShipForSale(
  tokenId: string,
  nonce: number,
  priceEgld: string
): Promise<void> {
  const priceWei = BigInt(Math.round(parseFloat(priceEgld) * 1e18));
  const tokenIdHex = Buffer.from(tokenId).toString('hex');
  const nonceHex = nonce.toString(16).padStart(16, '0');
  const amountHex = '01'.padStart(2, '0');  // 1 SFT
  const priceHex = priceWei.toString(16).padStart(2, '0');
  const contractHex = Buffer.from(CONTRACTS.MARKETPLACE_ADDRESS, 'hex').toString('hex');

  // ESDTNFTTransfer: token@nonce@qty@dest_address@function@args
  const data = [
    'ESDTNFTTransfer',
    tokenIdHex,
    nonceHex,
    amountHex,
    contractHex,
    Buffer.from('listShip').toString('hex'),
    priceHex,
  ].join('@');

  await sendTransactions({
    transactions: [{ receiver: CONTRACTS.MARKETPLACE_ADDRESS, data, gasLimit: 12_000_000 }],
    transactionsDisplayInfo: {
      processingMessage: 'Listing ship on marketplace...',
      errorMessage: 'Listing failed. Check you own the ship.',
      successMessage: '🚢 Ship listed successfully!',
    },
  });
}

/** Buy a listed ship — sends exact EGLD price. */
export async function buyListing(listingId: number, priceWei: string): Promise<void> {
  const listingIdHex = listingId.toString(16).padStart(16, '0');
  await sendTransactions({
    transactions: [{
      receiver: CONTRACTS.MARKETPLACE_ADDRESS,
      value: priceWei,
      data: `buyShip@${listingIdHex}`,
      gasLimit: 15_000_000,
    }],
    transactionsDisplayInfo: {
      processingMessage: 'Purchasing ship...',
      errorMessage: 'Purchase failed. Price may have changed.',
      successMessage: '⚓ Ship purchased!',
    },
  });
}

/** Cancel own listing — returns SFT to seller. */
export async function cancelListing(listingId: number): Promise<void> {
  const listingIdHex = listingId.toString(16).padStart(16, '0');
  await sendTransactions({
    transactions: [{
      receiver: CONTRACTS.MARKETPLACE_ADDRESS,
      data: `cancelListing@${listingIdHex}`,
      gasLimit: 8_000_000,
    }],
    transactionsDisplayInfo: {
      processingMessage: 'Cancelling listing...',
      errorMessage: 'Cancel failed.',
      successMessage: 'Listing cancelled. Ship returned.',
    },
  });
}
