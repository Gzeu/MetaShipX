# Changelog

All notable changes to MetaShipX are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### In Progress
- Devnet live deployment
- Tournament bracket UI
- Global leaderboard

---

## [0.3.0] — 2026-05-08

### Added
- **Cross-contract calls** from Battleship SC to NFT and Staking on every `GameOver`
  - `nft.recordWin(winner_ship_nonce)` — on-chain win tracking per ship NFT
  - `staking.fundRewardPool()` + 1% EGLD fee from every finished match
  - New storage: `nft_contract`, `staking_contract`, `player_ship_nonce`
  - New endpoints: `setNftContract`, `setStakingContract`
  - New events: `nftWinRecorded`, `stakingFeeSent`
- **Deploy scripts** — `scripts/deploy-{nft,staking,battleship,tournament}.sh` with auto-wiring
- **Devnet wallet generator** — `scripts/generate-devnet-wallet.sh`
- **Environment template** — `wallet/.env.example` with all variables documented
- **E2E test suite** — `tests/e2e/integration.test.ts`
  - Unit tests: cell encoding, ship math, fee calculation, APR formula, overlap detection
  - E2E tests: contract connectivity, cross-contract wiring verification
- `ship_nonce` parameter added to `createGame` and `joinGame` for NFT linking
- `winner_ship_nonce` field added to `GameState`

### Fixed
- Removed orphan `contracts/src/lib.rs` placeholder (cargo init artifact)

---

## [0.2.0] — 2026-05-07

### Added
- **NFT Contract** (`contracts/nft/`) — SFT ship minting (5 types), Level 1-10 upgrades, `recordWin` endpoint
- **Staking Contract** (`contracts/staking/`) — 20% APR reward pool, stake/unstake/claimRewards, `fundRewardPool`
- **Frontend services** — `battleship.service.ts`, `nft.service.ts`, `staking.service.ts`
- **React hooks** — `useGame.ts` (10×10 board state), `useStaking.ts` (auto-refresh)
- **GameBoard component** — interactive 10×10 grid with CSS animations
- **README.md** — full project documentation

---

## [0.1.0] — 2026-05-06

### Added
- **Battleship SC** — `createGame`, `joinGame`, `placeShips`, `attack`, `withdraw`
- **Tournament SC** — bracket management, `createTournamentGame`, `reportMatchResult`
- **Frontend** — React 18 + Vite, Chakra UI, sdk-dapp v5 migration
- **Backend** — NestJS API, WebSocket gateway, PostgreSQL, Redis
- **CI/CD** — GitHub Actions pipeline (build, lint, test)
- **Docker** — `docker-compose.yml` for full stack
- **Security** — `#[only_owner]` guards, EGLD escrow, SECURITY.md
