import { useSkins } from '../hooks/useSkins';
import { ShipSkin } from '../types/skins';
import './ShipSkinsPage.css';

const RARITY_BADGE: Record<string, { label: string; color: string }> = {
  Common:    { label: 'Common',    color: '#94a3b8' },
  Rare:      { label: 'Rare',      color: '#60a5fa' },
  Epic:      { label: 'Epic',      color: '#c084fc' },
  Legendary: { label: 'Legendary', color: '#f59e0b' },
};

interface SkinCardProps {
  skin: ShipSkin;
  isEquipped: boolean;
  onEquip: (id: string) => void;
}

function SkinCard({ skin, isEquipped, onEquip }: SkinCardProps) {
  const badge = RARITY_BADGE[skin.rarity];
  return (
    <div
      className={`skin-card${isEquipped ? ' skin-card--equipped' : ''}${!skin.unlocked ? ' skin-card--locked' : ''}`}
      style={{ '--glow': skin.glowColor } as React.CSSProperties}
    >
      <div className="skin-card__preview" style={{ background: `radial-gradient(circle at 40% 35%, ${skin.glowColor}44, #0f172a 70%)` }}>
        <span className="skin-card__ship-icon">🚢</span>
        {!skin.unlocked && <div className="skin-card__lock">🔒</div>}
      </div>
      <div className="skin-card__body">
        <div className="skin-card__name">{skin.name}</div>
        <span className="skin-card__rarity" style={{ color: badge.color, borderColor: `${badge.color}55` }}>{badge.label}</span>
        {isEquipped && <span className="skin-card__equipped-badge">✓ Equipped</span>}
      </div>
      <button
        className="skin-card__btn"
        disabled={!skin.unlocked || isEquipped}
        onClick={() => onEquip(skin.skinId)}
      >
        {!skin.unlocked ? 'Locked' : isEquipped ? 'Equipped' : 'Equip'}
      </button>
    </div>
  );
}

export default function ShipSkinsPage() {
  const shipNonce = 12; // TODO: connect from profile/selected ship
  const { state, loading, equipSkin } = useSkins(shipNonce);

  return (
    <div className="skins-page">
      <header className="skins-page__header">
        <h1>Ship Skins</h1>
        <p>Cosmetic NFT traits for your fleet. Skins never affect gameplay stats.</p>
      </header>

      {loading ? (
        <div className="skins-page__loading">Loading cosmetics...</div>
      ) : !state ? (
        <div className="skins-page__empty">
          <span>🎨</span>
          <p>No ship selected. Choose a ship from your fleet to manage skins.</p>
        </div>
      ) : (
        <>
          <div className="skins-page__ship-info">
            <span>Ship NFT #{state.shipNonce}</span>
            {state.equippedSkinId && (
              <span className="skins-page__active-skin">
                Active: {state.availableSkins.find((s) => s.skinId === state.equippedSkinId)?.name ?? state.equippedSkinId}
              </span>
            )}
          </div>
          <div className="skins-page__grid">
            {state.availableSkins.map((skin) => (
              <SkinCard
                key={skin.skinId}
                skin={skin}
                isEquipped={state.equippedSkinId === skin.skinId}
                onEquip={(id) => void equipSkin(id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
