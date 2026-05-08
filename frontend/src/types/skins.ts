export type SkinRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export interface ShipSkin {
  skinId: string;
  name: string;
  rarity: SkinRarity;
  image: string;
  glowColor: string;
  unlocked: boolean;
}

export interface ShipCosmeticState {
  shipNonce: number;
  equippedSkinId?: string;
  availableSkins: ShipSkin[];
}
