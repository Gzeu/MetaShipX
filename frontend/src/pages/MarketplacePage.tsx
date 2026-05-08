import React, { useState, useEffect } from 'react';
import { useGetAccountInfo } from '@multiversx/sdk-dapp/hooks';
import { nftService, ShipMetadata } from '../services/nft.service';
import './MarketplacePage.css';

const SHIP_TYPES = [
  { id: 0, name: 'Destroyer',  size: 2, emoji: '🛥', price: '0.01' },
  { id: 1, name: 'Submarine',  size: 3, emoji: '🤿', price: '0.02' },
  { id: 2, name: 'Cruiser',    size: 3, emoji: '⛵', price: '0.03' },
  { id: 3, name: 'Battleship', size: 4, emoji: '🚢', price: '0.05' },
  { id: 4, name: 'Carrier',    size: 5, emoji: '✈',  price: '0.10' },
] as const;

type Tab = 'mint' | 'fleet' | 'upgrade';

export default function MarketplacePage() {
  const { address }       = useGetAccountInfo();
  const [tab, setTab]     = useState<Tab>('mint');
  const [fleet, setFleet] = useState<ShipMetadata[]>([]);
  const [fleetLoading, setFleetLoading]   = useState(false);
  const [mintPrice, setMintPrice]         = useState<string>('');
  const [txPending, setTxPending]         = useState(false);
  const [txMsg, setTxMsg]                 = useState('');
  const [selectedShip, setSelectedShip]   = useState<ShipMetadata | null>(null);

  useEffect(() => {
    nftService.getMintPrice().then(p => setMintPrice(p)).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab !== 'mint' && address) {
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Mint failed';
      setTxMsg(`❌ ${msg}`);
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Upgrade failed';
      setTxMsg(`❌ ${msg}`);
    } finally {
      setTxPending(false);
    }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'mint',    label: '🛠 Mint' },
    { id: 'fleet',   label: '🚢 My Fleet' },
    { id: 'upgrade', label: '⬆ Upgrade' },
  ];

  return (
    <main className="marketplace-page">
      <h1 className="marketplace-title">⚓ Ship Marketplace</h1>

      <nav className="marketplace-tabs" aria-label="Marketplace sections">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`mkt-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => { setTab(t.id); setTxMsg(''); }}
            aria-current={tab === t.id ? 'page' : undefined}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {txMsg && (
        <p
          role="status"
          className={`mkt-tx-msg${txMsg.startsWith('✅') ? ' mkt-tx-msg--ok' : ' mkt-tx-msg--err'}`}
        >
          {txMsg}
        </p>
      )}

      {/* MINT TAB */}
      {tab === 'mint' && (
        <div className="mkt-mint-grid">
          {SHIP_TYPES.map(ship => (
            <article key={ship.id} className="mkt-ship-card">
              <div className="mkt-ship-emoji" aria-hidden="true">{ship.emoji}</div>
              <h2>{ship.name}</h2>
              <p className="mkt-ship-meta">Size: <strong>{ship.size}</strong> cells</p>
              <p className="mkt-ship-price">
                {mintPrice
                  ? (Number(BigInt(mintPrice)) / 1e18).toFixed(3)
                  : ship.price} EGLD
              </p>
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
            </article>
          ))}
        </div>
      )}

      {/* FLEET TAB */}
      {tab === 'fleet' && (
        <section className="mkt-fleet">
          {!address && <p className="mkt-connect">Connect wallet to view your fleet.</p>}
          {address && fleetLoading && <p className="mkt-loading">Loading your ships…</p>}
          {address && !fleetLoading && fleet.length === 0 && (
            <div className="mkt-empty">
              <p>No ships yet — head to <strong>Mint</strong> to acquire your first vessel!</p>
            </div>
          )}
          {address && !fleetLoading && fleet.length > 0 && (
            <div className="mkt-fleet-grid">
              {fleet.map(ship => (
                <article
                  key={ship.nonce}
                  className={`mkt-fleet-card${selectedShip?.nonce === ship.nonce ? ' selected' : ''}`}
                  onClick={() => setSelectedShip(prev => prev?.nonce === ship.nonce ? null : ship)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setSelectedShip(ship)}
                >
                  <div className="mkt-ship-emoji" aria-hidden="true">
                    {SHIP_TYPES[ship.shipType as 0|1|2|3|4]?.emoji ?? '🚢'}
                  </div>
                  <h3>{ship.name}</h3>
                  <p className="mkt-ship-level">Lv {ship.level}</p>
                  <p className="mkt-ship-record">{ship.wins}W / {ship.losses ?? 0}L</p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* UPGRADE TAB */}
      {tab === 'upgrade' && (
        <section className="mkt-upgrade">
          {!address && <p className="mkt-connect">Connect wallet to upgrade ships.</p>}
          {address && (
            <>
              <p className="mkt-upgrade-hint">Select a ship to upgrade (max level 10).</p>
              {fleetLoading && <p className="mkt-loading">Loading…</p>}
              {!fleetLoading && fleet.length === 0 && <p>No ships in fleet. Mint first!</p>}
              <div className="mkt-fleet-grid">
                {fleet.map(ship => (
                  <article
                    key={ship.nonce}
                    className={`mkt-fleet-card${selectedShip?.nonce === ship.nonce ? ' selected' : ''}${ship.level >= 10 ? ' maxed' : ''}`}
                    onClick={() => ship.level < 10 && setSelectedShip(prev => prev?.nonce === ship.nonce ? null : ship)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && ship.level < 10 && setSelectedShip(ship)}
                    aria-disabled={ship.level >= 10}
                  >
                    <div className="mkt-ship-emoji" aria-hidden="true">
                      {SHIP_TYPES[ship.shipType as 0|1|2|3|4]?.emoji ?? '🚢'}
                    </div>
                    <h3>{ship.name}</h3>
                    <p className="mkt-ship-level">Lv {ship.level} / 10</p>
                    {ship.level >= 10 && <span className="mkt-maxlevel">MAX</span>}
                  </article>
                ))}
              </div>
              {selectedShip && selectedShip.level < 10 && (
                <div className="mkt-upgrade-confirm">
                  <p>
                    Upgrade <strong>{selectedShip.name}</strong> →{' '}
                    <strong>Level {selectedShip.level + 1}</strong>
                  </p>
                  <button
                    className="btn btn-accent"
                    onClick={() => handleUpgrade(selectedShip.nonce)}
                    disabled={txPending}
                  >
                    {txPending ? 'Processing…' : 'Confirm Upgrade'}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setSelectedShip(null)}>Cancel</button>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </main>
  );
}
