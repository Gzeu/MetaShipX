import { MarketplaceListing, CreateListingParams, BuyListingParams } from '../types/marketplace';

const mockListings: MarketplaceListing[] = [
  {
    listingId: 'listing-1',
    seller: 'erd1alice...meta',
    shipNonce: 12,
    shipType: 'Battleship',
    shipName: 'Iron Tide',
    level: 4,
    wins: 11,
    price: '1500000000000000000',
    skin: 'Crimson Wake',
    active: true,
    createdAt: Math.floor(Date.now() / 1000) - 3600,
  },
  {
    listingId: 'listing-2',
    seller: 'erd1bob...meta',
    shipNonce: 21,
    shipType: 'Carrier',
    shipName: 'Nova Crest',
    level: 7,
    wins: 24,
    price: '3200000000000000000',
    skin: 'Aurora Steel',
    active: true,
    createdAt: Math.floor(Date.now() / 1000) - 7200,
  },
];

export class MarketplaceService {
  async getListings(): Promise<MarketplaceListing[]> {
    return Promise.resolve(mockListings.filter((l) => l.active));
  }

  async createListing(params: CreateListingParams): Promise<{ success: boolean; params: CreateListingParams }> {
    return Promise.resolve({ success: true, params });
  }

  async buyListing(params: BuyListingParams): Promise<{ success: boolean; params: BuyListingParams }> {
    return Promise.resolve({ success: true, params });
  }

  async cancelListing(listingId: string): Promise<{ success: boolean; listingId: string }> {
    return Promise.resolve({ success: true, listingId });
  }
}

export const marketplaceService = new MarketplaceService();
