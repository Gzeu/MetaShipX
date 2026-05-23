# Changelog

All notable changes to MetaShipX are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [Unreleased]

### Planned
- Video demo 60-90s + GIF in README
- Referral system (5% from first wager)
- Spectator betting (EGLD on winner)
- Mobile PWA / React Native wrapper
- Mainnet security audit (external)
- `battleship` contract: add `setLeaderboardContract` + `updatePlayer` call after game ends

---

## [0.6.0] — 2026-05-24

### Added
- **Leaderboard contract** (`contracts/leaderboard/`) — on-chain top-50 all-time by wins
  - `updatePlayer(player, egld_won)` — restricted to battleship contract caller
  - `getTopPlayers(limit)` — returns sorted `LeaderEntry[]` (wins desc, EGLD tiebreaker)
  - `getPlayerRank(address)` — returns 1-based rank, 0 if not ranked
  - `getPlayerStats(address)` — returns (wins, egld_won)
  - Insertion sort O(50), bounded and gas-safe
  - `setBattleshipContract` owner-only rotation
  - Deploy runbook + smoke tests (`contracts/leaderboard/src/deploy.md`)
- **`marketplace.service.ts`** — replaced `decodeListingB64` stub with real `TopDecode`
  - Parses `listing_id (u64)` + `seller (32B)` + `token_id (len+bytes)` + `nonce (u64)` + `price (bigint)` + `active (bool)` per contract struct
  - `getListingById(id)` — fetches single listing via `getListing` view
  - `getListingCount()` — reads `listing_counter` for iteration bounds
  - `getActiveListings()` — parallel batch fetch (20 concurrent), filters `active=true`
  - `listShipForSale(tokenId, nonce, price)` — correct `ESDTNFTTransfer` data encoding
  - `buyListing(id, priceWei)` — passes raw wei string for exact EGLD match
  - `cancelListing(id)` — correct hex encoding of listing ID
- **`contracts/Cargo.toml`** — `leaderboard` added to workspace members + `multiversx-sc-scenario` added to dev-dependencies
- **`docs/MAINNET_AUDIT_CHECKLIST.md`** — 48-point pre-mainnet security checklist
  covering all 6 contracts, frontend, backend, infrastructure, pre-launch, and post-launch monitoring

### Fixed
- `marketplace.service.ts` — `listShipForSale` now passes `tokenId` as parameter (was hardcoded)
- `marketplace.service.ts` — `buyListing` now passes raw `priceWei` (was EGLD float, caused rounding)
- `marketplace.service.ts` — `cancelListing` now passes numeric listing ID (was string)

### Notes for deploy
1. Build leaderboard: `cd contracts/leaderboard && sc-meta all build --release`
2. Deploy leaderboard: `./scripts/mainnet-deploy.sh` (already includes leaderboard in deploy order)
3. Wire battleship → leaderboard: add `setLeaderboardContract` endpoint to battleship contract (see [Unreleased])
4. No frontend changes needed — `Leaderboard.tsx` already queries backend which can be updated to call `getTopPlayers`

---

## [0.5.0] — 2026-05-24

### Added
- **GameModule** (`backend/src/game/game.module.ts`) — wires `BotService` + `PracticeController` into NestJS DI; exports `BotService` for future PvP matchmaking use
- **Session middleware** (`backend/src/main.ts`) — `express-session` mounted before CORS; powers stateful practice game sessions; cookie `maxAge` 1h, `secure` in production
- **ThrottlerModule** active (`backend/src/app.module.ts`) — global 3 req/s per IP guard applied via `APP_GUARD`; `GameModule` imported; replaces previously documentation-only rate limiting
- **Marketplace P2P flow** (`frontend/src/pages/Marketplace/index.tsx`) — new `listings` tab with filter by type + sort by price/level/wins; `listShipForSale`, `buyListing`, `cancelListing` actions; TX state banner (pending/success/error); duplicate-click protection; seller can cancel own listing
- **`marketplace.service.ts`** (`frontend/src/services/`) — `getActiveListings`, `listShipForSale`, `buyListing`, `cancelListing` using `sendTransactions` + MultiversX API query
- **Navbar** (`frontend/src/components/Navbar.tsx`) — sticky nav with all routes; `/practice` highlighted in green; wallet connect/disconnect; mobile-responsive at 768px
- **Marketplace CSS** — complete redesign: TX banner states, rarity colors, P2P listing cards, filter bar, list/buy/cancel buttons, modal polish

### Changed
- `app.module.ts` — `ThrottlerModule.forRoot` + `GameModule` + `APP_GUARD` ThrottlerGuard added
- `main.ts` — `express-session` middleware added before CORS
- `Marketplace/index.tsx` — extended from mint-only to full mint + fleet + P2P marketplace

### Notes for deploy
1. `npm install express-session @types/express-session` in `backend/`
2. Add `SESSION_SECRET=<random-32-char>` to `backend/.env.local`

---

## [0.4.0] — 2026-05-09

### Added
- **Tournament contract v2-supernova** — `reportMatchResult` endpoint callable
  only by battleship contract; `matchResultReported` event; `getCurrentTimestampMs`
  diagnostic view
- **Tournament deploy runbook** — full `sc-meta build` + `mxpy deploy` + smoke test steps
- **TypeScript Tournament types** — `Tournament` interface with `created_at_ms: bigint`
- **`GameState.phase`** typed field (`GamePhase` union)
- **Gas optimization documentation** for `attack()` contract

### Changed
- `tournament/src/lib.rs` — `created_at` → `created_at_ms` (`get_block_timestamp_millis()`)
- `useGamePolling.ts` — Supernova-tuned intervals: MY_TURN 600ms, WAITING 1500ms
- `multiversx.json` — `deployTag: v2-supernova`

### Security
- `reportMatchResult` restricted to `battleship_contract` caller only
- Commit-reveal hash verification documented

---

## [0.3.0] — 2026-05-07

### Added
- Staking, NFT, Battleship contracts — Supernova-ready
- Backend NestJS — webhook, WebSocket, PostgreSQL
- Frontend — all pages, hooks, services
- Docker Compose, CI/CD

---

## [0.2.0] — 2026-05-01

### Added
- React 18 + Vite frontend, sdk-dapp v5

---

## [0.1.0] — 2026-04-25

### Added
- Repository initialized, Battleship PvP smart contract
