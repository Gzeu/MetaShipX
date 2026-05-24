# ⚓ MetaShipX

> **Battleship. On-Chain.** — Multiplayer naval strategy game on MultiversX with NFT ships, EGLD wagering, staking rewards, tournaments, secondary marketplace, spectator mode, AI practice bot, and on-chain leaderboard.

[![Build](https://github.com/Gzeu/MetaShipX/actions/workflows/ci.yml/badge.svg)](https://github.com/Gzeu/MetaShipX/actions)
[![E2E Tests](https://github.com/Gzeu/MetaShipX/actions/workflows/e2e-tests.yml/badge.svg)](https://github.com/Gzeu/MetaShipX/actions)
[![Contract Tests](https://github.com/Gzeu/MetaShipX/actions/workflows/contract-tests.yml/badge.svg)](https://github.com/Gzeu/MetaShipX/actions)
[![MultiversX](https://img.shields.io/badge/MultiversX-Devnet-blue)](https://devnet.multiversx.com)
[![Supernova](https://img.shields.io/badge/Supernova-600ms_blocks-brightgreen)](https://docs.multiversx.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![NestJS](https://img.shields.io/badge/NestJS-Backend-E0234E?logo=nestjs)](https://nestjs.com)
[![sdk-dapp](https://img.shields.io/badge/sdk--dapp-v5-blueviolet)](https://github.com/multiversx/mx-sdk-dapp)
[![Rust](https://img.shields.io/badge/Rust-SmartContracts-orange?logo=rust)](https://www.rust-lang.org)
[![multiversx-sc](https://img.shields.io/badge/multiversx--sc-0.65.1-blue)](https://docs.rs/multiversx-sc)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 🎮 What is MetaShipX?

Two players battle on a **10×10 grid**, each commanding a fleet of **NFT ships**. Every move is a blockchain transaction. The winner takes the combined EGLD wager. Match fees automatically fund a **staking reward pool**. Players can **list and buy ships on the marketplace**, unlock **cosmetic skins**, let other users **watch live matches** with hit/miss sounds and animations, and compete on the **on-chain leaderboard**. New players can jump in immediately with **AI Practice Mode** — no wallet, no EGLD required.

**Stack:** Rust smart contracts · React 18 + Vite · TypeScript · Chakra UI · `@multiversx/sdk-dapp` v5 · NestJS backend · WebSocket real-time · PostgreSQL · Docker

---

## ✨ Features

| Area | Description |
|---|---|
| **Battleship PvP** | 10×10 grid, on-chain EGLD wager, turn-based attacks |
| **NFT Fleet** | Mint SFT ships, upgrade level 1–10, win tracking |
| **Staking** | 20% APR, reward pool funded by match fees |
| **Tournaments** | Elimination bracket with EGLD prizes |
| **Marketplace** | 3-tab P2P: Shop · My Fleet · P2P Market (list/buy/cancel) |
| **Leaderboard** | On-chain top-50 all-time by wins + EGLD earned |
| **AI Practice Bot** | 3 difficulties — no wallet, no EGLD, instant onboarding |
| **Spectator Mode** | Live read-only watch via real-time WebSocket |
| **Cosmetics** | Ship skins/traits for visual customisation |
| **Immersion** | Sound effects + hit/miss/sunk/game-over animations |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   FRONTEND (React 18 + Vite)                    │
│  Home · Lobby · Game · Spectator · Staking · Marketplace        │
│  Tournaments · Leaderboard · Profile · Practice (AI Bot)        │
│  sdk-dapp (xPortal / Web Wallet / Ledger / WalletConnect)       │
└────────────┬───────────────────────────────┬────────────────────┘
             │  REST + WebSocket             │ MultiversX API
             ▼                               ▼
┌────────────────────────┐    ┌──────────────────────────────────────┐
│  BACKEND (NestJS)      │    │  SMART CONTRACTS (Rust)              │
│  WebhookController     │    │                                      │
│  EventsGateway (WS)    │    │  contracts/battleship/               │
│  BotService (AI)       │    │  contracts/nft/                      │
│  PracticeController    │    │  contracts/staking/                  │
│  ThrottlerGuard        │    │  contracts/marketplace/              │
│  PostgreSQL (TypeORM)  │    │  contracts/tournament/               │
│  express-session       │    │  contracts/leaderboard/  ← NEW v0.6  │
└────────────────────────┘    └──────────────────────────────────────┘
```

---

## 📝 Smart Contracts

### Battleship (`contracts/battleship/`)

| Endpoint | Description |
|---|---|
| `createGame(bet)` | Create a new game with an EGLD wager |
| `joinGame(gameId)` | Join with the same wager |
| `placeShips(gameId, positions)` | Submit the ship-placement hash (commit-reveal) |
| `attack(gameId, row, col)` | Execute an attack (turn-based) — most-called endpoint |
| `withdraw(gameId)` | Reclaim wager if opponent times out (3 000 blocks) |
| `setLeaderboardContract(addr)` | Owner: wire leaderboard (fire-and-forget notify on win) |
| `getLeaderboardContract` | Returns leaderboard address, or zero if not set |
| `getGameState(gameId)` | Return the full game state |
| `getPlayerGames(address)` | List all games for a player |

> **Gas optimization:** `attack()` uses `SetMapper` for `O(1)` contains checks and batches all storage writes into a single final write. Leaderboard notify uses `transfer_execute` (fire-and-forget, 12M gas) — failure does **not** revert the game. See [`GAS_OPTIMIZATION.md`](contracts/battleship/GAS_OPTIMIZATION.md).

### NFT Ships (`contracts/nft/`)

| Endpoint | Description |
|---|---|
| `registerShipCollection` | Owner issues the SFT collection (0.05 EGLD, once) |
| `mintShip(shipType, name)` | Mint an SFT ship (paid in EGLD) |
| `upgradeShip(nonce)` | Increase ship level (max 10), cost = `level × mint_price` |
| `recordWin(nonce)` | Record an on-chain win (called by battleship contract) |
| `burnShip(nonce)` | Burn the ship and return the token |
| `getShipMetadata(nonce)` | Ship metadata: type, level, wins |
| `getOwnerShips(address)` | All ships for an owner |

**Ship types and prices:**

| Ship | Size | Mint price | Rarity |
|---|---|---|---|
| Destroyer | 2 | 0.05 EGLD | Common |
| Submarine | 3 | 0.08 EGLD | Uncommon |
| Cruiser | 3 | 0.1 EGLD | Rare |
| Battleship | 4 | 0.15 EGLD | Epic |
| Carrier | 5 | 0.25 EGLD | Legendary |

### Staking (`contracts/staking/`)

| Endpoint | Description |
|---|---|
| `fundRewardPool` | Fund the pool with EGLD (anyone, including battleship) |
| `stake` | Deposit EGLD into staking |
| `unstake(amount)` | Partially or fully withdraw |
| `claimRewards` | Claim accumulated rewards (20% APR) |
| `setApr(value)` | Owner sets APR in bps (default 2000 = 20%) |
| `getStakeInfo(address)` | Staking state + pending rewards |
| `getTotalStaked` | Total EGLD locked in the contract |
| `getRewardPool` | Available balance for rewards |

### Marketplace (`contracts/marketplace/`)

| Endpoint | Description |
|---|---|
| `listShip(tokenId, nonce, price)` | List an NFT ship for sale (ESDTNFTTransfer) |
| `buyShip(listingId)` | Buy a listed ship (exact EGLD payment) |
| `cancelListing(listingId)` | Seller cancels and reclaims ship |
| `getListing(listingId)` | Returns full listing struct |
| `getActiveListings` | All active listings (frontend batches 20 concurrent) |

### Tournament (`contracts/tournament/`) — v2-supernova

| Endpoint | Description |
|---|---|
| `createTournament(name, entryFee, maxPlayers)` | Create a new tournament (2–64 players) |
| `joinTournament(tournamentId)` | Join with the entry fee |
| `declareTournamentWinner(id, winner)` | Admin declares the winner |
| `reportMatchResult(tournamentId, matchId, winner)` | Called by the battleship contract |
| `cancelTournament(id)` | Cancel and refund all players |
| `getTournament(id)` | Return full tournament struct (`created_at_ms` in ms) |
| `getCurrentTimestampMs` | Diagnostic: current timestamp in milliseconds |

> **v2-supernova:** `created_at_ms` uses `get_block_timestamp_millis()` — correct at 600 ms blocks. Fresh deploy required vs v1.

### Leaderboard (`contracts/leaderboard/`) — NEW v0.6.0

| Endpoint | Description |
|---|---|
| `updatePlayer(player, egld_won)` | Record win — restricted to battleship contract caller |
| `getTopPlayers(limit)` | Returns sorted `LeaderEntry[]` (wins desc, EGLD tiebreaker) |
| `getPlayerRank(address)` | 1-based rank, 0 if not in top-50 |
| `getPlayerStats(address)` | Returns `(wins, egld_won)` tuple |
| `setBattleshipContract(addr)` | Owner: rotate authorized caller |

> **Design:** Insertion sort O(50) bounded array — gas-safe, predictable cost regardless of total player count. Battleship wires via `setLeaderboardContract` post-deploy; failure of leaderboard call does NOT revert the game.

---

## 🤖 AI Practice Mode

No wallet. No EGLD. No on-chain transactions. Three difficulty levels, accessible from the `/practice` route:

| Difficulty | Algorithm |
|---|---|
| Easy | Random non-repeated shots |
| Medium | Hunt/Target — attacks neighbors after a hit |
| Hard | Probability density map with center weighting + neighbor boost |

Backend: `BotService` (NestJS injectable) + `PracticeController` (REST: `/practice/start`, `/practice/place`, `/practice/attack`). Session-based state, rate-limited (2 attacks/s).

Frontend: `PracticePage` — difficulty selector, 10×10 placement board, 10×10 attack board, win/lose screen with **"vs Real Opponent"** CTA to convert to PvP.

---

## 🖥 Frontend

### Pages

| Page | Route | Description |
|---|---|---|
| `Home` | `/` | Landing, stats, CTA |
| `LobbyPage` | `/lobby` | Active games list, create new game |
| `GamePage` | `/game/:id` | 10×10 board, attacks, turn timer |
| `SpectatorPage` | `/spectate/:id` | Live read-only watch |
| `StakingPage` | `/staking` | Stake / Unstake / Claim rewards |
| `Marketplace` | `/marketplace` | Shop · My Fleet · P2P Market |
| `Tournaments` | `/tournaments` | Brackets, join, results |
| `Leaderboard` | `/leaderboard` | Global top players |
| `Profile` | `/profile/:address` | Ships, stats, match history |
| `PracticePage` | `/practice` | AI Bot — no wallet needed |

### Services & Hooks

```
frontend/src/
├── services/
│   ├── battleship.service.ts   # createGame, joinGame, attack, getGameState
│   │                           # + Tournament: createTournament, joinTournament
│   ├── nft.service.ts          # mintShip, upgradeShip, getUserShips
│   ├── staking.service.ts      # stake, unstake, claimRewards, getStakingInfo
│   └── marketplace.service.ts  # getActiveListings, listShipForSale, buyListing,
│                               #   cancelListing — full TopDecode v0.6.0
├── hooks/
│   ├── useGame.ts              # Full game state + optimistic updates
│   ├── useStaking.ts           # Auto-fetch + refresh after actions
│   ├── useGamePolling.ts       # Supernova-tuned: 600 ms MY_TURN / 1500 ms WAITING
│   ├── useGameWs.ts            # WebSocket live updates
│   └── useSound.ts             # Web Audio FX (hit, miss, sunk, victory)
└── utils/
    └── board.ts                # EMPTY_BOARD, canPlace, applyAttack, serializePositions
```

### Authentication (sdk-dapp v5)

- xPortal Mobile (QR / deeplink)
- Web Wallet (devnet.multiversx.com)
- Ledger Hardware
- WalletConnect v2

### Config (`frontend/src/config.ts`)

Contract addresses injected via `VITE_` env vars. `requireEnv()` throws at build time if any address is missing — no silent wrong-address deploys.

```ts
export const CONTRACTS = {
  BATTLESHIP_ADDRESS:  requireEnv('VITE_BATTLESHIP_ADDRESS'),
  NFT_ADDRESS:         requireEnv('VITE_NFT_ADDRESS'),
  STAKING_ADDRESS:     requireEnv('VITE_STAKING_ADDRESS'),
  MARKETPLACE_ADDRESS: requireEnv('VITE_MARKETPLACE_ADDRESS'),
  TOURNAMENT_ADDRESS:  requireEnv('VITE_TOURNAMENT_ADDRESS'),
  LEADERBOARD_ADDRESS: requireEnv('VITE_LEADERBOARD_ADDRESS'),
} as const;
```

---

## 📁 Project Structure

```
MetaShipX/
├── contracts/
│   ├── battleship/             # PvP game (SetMapper, block_nonce timeouts, leaderboard wiring)
│   │   └── GAS_OPTIMIZATION.md
│   ├── nft/                    # SFT ships mint + upgrade (minted_at_ms)
│   ├── staking/                # EGLD reward pool (millis APR)
│   ├── marketplace/            # Secondary NFT market (P2P list/buy/cancel)
│   ├── tournament/             # Elimination brackets (v2-supernova, created_at_ms)
│   │   └── src/deploy.md
│   └── leaderboard/            # On-chain top-50 (insertion sort, updatePlayer)
│       └── src/deploy.md
├── frontend/
│   ├── src/
│   │   ├── components/         # GameBoard, Navbar, TxButton, TurnTimer
│   │   ├── pages/              # All app pages incl. PracticePage
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # Contract interactions + TopDecode
│   │   ├── utils/              # board.ts, formatters
│   │   └── config.ts           # requireEnv() fail-fast contract addresses
│   └── Dockerfile.dev
├── backend/
│   ├── src/
│   │   ├── game/               # BotService, PracticeController, GameModule
│   │   ├── webhook/            # Controller + Service + Entity
│   │   └── events/             # EventsGateway WebSocket
│   ├── .env.example
│   └── Dockerfile
├── tests/
│   └── e2e/                    # Playwright: game-flow, marketplace, staking, practice
│       └── playwright.config.ts
├── scripts/
│   ├── mainnet-deploy.sh       # Ordered 6-contract deploy + smoke test + env gen
│   └── check-reward-pool.sh    # Cron-ready reward pool health check
├── .github/
│   └── workflows/
│       ├── contract-tests.yml  # Rust build + unit test on contracts/**
│       ├── e2e-tests.yml       # Playwright E2E on frontend/backend changes
│       └── auto-label.yml      # PR auto-labeling by path
├── docs/
│   └── MAINNET_AUDIT_CHECKLIST.md  # 48-point pre-mainnet security checklist
├── docker-compose.yml
├── deploy-devnet.sh
└── README.md
```

---

## 🚀 Installation & Local Setup

### Prerequisites

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install multiversx-sc-meta
pip install multiversx-sdk-cli
node --version  # v20+
```

### Start locally with Docker

```bash
git clone https://github.com/Gzeu/MetaShipX.git
cd MetaShipX
cp backend/.env.example backend/.env.local
# edit: WEBHOOK_SECRET, SESSION_SECRET (32 chars random each)
docker-compose up -d
# Frontend: http://localhost:5173  Backend: http://localhost:4000
```

### Start manually

```bash
# Backend
cd backend
npm install express-session @types/express-session
npm install && npm run start:dev

# Frontend
cd frontend && npm install && npm run dev
```

---

## 📦 Deploy

```bash
# Devnet (full automated — all 6 contracts)
WALLET_PEM=~/devnet-wallet.pem CHAIN=devnet ./scripts/mainnet-deploy.sh

# Mainnet (requires double-confirm: type 'deploy mainnet')
WALLET_PEM=~/mainnet-wallet.pem CHAIN=mainnet ./scripts/mainnet-deploy.sh

# Post-deploy: wire battleship → leaderboard
mxpy contract call $BATTLESHIP_ADDR \
  --function=setLeaderboardContract \
  --arguments $LEADERBOARD_ADDR \
  --pem=wallet.pem --chain=D
```

---

## ⛽ Gas Optimization

`attack()` is the most-called endpoint:

| Technique | Impact |
|---|---|
| `SetMapper` for `attacked_positions` | `contains()` O(1) vs O(n) on `VecMapper` |
| Batch storage writes | Single final write instead of multiple updates |
| Cache storage reads locally | Avoids repeated storage reads per access |
| Leaderboard: `transfer_execute` fire-and-forget | 12M gas cap, never reverts game |

Full details: [`contracts/battleship/GAS_OPTIMIZATION.md`](contracts/battleship/GAS_OPTIMIZATION.md)

---

## 🗺 Roadmap

### ✅ Completed (v0.1–v0.6)
- [x] Battleship PvP smart contract (commit-reveal, block_nonce timeouts, leaderboard wiring)
- [x] NFT contract (SFT mint, upgrade level 1–10, `minted_at_ms`)
- [x] Staking contract (reward pool, 20% APR, Supernova-ready millis)
- [x] Marketplace contract (P2P list/buy/cancel, TopDecode in frontend)
- [x] Tournament contract v2-supernova (`created_at_ms`, `reportMatchResult`)
- [x] **Leaderboard contract** (on-chain top-50, updatePlayer, getTopPlayers)
- [x] Full frontend — all pages incl. PracticePage, sticky Navbar
- [x] AI Bot Practice Mode (Easy/Medium/Hard, no wallet needed)
- [x] NestJS backend — ThrottlerModule active, GameModule wired, express-session
- [x] E2E test suite (Playwright — game, marketplace, staking, practice + Pixel5 mobile)
- [x] CI/CD — contract-tests, e2e-tests, auto-label workflows
- [x] `mainnet-deploy.sh` — 6-contract ordered deploy + smoke test + fail-safe
- [x] `config.ts` fail-fast `requireEnv()` — no silent missing addresses
- [x] `MAINNET_AUDIT_CHECKLIST.md` — 48-point pre-mainnet security checklist

### 🔜 v0.7.0 — Mainnet Prep
- [ ] Devnet full smoke test (all 6 contracts wired)
- [ ] External security audit (Arda Security or equivalent)
- [ ] Video demo 60–90s + GIF in README
- [ ] Leaderboard UI wired to `getTopPlayers` on-chain view
- [ ] `check-reward-pool.sh` cron job on server

### 🔜 v1.0.0 — Mainnet Launch
- [ ] Mainnet deploy + contract verification
- [ ] Launch tournament with sponsored prize pool
- [ ] xPortal featured section submission
- [ ] Referral system (5% from first wager, on-chain)

### 🔜 Post-Launch
- [ ] Spectator betting (EGLD on winner)
- [ ] Guild system + Guild vs Guild tournaments
- [ ] Mobile PWA / xPortal deeplink optimization
- [ ] Multi-chain bridge (Solana ↔ MultiversX NFT ships)

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## 🔒 Security

See [SECURITY.md](SECURITY.md) and [`docs/MAINNET_AUDIT_CHECKLIST.md`](docs/MAINNET_AUDIT_CHECKLIST.md).

## 📄 License

[MIT](LICENSE) © 2026 MetaShipX
