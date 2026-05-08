import React, { useState, useEffect } from 'react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { nftService, ShipMetadata } from '../services/nft.service';

const SHIP_TYPES = [
  { id: 0, name: 'Destroyer',  size: 2, emoji: '🛥', price: '0.01' },
  { id: 1, name: 'Submarine',  size: 3, emoji: '🤿', price: '0.02' },
  { id: 2, name: 'Cruiser',    size: 3, emoji: '⛵', price: '0.03' },
  { id: 3, name: 'Battleship', size: 4, emoji: '🚢', price: '0.05' },
  { id: 4, name: 'Carrier',    size: 5, emoji: '✈',  price: '0.10' },
];

tabs types
type Tab = 'mint' | 'fleet' | 'upgrade';

export default function MarketplacePage() {
  const { address }      = useGetAccountInfo();
  const [tab, setTab]    = useState<Tab>('mint');
  const [fleet, setFleet] = useState<ShipMetadata[]>([]);
  const [fleetLoading, setFleetLoading] = useState(false);
  const [mintPrice, setMintPrice]       = useState<string>('');
  const [txPending, setTxPending]       = useState(false);
  const [txMsg, setTxMsg]               = useState('');
  const [selectedShip, setSelectedShip] = useState<ShipMetadata | null>(null);

  useEffect(() => {
    nftService.getMintPrice().then(p => setMintPrice(p)).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'fleet' && address) {
      setFleetLoading(true);
      nftService.getUserShips(address)
        .then(ships => setFleet(ships))
        .catch(() => setFleet([]))
        .finally(() => setFleetLoading(false));
    }
  }, [tab, address]);

  async function handleMint(shipTypeId: number, shipName: string) {
    if (!address) return;
    setTxPending(true); setTxMsg('');
    try {
      await nftService.mintShip(shipTypeId, shipName);
      setTxMsg(`✅ Minting ${shipName}! Check your fleet in a moment.`);
    } catch (e: any) {
      setTxMsg(`❌ ${e?.message ?? 'Mint failed'}`);
    } finally {
      setTxPending(false);
    }
  }

  async function handleUpgrade(nonce: number) {
    if (!address) return;
    setTxPending(true); setTxMsg('');
    try {
      await nftService.upgradeShip(nonce);
      setTxMsg('✅ Upgrade submitted!');
      setSelectedShip(null);
    } catch (e: any) {
      setTxMsg(`❌ ${e?.message ?? 'Upgrade failed'}`);
    } finally {
      setTxPending(false);
    }
  }

  return (
    <main className="marketplace-page">
      <h1 className="marketplace-title">⚓ Ship Marketplace</h1>

      <div className="marketplace-tabs">
        {(['mint', 'fleet', 'upgrade'] as Tab[]).map(t => (
          <button
            key={t}
            className={`mkt-tab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'mint' ? '🛠 Mint' : t === 'fleet' ? '🚢 My Fleet' : '⬆ Upgrade'}
          </button>
        ))}
      </div>

      {txMsg && (
        <p className={`mkt-tx-msg${txMsg.startsWith('✅') ? ' ok' : ' err'}`}>{txMsg}</p>
      )}

      {/* MINT TAB */}
      {tab === 'mint' && (
        <div className="mkt-mint-grid">
          {SHIP_TYPES.map(ship => (
            <div key={ship.id} className="mkt-ship-card">
              <div className="mkt-ship-emoji">{ship.emoji}</div>
              <h2>{ship.name}</h2>
              <p className="mkt-ship-size">Size: {ship.size} cells</p>
              <p className="mkt-ship-price">{ship.price} EGLD</p>
              {!address ? (
                <a href="/unlock" className="btn btn-primary">Connect Wallet</a>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => handleMint(ship.id, ship.name)}
                  disabled={txPending}
                >
                  Mint {ship.name}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* FLEET TAB */}
      {tab === 'fleet' && (
        <div className="mkt-fleet">
          {!address && <p className="mkt-connect">Connect wallet to view your fleet.</p>}
          {address && fleetLoading && <p>Loading your ships…</p>}
          {address && !fleetLoading && fleet.length === 0 && (
            <div className="mkt-empty">
              <p>No ships yet. Head to the Mint tab to acquire your first vessel!</p>
            </div>
          )}
          <div className="mkt-fleet-grid">
            {fleet.map(ship => (
              <div
                key={ship.nonce}
                className={`mkt-fleet-card${selectedShip?.nonce === ship.nonce ? ' selected' : ''}`}
                onClick={() => setSelectedShip(ship)}
              >
                <div className="mkt-ship-emoji">
                  {SHIP_TYPES[ship.shipType]?.emoji ?? '🚢'}
                </div>
                <h3>{ship.name}</h3>
                <p>Level {ship.level}</p>
                <p>{ship.wins}W / {ship.losses}L</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* UPGRADE TAB */}
      {tab === 'upgrade' && (
        <div className="mkt-upgrade">
          {!address && <p className="mkt-connect">Connect wallet to upgrade ships.</p>}
          {address && (
            <>
              <p className="mkt-upgrade-hint">Select a ship from your fleet to upgrade it.</p>
              {fleet.length === 0 && !fleetLoading && (
                <p>No ships in fleet. Mint first!</p>
              )}
              <div className="mkt-fleet-grid">
                {fleet.map(ship => (
                  <div
                    key={ship.nonce}
                    className={`mkt-fleet-card${selectedShip?.nonce === ship.nonce ? ' selected' : ''}`}
                    onClick={() => setSelectedShip(ship)}
                  >
                    <div className="mkt-ship-emoji">{SHIP_TYPES[ship.shipType]?.emoji ?? '🚢'}</div>
                    <h3>{ship.name}</h3>
                    <p>Level {ship.level} / 10</p>
                    {ship.level >= 10 && <span className="mkt-maxlevel">MAX</span>}
                  </div>
                ))}
              </div>
              {selectedShip && selectedShip.level < 10 && (
                <div className="mkt-upgrade-confirm">
                  <p>Upgrade <strong>{selectedShip.name}</strong> from Level {selectedShip.level} → {selectedShip.level + 1}</p>
                  <button
                    className="btn btn-accent"
                    onClick={() => handleUpgrade(selectedShip.nonce)}
                    disabled={txPending}
                  >
                    Confirm Upgrade
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}
