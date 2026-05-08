/**
 * Marketplace service — real on-chain transactions via sdk-dapp.
 *
 * listShip  → ESDTNFTTransfer (send SFT to marketplace contract)
 * buyShip   → EGLD payment call to marketplace contract
 * cancelListing → simple SC call
 * getListings   → view query on marketplace contract
 */
import { sendTransactions } from '@multiversx/sdk-dapp/services';
import { refreshAccount }   from '@multiversx/sdk-dapp/utils';
import { ProxyNetworkProvider } from '@multiversx/sdk-network-providers';
import { Address } from '@multiversx/sdk-core';
import {
  MARKETPLACE_CONTRACT_ADDRESS,
  NFT_COLLECTION_ID,
  NETWORK_PROVIDER_URL,
} from '../config';
import type { MarketplaceListing, CreateListingParams, BuyListingParams } from '../types/marketplace';

const provider = new ProxyNetworkProvider(NETWORK_PROVIDER_URL);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hex8(n: number) { return n.toString(16).padStart(8, '0'); }
function hex16(n: bigint) { return n.toString(16).padStart(16, '0'); }
function egldWei(egld: string): string {
  return String(BigInt(Math.round(parseFloat(egld) * 1e18)));
}
/** Encode string to hex */
function strHex(s: string) {
  return Buffer.from(s).toString('hex');
}

async function sendTx(
  receiver: string,
  data: string,
  valueEgld = '0',
  gasLimit = 10_000_000
) {
  await refreshAccount();
  const { sessionId } = await sendTransactions({
    transactions: [{ receiver, value: egldWei(valueEgld), data, gasLimit }],
    transactionsDisplayInfo: {
      processingMessage: 'Processing marketplace tx…',
      errorMessage: 'Transaction failed',
      successMessage: 'Transaction successful',
    },
  });
  return sessionId as string;
}

async function queryContract(func: string, args: string[] = []) {
  return provider.queryContract({
    address: new Address(MARKETPLACE_CONTRACT_ADDRESS),
    func,
    args,
    value: BigInt(0),
  } as any);
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class MarketplaceService {
  /**
   * Read all active listings from the contract view.
   */
  async getListings(): Promise<MarketplaceListing[]> {
    try {
      const res = await queryContract('getAllListings');
      return (res.returnData ?? []).map((raw: string) => {
        // Each returnData entry is base64-encoded ABI-packed listing
        const buf = Buffer.from(raw, 'base64');
        // Minimal decode: first 8 bytes = listingId (u64), next 32 = seller, etc.
        // Full decode should use ABI codec — this is a lightweight version.
        const listingId = buf.readBigUInt64BE(0).toString();
        return {
          listingId,
          seller: 'erd1' + buf.slice(8, 40).toString('hex'),
          shipNonce: buf.readUInt32BE(40),
          shipType: 'Unknown',
          shipName: 'Ship #' + buf.readUInt32BE(40),
          level: buf[44] ?? 1,
          wins: buf[45] ?? 0,
          price: buf.readBigUInt64BE(46).toString(),
          skin: undefined,
          active: true,
          createdAt: Math.floor(Date.now() / 1000),
        } as MarketplaceListing;
      });
    } catch {
      return [];
    }
  }

  /**
   * List a ship for sale.
   *
   * MultiversX pattern: ESDTNFTTransfer @collection @nonce @quantity @dest @method @args
   * Sender calls this on SELF (receiver = sender address), with dest = marketplace contract.
   *
   * Caller must pass their own address as `sellerAddress`.
   */
  async createListing(params: CreateListingParams & { sellerAddress: string }): Promise<{ sessionId: string }> {
    const { nonce, price, sellerAddress } = params;

    // ESDTNFTTransfer data field:
    // ESDTNFTTransfer @ collection_hex @ nonce_hex @ quantity_hex @ dest_hex @ method_hex @ price_arg
    const collectionHex = strHex(NFT_COLLECTION_ID);
    const nonceHex = nonce.toString(16).padStart(16, '0');
    const quantityHex = '0000000000000001'; // 1 SFT
    const destHex = Buffer.from(
      new Address(MARKETPLACE_CONTRACT_ADDRESS).pubkey()
    ).toString('hex');
    const methodHex = strHex('listShip');
    // price in wei as arg
    const priceWei = BigInt(Math.round(parseFloat(price) * 1e18));
    const priceHex = hex16(priceWei);

    const data = [
      'ESDTNFTTransfer',
      collectionHex,
      nonceHex,
      quantityHex,
      destHex,
      methodHex,
      priceHex,
    ].join('@');

    // For ESDTNFTTransfer the receiver must be the sender itself
    const sessionId = await sendTx(sellerAddress, data, '0', 15_000_000);
    return { sessionId };
  }

  /**
   * Buy a listed ship by sending exact EGLD to the marketplace contract.
   */
  async buyListing(params: BuyListingParams): Promise<{ sessionId: string }> {
    const { listingId, price } = params;

    // Convert listingId to u64 hex
    const listingIdHex = hex8(parseInt(listingId, 10));
    const data = `buyShip@${listingIdHex}`;

    // Convert price from wei string to EGLD float
    const priceEgld = (BigInt(price) / BigInt(1e15)).toString();
    const priceEgldFloat = (Number(priceEgld) / 1000).toFixed(18);

    const sessionId = await sendTx(
      MARKETPLACE_CONTRACT_ADDRESS,
      data,
      priceEgldFloat,
      15_000_000
    );
    return { sessionId };
  }

  /**
   * Cancel a listing — returns SFT to the seller.
   */
  async cancelListing(listingId: string): Promise<{ sessionId: string }> {
    const listingIdHex = hex8(parseInt(listingId, 10));
    const data = `cancelListing@${listingIdHex}`;
    const sessionId = await sendTx(MARKETPLACE_CONTRACT_ADDRESS, data, '0', 10_000_000);
    return { sessionId };
  }
}

export const marketplaceService = new MarketplaceService();
