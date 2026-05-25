# Changelog

All notable changes to MetaShipX are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [Unreleased]

### Planned
- External audit (Arda Security) — brief ready at `docs/AUDIT_BRIEF.md`
- Testnet deploy + smoke test
- Uptime Kuma monitoring setup
- PostgreSQL SSL (`?sslmode=require`)
- Mainnet launch — v1.0.0

---

## [0.9.0] — 2026-05-25

### Added
- **Sentry backend** — `@sentry/nestjs` init before `NestFactory.create`, `nestIntegration()`, `SentryFilter` global exception filter, `SENTRY_DSN` fail-fast in production, `tracesSampleRate: 0.1` in prod
- **Sentry frontend** — `@sentry/react` init before `initApp`, `browserTracingIntegration` + `replayIntegration` (5% session replay, 100% error replay), `ignoreErrors` for wallet cancellations
- **`docs/AUDIT_BRIEF.md`** — full 8-section external audit brief: scope (6 contracts + backend), architecture diagram, 11 pre-applied fixes, threat model for battleship/staking/marketplace critical paths, gas notes, test coverage instructions, deliverables requested
- **MAINNET_AUDIT_CHECKLIST.md** — #40 marked ✅ Done v0.9.0; #41 branch protection instructions added; #14 links to AUDIT_BRIEF.md

### Changed
- `backend/src/main.ts` — Sentry init block at top (before AppModule creation)
- `frontend/src/main.tsx` — Sentry init block before `initApp`

### Remaining before v1.0.0 mainnet
- #14 External audit
- #24 PostgreSQL SSL
- #32 Git history secret scan (local)
- #38 Fund reward pool ≥ 50 EGLD
- #39 Uptime Kuma
- #41 Branch protection on main

---

## [0.8.0] — 2026-05-24

### Added
- **Contract audit hardening** (PR #3)
  - Staking: `MAX_APR = 10_000 bps` hard cap; state-before-send; unit tests
  - Marketplace: `active = false` + nonce cleared BEFORE sends; re-list guard; `getActiveListings(offset, limit)` paginated view
  - NFT: `require!(level < 10)`; `saturating_mul` overflow-safe cost; `registerCollection` once-guard; `burnShip` caller == owner
  - Battleship: `audit_tests.rs` — wager=0, OOB coords, SetMapper 100-cell, timeout docs
- **Backend prod hardening** (PR #4)
  - `main.ts` fail-fast: SESSION_SECRET ≥ 32, ADMIN_SECRET ≥ 16, MX_WEBHOOK_PUBKEY, FRONTEND_URL
  - `webhook.guard.ts` — `WebhookSignatureGuard`: sha256(pubkey + rawBody) == X-Signature
  - `docker-compose.yml` — `user: node`, `cap_drop: ALL`, `no-new-privileges`, healthchecks
  - `httpOnly: true` on session cookie
- **Devnet smoke test + E2E** (PR #5)
  - `scripts/devnet-smoke-test.sh` — 7 contract checks, color output, exit 1 on failure
  - `tests/e2e/leaderboard.spec.ts` — 4 tests (renders, headers, mobile 390px, tab switching)
  - `tests/e2e/practice.spec.ts` — 5 tests (no wallet, difficulty selector, start, no EGLD UI, mobile)
  - `docs/MAINNET_AUDIT_CHECKLIST.md` — 48/48 items tracked, 43 done

---

## [0.7.0] — 2026-05-24

### Added
- **Leaderboard on-chain wired** — `getTopPlayers` real TopDecode in `leaderboard.service.ts`
- `LEADERBOARD_ADDRESS` added to `config.ts` `requireEnv()` guard
- Battleship contract calls `setLeaderboardContract` on deploy

---

## [0.6.0] — 2026-05-24

### Added
- **Leaderboard contract** (`contracts/leaderboard/`) — on-chain top-50, insertion sort O(50), `updatePlayer` restricted to battleship, `getTopPlayers` / `getPlayerRank` / `getPlayerStats`
- **Battleship ↔ Leaderboard** wiring — `setLeaderboardContract` owner endpoint, `notify_leaderboard()` fire-and-forget (12M gas, non-reverting)
- **Marketplace TopDecode** — full replace of `decodeListingB64` stub; parallel batch fetch 20 concurrent; correct `ESDTNFTTransfer` encoding
- **`docs/MAINNET_AUDIT_CHECKLIST.md`** — 48-point pre-mainnet checklist
- **README** — 6-contract architecture, Leaderboard + Practice Mode sections

---

## [0.5.0] — 2026-05-23

### Added
- **Marketplace P2P** — 3 tabs: Shop, My Fleet, P2P Market; TX banner; duplicate-click protection; filter + sort
- **`marketplace.service.ts`** — `getActiveListings`, `listShipForSale`, `buyListing`, `cancelListing`
- **AI Bot Practice Mode** — `BotService` (Easy/Medium/Hard), `PracticeController`, `PracticePage` (no wallet, no EGLD)
- **Backend wired** — `ThrottlerModule` active (3 req/s), `GameModule`, `express-session`
- **E2E tests** — game-flow, marketplace, staking, practice (Playwright + Pixel5 mobile)
- **CI** — `contract-tests.yml`, `e2e-tests.yml`, `auto-label.yml`
- **`scripts/mainnet-deploy.sh`** — 5-contract ordered deploy + smoke + double-confirm
- **`config.ts`** — `requireEnv()` fail-fast helper
- **Navbar** — sticky, all routes, `/practice` green highlight, wallet connect/disconnect

---

## [0.4.0] — 2026-05-09

### Added
- Tournament contract v2-supernova — `reportMatchResult`, `matchResultReported` event, `getCurrentTimestampMs`
- TypeScript Tournament types — `Tournament`, `TournamentStatus`, service methods
- `GameState.phase` typed field (`GamePhase` union)
- Gas optimization documentation (`GAS_OPTIMIZATION.md`)

### Changed
- `tournament/src/lib.rs` — `created_at` → `created_at_ms` (`get_block_timestamp_millis()`)
- `useGamePolling.ts` — MY_TURN: 600ms, WAITING: 1500ms
- `multiversx.json` — `deployTag: v2-supernova`

### Security
- `reportMatchResult` restricted to `battleship_contract` caller only
- `ThrottlerModule` rate-limiting documented

---

## [0.3.0] — 2026-05-07

### Added
- Staking contract (`contracts/staking/`) — Supernova-ready from day one
- NFT contract (`contracts/nft/`) — `minted_at_ms`
- Battleship contract — `TURN_TIMEOUT_BLOCKS = 3_000`
- Backend NestJS — webhook controller, WebSocket gateway, PostgreSQL
- Frontend — all pages, hooks, services, board utilities
- Docker Compose, CI/CD GitHub Actions

---

## [0.2.0] — 2026-05-01

### Added
- React 18 + Vite frontend scaffolding
- `sdk-dapp` v5 wallet integration
- Game board utilities
- Initial routing

---

## [0.1.0] — 2026-04-25

### Added
- Repository initialized
- Battleship PvP smart contract (Rust)
- Initial README and project structure
