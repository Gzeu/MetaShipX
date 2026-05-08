/**
 * MetaShipX — NFT TypeScript Types
 */

export type ShipType = 'Destroyer' | 'Submarine' | 'Cruiser' | 'Battleship' | 'Carrier';
export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Legendary';

export const SHIP_RARITY: Record<ShipType, Rarity> = {
  Destroyer: 'Common',
  Submarine: 'Uncommon',
  Cruiser: 'Uncommon',
  Battleship: 'Rare',
  Carrier: 'Legendary',
};

export const SHIP_MINT_PRICE_EGLD: Record<ShipType, number> = {
  Destroyer: 0.05,
  Submarine: 0.08,
  Cruiser: 0.08,
  Battleship: 0.15,
  Carrier: 0.30,
};

export interface ShipMetadata {
  nonce: number;
  shipType: ShipType;
  name: string;
  level: number;         // 1–10
  wins: number;
  owner: string;
  mintedAt: number;      // unix timestamp
}

export interface MintShipParams {
  shipType: ShipType;
  name: string;
}

export interface UpgradeShipParams {
  nonce: number;
  currentLevel: number;
}
