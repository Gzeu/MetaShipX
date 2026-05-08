# MetaShipX — Feature Implementation Plan

## 1. NFT Secondary Marketplace

### Smart Contract (`contracts/marketplace/`)
- `listShip(price)` + ESDT payment — locks ship SFT in contract
- `buyShip(listing_id)` + EGLD payment — atomic swap: SFT → buyer, EGLD → seller
- `cancelListing(listing_id)` — returns SFT to seller
- **Fee:** 2.5% of sale price → owner treasury
- Views: `getListing(id)`, `getSellerListings(address)`
- Events: `listingCreated`, `listingSold`, `listingCancelled`

### Frontend
- `marketplace.service.ts` — `getListings`, `createListing`, `buyListing`, `cancelListing`
- `useMarketplace.ts` — state + refresh after every mutation
- `MarketplacePage.tsx` — grid with filter/sort, ship cards, list modal
- Types: `MarketplaceListing`, `CreateListingParams`, `BuyListingParams`

### TODO
- Wire `createListing` to real `listShip` SC endpoint (send SFT via `sdk-dapp`)
- Wire `buyListing` to real `buyShip` SC endpoint (send EGLD)
- Add cancellation flow in seller profile page
- Integrate listing history / sold listings tab

---

## 2. Spectator Mode

### Backend (`backend/src/spectator/`)
- `SpectatorGateway` — Socket.io namespace `/spectator`
- Rooms: `spectate:{gameId}` per match
- Events emitted to spectators: `attack_event`, `spectator_count`
- `broadcastAttack(payload)` called by `GameService` after on-chain confirmation
- **Never** broadcasts private ship positions

### Frontend
- `spectator.service.ts` — Socket.io client, `watchGame(gameId, onAttack)` returns cleanup fn
- `useSpectator.ts` — subscribes/unsubscribes on gameId change, real-time event accumulation
- `SpectatorBoard.tsx` — read-only 10×10 board showing hit/miss/sunk marks from events
- `SpectatorPage.tsx` — live match list + dual board view + attack feed

### TODO
- Wire `GameService` to call `spectatorGateway.broadcastAttack()` on each confirmed attack
- Add match list from database (currently mock)
- Add spectator count display in GameBoard header for players
- Replay mode for finished matches (timeline scrubbing)

---

## 3. Sound & Hit/Miss Animations

### Audio (`frontend/src/audio/`)
- `BattleAudioManager` singleton — lazy loads mp3+ogg fallbacks
- Sounds: `hit`, `miss`, `sunk`, `gameover`, `your_turn`, `enemy_turn`, `place_ship`, `victory`, `defeat`
- `useBattleAudio()` — `play(name)`, `muted`, `toggleMute()`
- `useAttackSound()` — auto-plays correct sound from `AttackResult` + who attacked

### Animations (`frontend/src/components/BattleFx/`)
- `BattleFx` — full overlay with expanding rings + emoji icon + glow label
- `CellFx` — inline dot on board cell (hit=red, miss=blue, sunk=orange)
- `MuteButton` — 🔇/🔊 toggle in navbar or game header
- CSS-only animations, respects `prefers-reduced-motion`

### TODO
- Add mp3/ogg sound files to `frontend/public/sounds/`
- Integrate `useAttackSound` + `BattleFx` in `GameBoard.tsx` attack handler
- Integrate `CellFx` inside each board cell
- Add `MuteButton` to game header

---

## 4. Ship Skin System

### Architecture
- **Phase 1 (off-chain):** Skin metadata stored in backend DB per `(owner_address, ship_nonce)`. No on-chain tx needed.
- **Phase 2 (on-chain):** Skin NFTs as separate SFT tokens. `equipSkin(ship_nonce, skin_nft_nonce)` stores association on NFT contract.

### Types
- `ShipSkin` — `{ skinId, name, rarity, glowColor, unlocked }`
- `ShipCosmeticState` — `{ shipNonce, equippedSkinId, availableSkins[] }`
- `SkinRarity` — Common | Rare | Epic | Legendary

### Frontend
- `skins.service.ts` — `getShipCosmetics(nonce)`, `equipSkin(nonce, skinId)`
- `useSkins(shipNonce)` — auto-fetch + refresh after equip
- `ShipSkinsPage.tsx` — full skin gallery with glow cards, rarity badges, equip/locked states

### TODO
- Backend endpoint: `GET /ships/:nonce/skins`, `POST /ships/:nonce/skins/equip`
- Connect `skinsService` to real backend instead of mock data
- Connect to selected ship from profile/fleet page (currently hardcoded nonce=12)
- Phase 2: design skin NFT token standard and on-chain equip endpoint
