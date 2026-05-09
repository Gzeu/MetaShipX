# ⚓ MetaShipX

> **Battleship. On-Chain.** — Multiplayer naval strategy game on MultiversX with NFT ships, EGLD wagering, staking rewards, tournaments, secondary marketplace, spectator mode, cosmetic skins, and immersive combat FX.

[![Build](https://github.com/Gzeu/MetaShipX/actions/workflows/ci.yml/badge.svg)](https://github.com/Gzeu/MetaShipX/actions)
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

Two players battle on a **10×10 grid**, each commanding a fleet of **NFT ships**. Every move is a blockchain transaction. The winner takes the combined EGLD wager. Match fees automatically fund a **staking reward pool**. Players can **list and buy ships on the marketplace**, unlock **cosmetic skins**, and let other users **watch live matches** with hit/miss sounds and animations.

**Stack:** Rust smart contracts · React 18 + Vite · TypeScript · Chakra UI · `@multiversx/sdk-dapp` v5 · NestJS backend · WebSocket real-time · PostgreSQL · Docker

---

## ✨ Features

| Area | Description |
|---|---|
| **Battleship PvP** | 10×10 grid, on-chain EGLD wager, turn-based attacks |
| **NFT Fleet** | Mint SFT ships, upgrade level 1–10, win tracking |
| **Staking** | 20% APR, reward pool funded by match fees |
| **Tournaments** | Elimination bracket with EGLD prizes |
| **Marketplace** | List and buy NFT ships between players |
| **Spectator Mode** | Live read-only watch via real-time WebSocket |
| **Cosmetics** | Ship skins/traits for visual customisation |
| **Immersion** | Sound effects + hit/miss/sunk/game-over animations |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React 18 + Vite)              │
│  Home · Lobby · Game · Spectator · Staking · Marketplace        │
│  Tournaments · Leaderboard · Profile                            │
│  sdk-dapp (xPortal / Web Wallet / Ledger / WalletConnect)       │
└────────────┬───────────────────────────────┬────────────────────┘
             │  REST + WebSocket             │ MultiversX API
             ▼                               ▼
┌────────────────────────┐    ┌─────────────────────────────────┐
│  BACKEND (NestJS)      │    │  SMART CONTRACTS (Rust)         │
│  WebhookController     │    │                                 │
│  EventsGateway (WS)    │    │  contracts/battleship/          │
│  PostgreSQL (TypeORM)  │    │  contracts/nft/                 │
│  mx-notifier listener  │    │  contracts/staking/             │
└────────────────────────┘    │  contracts/marketplace/         │
                              │  contracts/tournament/          │
                              └─────────────────────────────────┘
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
| `getGameState(gameId)` | Return the full game state |
| `getPlayerGames(address)` | List all games for a player |

> **Gas optimization:** `attack()` uses `SetMapper` for `O(1)` contains checks and batches all storage writes into a single final write. See [`GAS_OPTIMIZATION.md`](contracts/battleship/GAS_OPTIMIZATION.md).

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

### Tournament (`contracts/tournament/`) — v2-supernova

| Endpoint | Description |
|---|---|
| `createTournament(name, entryFee, maxPlayers)` | Create a new tournament (2–64 players) |
| `joinTournament(tournamentId)` | Join with the entry fee |
| `declareTournamentWinner(id, winner)` | Admin declares the winner |
| `reportMatchResult(tournamentId, matchId, winner)` | Called by the battleship contract |
| `cancelTournament(id)` | Cancel and refund all players |
| `getTournament(id)` | Return the full tournament struct (with `created_at_ms` in ms) |
| `getCurrentTimestampMs` | Diagnostic: current timestamp in milliseconds |

> **v2-supernova:** `created_at_ms` uses `get_block_timestamp_millis()` — correct at 600 ms blocks.
> A fresh deploy is required compared to v1. See [`deploy.md`](contracts/tournament/src/deploy.md).

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
| `MarketplacePage` | `/marketplace` | Buy/list NFT ships |
| `Tournaments` | `/tournaments` | Brackets, join, results |
| `Leaderboard` | `/leaderboard` | Global top players |
| `Profile` | `/profile/:address` | Ships, stats, match history |

### Services & Hooks

```
frontend/src/
├── services/
│   ├── battleship.service.ts   # createGame, joinGame, attack, getGameState
│   │                           # + Tournament: createTournament, joinTournament,
│   │                           #   getTournament, getActiveTournaments
│   ├── nft.service.ts          # mintShip, upgradeShip, getUserShips
│   └── staking.service.ts      # stake, unstake, claimRewards, getStakingInfo
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

Contract addresses are injected via `VITE_` environment variables. Run `deploy-devnet.sh` to auto-generate `frontend/.env.local`.

```ts
// frontend/src/config.ts
export const CONTRACTS = {
  BATTLESHIP_ADDRESS:  import.meta.env.VITE_BATTLESHIP_ADDRESS  ?? '',
  NFT_ADDRESS:         import.meta.env.VITE_NFT_ADDRESS         ?? '',
  STAKING_ADDRESS:     import.meta.env.VITE_STAKING_ADDRESS     ?? '',
  MARKETPLACE_ADDRESS: import.meta.env.VITE_MARKETPLACE_ADDRESS ?? '',
  TOURNAMENT_ADDRESS:  import.meta.env.VITE_TOURNAMENT_ADDRESS  ?? '', // v2-supernova — new address after fresh deploy
} as const;
```

---

## 📁 Project Structure

```
MetaShipX/
├── contracts/
│   ├── battleship/             # PvP game on-chain (SetMapper, block_nonce timeouts)
│   │   └── GAS_OPTIMIZATION.md
│   ├── nft/                    # SFT ships mint + upgrade (minted_at_ms)
│   ├── staking/                # EGLD reward pool (millis APR)
│   ├── marketplace/            # Secondary NFT market
│   └── tournament/             # Elimination brackets (v2-supernova, created_at_ms)
│       └── src/deploy.md
├── frontend/
│   ├── src/
│   │   ├── components/         # GameBoard, Navbar, etc.
│   │   ├── pages/              # All app pages
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # Contract interactions
│   │   ├── utils/              # board.ts, formatters
│   │   └── config.ts           # Contract addresses per env
│   └── Dockerfile.dev
├── backend/
│   ├── src/
│   │   ├── webhook/            # Controller + Service + Entity
│   │   └── events/             # EventsGateway WebSocket
│   ├── .env.example
│   └── Dockerfile
├── docker-compose.yml          # Postgres + Backend + Frontend
├── deploy-devnet.sh            # Automated devnet deploy script
└── README.md
```

---

## 🚀 Installation & Local Setup

### Prerequisites

```bash
# Rust + MultiversX framework
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install multiversx-sc-meta

# mxpy CLI
pip install multiversx-sdk-cli

# Node.js 20+
node --version  # v20+
```

### Start locally with Docker

```bash
# 1. Clone the repo
git clone https://github.com/Gzeu/MetaShipX.git
cd MetaShipX

# 2. Configure backend
cp backend/.env.example backend/.env.local
# edit: WEBHOOK_SECRET=<openssl rand -hex 32>

# 3. Start everything
docker-compose up -d

# Frontend: http://localhost:5173
# Backend:  http://localhost:4000
# Postgres: localhost:5432
```

### Start manually (without Docker)

```bash
# Backend
cd backend && npm install && npm run start:dev

# Frontend
cd frontend && npm install && npm run dev
```

---

## 📦 Deploy to Devnet

```bash
# Build and deploy all contracts automatically
chmod +x deploy-devnet.sh
WALLET_PEM=~/devnet-wallet.pem ./deploy-devnet.sh

# OR manually:
cd contracts/battleship
sc-meta all build
mxpy contract deploy \
  --bytecode=output/battleship.wasm \
  --pem=wallet/devnet.pem \
  --chain=D \
  --gas-limit=60000000 \
  --proxy=https://devnet-gateway.multiversx.com

# Repeat for nft/, staking/, marketplace/, tournament/
# Tournament requires a fresh deploy (v2-supernova) — see contracts/tournament/src/deploy.md
# Then update frontend/.env.local with the addresses printed by the script
```

---

## ⛽ Gas Optimization

`attack()` is the most-called endpoint — gas savings have a direct impact on cost per match:

| Technique | Impact |
|---|---|
| `SetMapper` for `attacked_positions` | `contains()` O(1) vs O(n) on `VecMapper` |
| Batch storage writes | Single final write instead of multiple updates |
| Cache storage reads in local variables | Avoids repeated storage reads per access |
| `UnorderedSetMapper` when order is irrelevant | Less gas per insert |

Full details in [`contracts/battleship/GAS_OPTIMIZATION.md`](contracts/battleship/GAS_OPTIMIZATION.md).

---

## 🗺 Roadmap

### ✅ Sprint 1–3 (Completed)
- [x] Battleship smart contract (full PvP, block_nonce timeouts)
- [x] NFT smart contract (SFT mint, upgrade, burn, `minted_at_ms`)
- [x] Staking smart contract (reward pool, configurable APR, millis)
- [x] Tournament smart contract v2-supernova (`created_at_ms`, `reportMatchResult`)
- [x] Frontend — all pages and hooks
- [x] NestJS backend — webhook + WebSocket gateway
- [x] Full Docker Compose setup
- [x] CI/CD GitHub Actions
- [x] `multiversx-sc = "0.65.1"` (Supernova-ready)
- [x] Supernova polling intervals (600 ms MY_TURN / 1500 ms WAITING)
- [x] TypeScript Tournament types (`created_at_ms: bigint`)
- [x] README + CONTRIBUTING + SECURITY + CHANGELOG

### 🚧 Sprint 4 (In progress)
- [ ] Devnet deploy + end-to-end testing (Supernova parameters)
- [ ] Tournament fresh deploy (v2-supernova) + smoke tests
- [ ] Update `VITE_TOURNAMENT_ADDRESS` in `.env.local`
- [ ] Marketplace UI polish (full list/buy flow)
- [ ] Gas measurement on `attack()` — pre/post with `mxpy --simulate`
- [ ] TypeScript strict errors — full audit

### 🔜 Sprint 5+
- [ ] AI Bot opponent (single-player)
- [ ] 60–90s video demo + GIF in README
- [ ] Skin system (cosmetic traits)
- [ ] Global on-chain leaderboard
- [ ] Mainnet launch

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution guide.

## 🔒 Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## 📄 License

[MIT](LICENSE) © 2026 MetaShipX
