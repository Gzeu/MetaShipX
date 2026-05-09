# Changelog

All notable changes to MetaShipX are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [Unreleased]

### Planned
- AI Bot opponent (single-player mode)
- Video demo 60-90s + GIF in README
- Full devnet E2E test suite (Supernova parameters)
- Marketplace UI polish (list/buy flow end-to-end)
- Global leaderboard on-chain
- Mainnet launch

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
