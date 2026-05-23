# Changelog

All notable changes to MetaShipX are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [Unreleased]

### Planned
- Video demo 60-90s + GIF in README
- Global leaderboard on-chain contract
- Referral system (5% from first wager)
- Spectator betting (EGLD on winner)
- Mobile PWA / React Native wrapper
- Mainnet security audit (external)

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
3. Register `GameModule` is automatic via `app.module.ts` import
4. Add `/practice` link visible in `Navbar` — no additional routing needed (route already in `App.tsx`)
5. `marketplace.service.ts` `decodeListingB64` is a stub — replace with full TopDecode once ABI is finalized

---

## [0.4.0] — 2026-05-09

### Added
- **Tournament contract v2-supernova** — `reportMatchResult` endpoint callable
  only by battleship contract; `matchResultReported` event; `getCurrentTimestampMs`
  diagnostic view ([`lib.rs`](contracts/tournament/src/lib.rs))
- **Tournament deploy runbook** — full `sc-meta build` + `mxpy deploy` + smoke
  test steps, rollback strategy ([`deploy.md`](contracts/tournament/src/deploy.md))
- **TypeScript Tournament types** — `Tournament` interface with `created_at_ms: bigint`,
  `TournamentStatus` union, `createTournament()`, `joinTournament()`,
  `getTournament()`, `getActiveTournaments()` service methods
  ([`battleship.service.ts`](frontend/src/services/battleship.service.ts))
- **`GameState.phase`** typed field (`GamePhase` union) alongside deprecated `status`
- **`decodeTournament()`** — manual TopEncode decoder for tournament struct
- **Gas optimization documentation** for `attack()` contract
  ([`GAS_OPTIMIZATION.md`](contracts/battleship/GAS_OPTIMIZATION.md))

### Changed
- **`tournament/src/lib.rs`** — `created_at` (raw seconds) → `created_at_ms`
  (`get_block_timestamp_millis()`); struct field rename for Supernova correctness
- **`useGamePolling.ts`** — Supernova-tuned intervals:
  - `MY_TURN`: 2 000 ms → **600 ms** (1 block)
  - `WAITING`: 5 000 ms → **1 500 ms** (~2.5 blocks)
  - Back-off cap: 30 000 ms → **10 000 ms**
- **`pollAttackResult`** polling interval: 1 200 ms → **600 ms**
- **`multiversx.json`** — `deployTag: v2-supernova`; added `_notes` about
  storage layout change requiring fresh deploy
- **`sendTx`** — accepts optional `receiver` param; `sendTournamentTx` helper
  routes calls to `TOURNAMENT_CONTRACT_ADDRESS`
- **`queryContract`** — accepts optional `contract` param; `queryTournament` helper

### Security
- `reportMatchResult` restricted to `battleship_contract` caller only
- `ThrottlerModule` rate-limiting recommendations documented (3 req/s per IP
  on short window, max 1 attack/2s per player)
- Commit-reveal hash verification documented in security review

### Infrastructure
- `contracts/tournament/src/deploy.md` — fresh deploy required (v1→v2 migration)
- Smoke test commands included to verify `getCurrentTimestampMs` on devnet

---

## [0.3.1] — 2026-05-08

### Updated
- README roadmap expanded with marketplace, spectators, sounds, skins
- Project vision updated to include cosmetics and immersive battle presentation

---

## [0.3.0] — 2026-05-07

### Added
- Staking contract (`contracts/staking/`) — `get_block_timestamp_millis()`,
  `MILLIS_PER_YEAR`, `MIN_ELAPSED_MS = 600` (Supernova-ready from day one)
- NFT contract (`contracts/nft/`) — `minted_at_ms` with `get_block_timestamp_millis()`
- Battleship contract — `TURN_TIMEOUT_BLOCKS = 3_000`, all time logic via
  `get_block_nonce()` (no raw timestamp usage)
- Backend NestJS — webhook controller, WebSocket events gateway, PostgreSQL
- Frontend — all pages, hooks, services, board utilities
- Docker Compose, CI/CD GitHub Actions
- `multiversx-sc = "0.65.1"` workspace (≫ 0.63.0 Supernova requirement)

---

## [0.2.0] — 2026-05-01

### Added
- React 18 + Vite frontend scaffolding
- `sdk-dapp` v5 wallet integration (xPortal, Web Wallet, Ledger, WalletConnect)
- Game board utilities (`board.ts`)
- Initial routing (Home, Lobby, Game, Staking, Marketplace, Tournaments)

---

## [0.1.0] — 2026-04-25

### Added
- Repository initialized
- Battleship PvP smart contract (Rust, MultiversX framework)
- Initial README and project structure
