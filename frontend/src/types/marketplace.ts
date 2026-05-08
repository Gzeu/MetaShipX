export interface MarketplaceListing {
  listingId: string;
  seller: string;
  shipNonce: number;
  shipType: string;
  shipName: string;
  level: number;
  wins: number;
  price: string;
  skin?: string;
  active: boolean;
  createdAt: number;
}

export interface CreateListingParams {
  shipNonce: number;
  price: string;
}

export interface BuyListingParams {
  listingId: string;
  price: string;
}
