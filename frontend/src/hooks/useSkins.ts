import { useEffect, useState } from 'react';
import { skinsService } from '../services/skins.service';
import { ShipCosmeticState } from '../types/skins';

export function useSkins(shipNonce?: number) {
  const [state, setState] = useState<ShipCosmeticState | undefined>();
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (shipNonce == null) return;
    setLoading(true);
    try {
      const data = await skinsService.getShipCosmetics(shipNonce);
      setState(data);
    } finally {
      setLoading(false);
    }
  };

  const equipSkin = async (skinId: string) => {
    if (shipNonce == null) return;
    await skinsService.equipSkin(shipNonce, skinId);
    await refresh();
  };

  useEffect(() => {
    void refresh();
  }, [shipNonce]);

  return { state, loading, refresh, equipSkin };
}
