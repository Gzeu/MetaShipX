import { useSkins } from '../hooks/useSkins';

export default function ShipSkinsPage() {
  const { state, loading, equipSkin } = useSkins(12);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Ship Skins</h1>
      <p>Cosmetic NFT traits for visual personalization only.</p>
      {loading ? <p>Loading skins...</p> : null}
      <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
        {state?.availableSkins.map((skin) => (
          <div key={skin.skinId} style={{ border: `1px solid ${skin.glowColor}`, boxShadow: `0 0 24px ${skin.glowColor}33`, borderRadius: 16, padding: '1rem', background: '#111827' }}>
            <h3>{skin.name}</h3>
            <p>{skin.rarity}</p>
            <p>{skin.unlocked ? 'Unlocked' : 'Locked'}</p>
            <button disabled={!skin.unlocked} onClick={() => void equipSkin(skin.skinId)}>
              {state.equippedSkinId === skin.skinId ? 'Equipped' : 'Equip skin'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
