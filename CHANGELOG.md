# Changelog

All notable changes to MetaShipX are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [Unreleased]

### Planned
- Video demo 60-90s + GIF in README
- Full devnet E2E test suite (Supernova parameters) — ongoing expansion
- Global leaderboard on-chain
- Mainnet launch
- Sentry integration in frontend/backend
- Mobile responsive audit

---

## [0.5.0] — 2026-05-23

### Added
- **Marketplace service** — `marketplace.service.ts`: `getActiveListings()`, `listShip()`, `buyShip()`, `cancelListing()` with full TypeScript types
- **`useMarketplace` hook** — auto-refresh every 15s, exposes `handleList`, `handleBuy`, `handleCancel` callbacks
- **`ListShipModal`** — Chakra UI modal for listing ships: price input, 2.5% fee preview, tx via `sendTransactions`
- **`BuyShipModal`** — Chakra UI modal for purchasing: rarity badge, stats display, one-click buy flow
- **AI Bot service** (`ai-bot.service.ts`) — 3 difficulty levels:
  - Easy: pure random targeting
  - Medium: Hunt/Target algorithm with parity grid optimization
  - Hard: Probability Density Map (optimal ship placement inference)
- **`PracticeModePage`** (`/practice`) — fully playable offline vs AI, no NFT/EGLD required; free-to-play onboarding
- **E2E test suite** (`tests/e2e/game-flow.spec.ts`) — Playwright tests: Home, Lobby, Marketplace, Staking, Practice Mode, AI Bot unit tests
- **`playwright.config.ts`** — Chromium + Mobile Chrome, CI-optimized, screenshots on failure
- **`ThrottlerModule` config** (`backend/src/throttler.config.ts`) — 3 req/s per IP, 100 req/min; attack throttle 1/2s per player
- **`PlayerAddressThrottlerGuard`** — wallet-address-based throttling for attack endpoint
- **`scripts/mainnet-deploy.sh`** — production deploy script with confirmation prompt, dependency-ordered deploys, auto-generates `.env.mainnet`
- **`scripts/check-reward-pool.sh`** — cron-ready health check: alerts when reward pool < threshold; Discord webhook support
- **`scripts/seed-tournament.sh`** — devnet tournament seed script for smoke testing
- **GitHub Actions: `auto-label.yml`** — auto-labels PRs by changed path (smartcontract/frontend/backend/tests/docs/ci-cd)
- **GitHub Actions: `contract-test.yml`** — builds and tests all Rust contracts on every push to `contracts/`; uploads WASM artifacts
- **GitHub Actions: `e2e-tests.yml`** — runs Playwright E2E on push to main/feature branches
- **GitHub Actions: `sentry-release.yml`** — creates Sentry release on main push (requires `SENTRY_AUTH_TOKEN` secret)
- **`.github/labeler.yml`** — path-based label configuration for auto-labeler

### Changed
- CHANGELOG updated; `[Unreleased]` section trimmed of completed items

---

## [0.4.0] — 2026-05-09

### Added
- **Tournament contract v2-supernova** — `reportMatchResult` endpoint callable
  only by battleship contract; `matchResultReported` event; `getCurrentTimestampMs`
  diagnostic view
- **Tournament deploy runbook** — full `sc-meta build` + `mxpy deploy` + smoke test steps
- **TypeScript Tournament types** — `Tournament` interface, `TournamentStatus`, service methods
- **`GameState.phase`** typed field (`GamePhase` union) alongside deprecated `status`
- **`decodeTournament()`** — manual TopEncode decoder
- **Gas optimization documentation** for `attack()` contract

### Changed
- `tournament/src/lib.rs` — `created_at` → `created_at_ms` (millis)
- `useGamePolling.ts` — Supernova-tuned: MY_TURN 600ms, WAITING 1500ms
- `pollAttackResult` — 600ms interval
- `multiversx.json` — `deployTag: v2-supernova`

### Security
- `reportMatchResult` restricted to `battleship_contract` caller only
- ThrottlerModule rate-limiting recommendations documented

---

## [0.3.1] — 2026-05-08

### Updated
- README roadmap expanded

---

## [0.3.0] — 2026-05-07

### Added
- Staking contract — Supernova-ready from day one
- NFT contract — `minted_at_ms`
- Battleship contract — `TURN_TIMEOUT_BLOCKS = 3_000`
- Backend NestJS — webhook, WebSocket, PostgreSQL
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
- Battleship PvP smart contract (Rust, MultiversX)
- Initial README and project structure
