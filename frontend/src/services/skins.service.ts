import { ShipCosmeticState } from '../types/skins';

const mockCosmetics: ShipCosmeticState[] = [
  {
    shipNonce: 12,
    equippedSkinId: 'crimson-wake',
    availableSkins: [
      { skinId: 'default-steel', name: 'Default Steel', rarity: 'Common', image: '/skins/default-steel.png', glowColor: '#8aa4b8', unlocked: true },
      { skinId: 'crimson-wake', name: 'Crimson Wake', rarity: 'Rare', image: '/skins/crimson-wake.png', glowColor: '#ff5a5f', unlocked: true },
      { skinId: 'aurora-grid', name: 'Aurora Grid', rarity: 'Epic', image: '/skins/aurora-grid.png', glowColor: '#50e3c2', unlocked: false },
    ],
  },
];

export class SkinsService {
  async getShipCosmetics(shipNonce: number): Promise<ShipCosmeticState | undefined> {
    return Promise.resolve(mockCosmetics.find((entry) => entry.shipNonce === shipNonce));
  }

  async equipSkin(shipNonce: number, skinId: string): Promise<{ success: boolean; shipNonce: number; skinId: string }> {
    return Promise.resolve({ success: true, shipNonce, skinId });
  }
}

export const skinsService = new SkinsService();
