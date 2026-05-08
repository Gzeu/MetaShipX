# ⚓ MetaShipX

> **Battleship. On-Chain.** — Multiplayer naval strategy game on MultiversX with NFT ships, EGLD wagering, staking rewards, and tournaments.

[![Build](https://github.com/Gzeu/MetaShipX/actions/workflows/ci.yml/badge.svg)](https://github.com/Gzeu/MetaShipX/actions)
[![MultiversX](https://img.shields.io/badge/MultiversX-Devnet-blue)](https://devnet.multiversx.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![sdk-dapp](https://img.shields.io/badge/sdk--dapp-v5-blueviolet)](https://github.com/multiversx/mx-sdk-dapp)
[![Rust](https://img.shields.io/badge/Rust-SmartContracts-orange?logo=rust)](https://www.rust-lang.org)
[![Tests](https://img.shields.io/badge/Tests-Unit%20%2B%20E2E-brightgreen)](#testing)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## What is MetaShipX?

Two players battle on a 10×10 grid, each commanding a fleet of **NFT ships**. Every move is a blockchain transaction. The winner takes the combined EGLD wager. Match fees automatically fund a **staking reward pool**. Compete in elimination **tournaments** and upgrade your fleet over time.

**Stack:** Rust smart contracts · React 18 + Vite · Chakra UI · `@multiversx/sdk-dapp` v5 · NestJS backend · WebSocket real-time · Docker

---

## Table of Contents

- [Architecture](#architecture)
- [Smart Contracts](#smart-contracts)
- [Frontend](#frontend)
- [Backend & WebSocket](#backend--websocket)
- [Quick Start](#quick-start)
- [Deploy to Devnet](#deploy-to-devnet)
- [Testing](#testing)
- [Cross-Contract Integration](#cross-contract-integration)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)
- [Security](#security)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MultiversX Devnet                         │
│                                                                   │
│  ┌─────────────┐   attack/GameOver   ┌──────────────────────┐   │
│  │  Battleship │ ──────────────────► │    NFT Contract      │   │
│  │     SC      │   recordWin(nonce)  │  (SFT ships, L1-10)  │   │
│  │             │                     └──────────────────────┘   │
│  │             │   1% fee EGLD       ┌──────────────────────┐   │
│  │             │ ──────────────────► │   Staking Contract   │   │
│  │             │   fundRewardPool    │   (20% APR, no lock) │   │
│  │             │                     └──────────────────────┘   │
│  │             │   tournament result ┌──────────────────────┐   │
│  │             │ ──────────────────► │ Tournament Contract  │   │
│  └─────────────┘   reportMatchResult │ (brackets, prizes)  │   │
│                                       └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          ▲                                       ▲
          │ transactions                          │ queries
┌─────────────────────────────────────────────────────────────────┐
│                React Frontend (Vite + sdk-dapp v5)               │
│  GameBoard 10×10 · Lobby · Staking · Tournaments · Marketplace  │
└─────────────────────────────────────────────────────────────────┘
          ▲
          │ WebSocket (real-time moves)
┌─────────────────────────────────────────────────────────────────┐
│                 NestJS Backend + Redis + PostgreSQL              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Smart Contracts

All contracts are in `contracts/` and written in Rust using the [MultiversX framework](https://docs.multiversx.com/developers/smart-contracts).

### Battleship (`contracts/battleship/`)

| Endpoint | Payment | Description |
|---|---|---|
| `createGame(ship_nonce)` | EGLD (bet) | Create a match, lock wager, register your ship NFT |
| `joinGame(game_id, ship_nonce)` | EGLD (= bet) | Opponent joins with matching wager |
| `placeShips(positions[])` | — | Each player places 5 ships secretly on their 10×10 grid |
| `attack(game_id, x, y)` | — | Attack a cell; validates hit/miss/sunk/GameOver |
| `withdraw(game_id)` | — | Creator reclaims bet if no opponent joined |
| `createTournamentGame(...)` | — | Called by tournament SC to create a bracket match |
| `setNftContract(addr)` | — | Owner: wire NFT SC for win recording |
| `setStakingContract(addr)` | — | Owner: wire Staking SC for fee forwarding |
| `setTournamentContract(addr)` | — | Owner: wire Tournament SC |

**On every `GameOver`:**
1. 🏆 Winner receives **99% of the 2× pot** (EGLD)
2. 🪙 **1% fee** forwarded to Staking SC → `fundRewardPool`
3. 🚢 **NFT win recorded** → `nft.recordWin(winner_ship_nonce)`
4. 🏅 If tournament game → `tournament.reportMatchResult(...)`

### NFT Ships (`contracts/nft/`)

| Ship | Grid Size | Mint Price | Rarity |
|---|---|---|---|
| Destroyer | 2 cells | 0.05 EGLD | Common |
| Submarine | 3 cells | 0.08 EGLD | Uncommon |
| Cruiser | 3 cells | 0.08 EGLD | Uncommon |
| Battleship | 4 cells | 0.15 EGLD | Rare |
| Carrier | 5 cells | 0.30 EGLD | Legendary |

| Endpoint | Description |
|---|---|
| `registerShipCollection` | Owner: issue SFT collection (costs 0.05 EGLD to system SC) |
| `mintShip(type, name)` | Mint 1 SFT ship, EGLD payment |
| `upgradeShip(nonce)` | Increase ship level (max 10), costs `level × mint_price` |
| `recordWin(nonce)` | Called by Battleship SC — increments win counter on NFT |
| `burnShip(nonce)` | Return token & destroy it |

### Staking (`contracts/staking/`)

Deposit EGLD → earn `amount × APR × elapsed / SECONDS_PER_YEAR`. Claim anytime, **no lock-up**. Reward pool funded automatically by 1% match fees from Battleship SC.

| Endpoint | Description |
|---|---|
| `stake` | Deposit EGLD; auto-claims pending rewards first |
| `unstake(amount)` | Partial or full withdrawal; auto-claims |
| `claimRewards` | Claim accrued EGLD rewards |
| `fundRewardPool` | Anyone (or Battleship SC) funds the pool |
| `setApr(bps)` | Owner: set APR in basis points (default 2000 = 20%) |

### Tournament (`contracts/tournament/`)

Elimination brackets with on-chain prize distribution. Creates Battleship games per match via cross-contract call.

---

## Frontend

Built with React 18 + Vite, Chakra UI, `@multiversx/sdk-dapp` v5.

### Pages

| Page | Route | Description |
|---|---|---|
| Home | `/` | Landing, connect wallet |
| Lobby | `/lobby` | Browse open games, create game |
| Game | `/game/:id` | Live 10×10 GameBoard, attack, ship placement |
| Tournaments | `/tournaments` | Browse & join brackets |
| Staking | `/staking` | Stake/unstake/claim with live APR display |
| Marketplace | `/marketplace` | Mint & upgrade ships |
| Profile | `/profile` | Stats, NFT fleet, history |

### Key Services (`frontend/src/services/`)

```typescript
// battleship.service.ts  — createGame, joinGame, placeShips, attack, withdraw
// nft.service.ts         — mintShip, upgradeShip, getUserShips, getMintPrice
// staking.service.ts     — stake, unstake, claimRewards, getStakingInfo
// tournament.service.ts  — createTournament, joinTournament, listTournaments
```

### Key Hooks (`frontend/src/hooks/`)

```typescript
// useGame.ts     — full game state, board 10×10, optimistic updates
// useStaking.ts  — auto-fetch on mount, refresh after every action
// useNft.ts      — user's ship fleet, mint/upgrade flows
// useProfile.ts  — win/loss stats, leaderboard ranking
```

### sdk-dapp v5 Patterns

```typescript
// Bootstrap (main.tsx)
await initApp({ dAppConfig: { environment: EnvironmentsEnum.devnet, nativeAuth: true } });

// Login
const provider = await ProviderFactory.create({ type: ProviderTypeEnum.walletConnect });
await provider.login({ callbackUrl: window.location.origin + '/lobby' });

// Send transaction
await refreshAccount();
const signed = await provider.signTransactions([tx]);
await TransactionManager.getInstance().send(signed);
```

Supported wallets: **xPortal Mobile · MultiversX Extension · Web Wallet · Ledger**

---

## Backend & WebSocket

NestJS API at `backend/` with:
- **REST API** — game state cache, leaderboard, player profiles
- **WebSocket Gateway** — real-time move broadcast between players
- **PostgreSQL** — persistent game history, stats
- **Redis** — session cache, WebSocket pub/sub

---

## Quick Start

### Prerequisites

```bash
# Rust + wasm target
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown

# MultiversX CLI
pip3 install multiversx-sdk-cli

# Node.js 20+
nvm install 20 && nvm use 20
```

### Frontend Dev

```bash
cd frontend
npm install
cp .env.example .env.local   # fill in contract addresses after deploy
npm run dev                   # http://localhost:5173
```

### Backend Dev

```bash
cd backend
npm install
docker-compose up -d          # PostgreSQL + Redis
npm run start:dev             # http://localhost:3001
```

### Full Stack (Docker)

```bash
docker-compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
```

---

## Deploy to Devnet

### Step 1 — Generate a wallet

```bash
bash scripts/generate-devnet-wallet.sh
# → creates wallet/deployer.pem
# → prints your erd1... address
```

### Step 2 — Fund with devnet EGLD

Visit [devnet-wallet.multiversx.com/faucet](https://devnet-wallet.multiversx.com/faucet) and request at least **1 EGLD** for your deployer address.

### Step 3 — Deploy contracts in order

```bash
bash scripts/deploy-nft.sh         # → sets NFT_CONTRACT_ADDRESS in .env
bash scripts/deploy-staking.sh     # → sets STAKING_CONTRACT_ADDRESS in .env
bash scripts/deploy-battleship.sh  # → deploys + auto-wires NFT & Staking
bash scripts/deploy-tournament.sh  # → deploys + auto-wires Battleship
```

Each script **auto-updates `.env`** with the deployed address and **auto-calls `setNftContract` / `setStakingContract`** where applicable.

### Step 4 — Register NFT collection

```bash
# Already prompted by deploy-nft.sh, or run manually:
mxpy contract call $NFT_CONTRACT_ADDRESS \
  --function registerShipCollection \
  --value 50000000000000000 \
  --pem wallet/deployer.pem \
  --gas-limit 100000000 \
  --proxy https://devnet-gateway.multiversx.com \
  --recall-nonce --send
```

### Step 5 — Update frontend env

```bash
# Copy contract addresses to frontend
cp .env frontend/.env.local
# Edit frontend/.env.local — rename keys from CONTRACT_ADDRESS to VITE_*
```

### Environment Variables

See [`wallet/.env.example`](wallet/.env.example) for the full reference. Key variables:

```env
NETWORK=devnet
WALLET_PEM=./wallet/deployer.pem
BATTLESHIP_CONTRACT_ADDRESS=erd1...
NFT_CONTRACT_ADDRESS=erd1...
STAKING_CONTRACT_ADDRESS=erd1...
TOURNAMENT_CONTRACT_ADDRESS=erd1...
```

---

## Testing

### Unit Tests (no network required)

```bash
# TypeScript unit tests
cd frontend && npm test

# Runs immediately, no .env needed:
# ✓ Cell encoding bijection (100 cells)
# ✓ Ship lengths sum to 17
# ✓ Staking fee: 1% of 2× bet → 99% to winner
# ✓ APR calculation: 20% on 1 EGLD/year
# ✓ Ship overlap detection
# ✓ Valid ship placement on 10×10 board
```

### E2E Integration Tests (requires deployed contracts)

```bash
# Set contract addresses in .env first, then:
npx jest tests/e2e/integration.test.ts --testTimeout=120000

# Tests:
# ✓ All 3 contracts respond to queries
# ✓ Battleship has NFT + Staking addresses wired
# ✓ APR > 0
# ✓ Mint price > 0
# ✓ Cross-contract wiring verified
```

### Smart Contract Tests

```bash
cd contracts/battleship && cargo test
cd contracts/nft        && cargo test
cd contracts/staking    && cargo test
```

---

## Cross-Contract Integration

The three contracts are wired together after deploy. Here's the full call graph for a completed game:

```
Player A calls attack(game_id, x, y)
  └─► Battleship SC detects GameOver
        ├─► send 99% EGLD prize to Player A (winner)
        ├─► nft.recordWin(winner_ship_nonce)       [8M gas]
        ├─► staking.fundRewardPool()  + 1% EGLD    [8M gas]
        └─► tournament.reportMatchResult(...)       [10M gas]  (if tournament game)
```

All cross-contract calls use `transfer_execute` (fire-and-forget async). If a target contract address is not set (zero address), the call is silently skipped — no panic.

---

## Project Structure

```
MetaShipX/
├── contracts/
│   ├── battleship/src/lib.rs      — game logic + cross-contract calls
│   ├── nft/src/lib.rs             — SFT minting, levels, win tracking
│   ├── staking/src/lib.rs         — APR pool, stake/unstake/claim
│   ├── tournament/src/lib.rs      — brackets, prize distribution
│   └── mxpy.json                  — build config
├── frontend/
│   ├── src/
│   │   ├── services/              — blockchain interaction layer
│   │   ├── hooks/                 — React state hooks
│   │   ├── components/GameBoard/  — 10×10 interactive grid
│   │   ├── pages/                 — 7 app pages
│   │   ├── types/                 — TypeScript interfaces
│   │   └── utils/                 — formatters, encoders
│   └── .env.example
├── backend/                       — NestJS API + WebSocket
├── tests/e2e/integration.test.ts  — E2E + unit test suite
├── scripts/
│   ├── generate-devnet-wallet.sh
│   ├── deploy-nft.sh
│   ├── deploy-staking.sh
│   ├── deploy-battleship.sh
│   └── deploy-tournament.sh
├── wallet/.env.example            — environment variable reference
├── docker-compose.yml
├── CHANGELOG.md
└── README.md
```

---

## Roadmap

### ✅ Sprint 1-3 — Complete
- [x] Battleship SC — full game cycle, EGLD wager, attack validation
- [x] NFT SC — 5 ship types, Level 1–10 upgrades, win tracking
- [x] Staking SC — 20% APR, auto-claim, reward pool
- [x] Tournament SC — elimination brackets, cross-contract game creation
- [x] Cross-contract wiring — battleship → nft → staking → tournament
- [x] Frontend — 7 pages, GameBoard 10×10, sdk-dapp v5
- [x] Backend — NestJS, WebSocket, PostgreSQL, Redis
- [x] CI/CD — GitHub Actions (build, test, lint)
- [x] Docker — docker-compose for full stack
- [x] Deploy scripts — 4 scripts with auto-wiring
- [x] E2E test suite — unit + integration tests
- [x] Security review — `#[only_owner]` guards, EGLD safety

### 🔜 Sprint 4 — In Progress
- [ ] **Devnet deploy** — live contracts on `devnet.multiversx.com`
- [ ] **Live leaderboard** — global top players by wins/EGLD
- [ ] **Tournament bracket UI** — visual bracket with live updates

### 📋 Sprint 5+
- [ ] NFT secondary marketplace (list/buy ships)
- [ ] Spectator mode (watch live matches)
- [ ] Sound & hit/miss animations
- [ ] Ship skin system (cosmetic NFT traits)
- [ ] Mainnet launch

---

## Security

- `#[only_owner]` guards on all admin endpoints (`setNftContract`, `setStakingContract`, `setApr`, etc.)
- Ship placements are **private** — opponent cannot query your grid
- EGLD wager **locked in contract** until match ends or creator withdraws
- Cross-contract calls are **fire-and-forget** — a failed downstream call cannot revert the game result
- All transactions signed **client-side** via `ProviderFactory` — private keys never leave the browser
- See [`SECURITY.md`](SECURITY.md) for vulnerability reporting

---

MIT © 2026 MetaShipX — Built on [MultiversX](https://multiversx.com)
