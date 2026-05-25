# ⚓ MetaShipX

> **Battleship. On-Chain.** — Multiplayer naval strategy game on MultiversX with NFT ships, EGLD wagering, staking rewards, tournaments, secondary marketplace, spectator mode, AI practice bot, and on-chain leaderboard.

[![Build](https://github.com/Gzeu/MetaShipX/actions/workflows/ci.yml/badge.svg)](https://github.com/Gzeu/MetaShipX/actions)
[![E2E Tests](https://github.com/Gzeu/MetaShipX/actions/workflows/e2e-tests.yml/badge.svg)](https://github.com/Gzeu/MetaShipX/actions)
[![Contract Tests](https://github.com/Gzeu/MetaShipX/actions/workflows/contract-tests.yml/badge.svg)](https://github.com/Gzeu/MetaShipX/actions)
[![Security Scan](https://github.com/Gzeu/MetaShipX/actions/workflows/security-scan.yml/badge.svg)](https://github.com/Gzeu/MetaShipX/actions)
[![MultiversX](https://img.shields.io/badge/MultiversX-Devnet-blue)](https://devnet.multiversx.com)
[![Supernova](https://img.shields.io/badge/Supernova-600ms_blocks-brightgreen)](https://docs.multiversx.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![NestJS](https://img.shields.io/badge/NestJS-Backend-E0234E?logo=nestjs)](https://nestjs.com)
[![sdk-dapp](https://img.shields.io/badge/sdk--dapp-v5-blueviolet)](https://github.com/multiversx/mx-sdk-dapp)
[![Rust](https://img.shields.io/badge/Rust-SmartContracts-orange?logo=rust)](https://www.rust-lang.org)
[![multiversx-sc](https://img.shields.io/badge/multiversx--sc-0.65.1-blue)](https://docs.rs/multiversx-sc)
[![PWA](https://img.shields.io/badge/PWA-ready-purple)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 🎮 What is MetaShipX?

Two players battle on a **10×10 grid**, each commanding a fleet of **NFT ships**. Every move is a blockchain transaction. The winner takes the combined EGLD wager. Match fees automatically fund a **staking reward pool**. Players can **list and buy ships on the marketplace**, unlock **cosmetic skins**, let other users **watch live matches** with hit/miss sounds and animations, and compete on the **on-chain leaderboard**. New players can jump in immediately with **AI Practice Mode** — no wallet, no EGLD required.

**Stack:** Rust smart contracts · React 18 + Vite · TypeScript · Chakra UI · `@multiversx/sdk-dapp` v5 · NestJS backend · WebSocket real-time · PostgreSQL · Docker · PWA

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
| **Referral System** | Share link → earn % from referred player's first wager |
| **PWA** | Installable on mobile/desktop, 3 shortcuts, offline shell |
| **Cosmetics** | Ship skins/traits for visual customisation |
| **Immersion** | Sound effects + hit/miss/sunk/game-over animations |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   FRONTEND (React 18 + Vite + PWA)              │
│  Home · Lobby · Game · Spectator · Staking · Marketplace        │
│  Tournaments · Leaderboard · Profile · Practice (AI Bot)        │
│  sdk-dapp (xPortal / Web Wallet / Ledger / WalletConnect)       │
│  Sentry · useReferral · useLeaderboard                          │
└────────────┬───────────────────────────────┬────────────────────┘
             │  REST + WebSocket             │ MultiversX API
             ▼                               ▼
┌────────────────────────────┐    ┌──────────────────────────────────────┐
│  BACKEND (NestJS)          │    │  SMART CONTRACTS (Rust)              │
│  WebhookController         │    │                                      │
│  EventsGateway (WS)        │    │  contracts/battleship/               │
│  BotService (AI)           │    │  contracts/nft/                      │
│  PracticeController        │    │  contracts/staking/                  │
│  LeaderboardController     │    │  contracts/marketplace/              │
│  HealthController /health  │    │  contracts/tournament/               │
│  ThrottlerGuard (3 req/s)  │    │  contracts/leaderboard/              │
│  PostgreSQL (TypeORM)      │    └──────────────────────────────────────┘
│  express-session           │
│  Sentry + @Cron scheduler  │
└────────────────────────────┘
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
| `getGameState(gameId)` | Return the full game state |
| `getPlayerGames(address)` | List all games for a player |

> **Gas optimization:** `attack()` uses `SetMapper` for `O(1)` contains checks and batches all storage writes into a single final write. Leaderboard notify uses `transfer_execute` (fire-and-forget, 12M gas) — failure does **not** revert the game. See [`GAS_OPTIMIZATION.md`](contracts/battleship/GAS_OPTIMIZATION.md).

### NFT Ships (`contracts/nft/`)

| Endpoint | Description |
|---|---|
| `registerShipCollection` | Owner issues the SFT collection (0.05 EGLD, once-guard) |
| `mintShip(shipType, name)` | Mint an SFT ship (paid in EGLD) |
| `upgradeShip(nonce)` | Increase ship level (max 10), cost = `level × mint_price` |
| `recordWin(nonce)` | Record an on-chain win (called by battleship contract) |
| `burnShip(nonce)` | Burn the ship — validates caller == owner |
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
| `setApr(value)` | Owner sets APR in bps (MAX = 10 000 = 100%) |
| `getStakeInfo(address)` | Staking state + pending rewards |
| `getTotalStaked` | Total EGLD locked in the contract |
| `getRewardPool` | Available balance for rewards |

### Marketplace (`contracts/marketplace/`)

| Endpoint | Description |
|---|---|
| `listShip(tokenId, nonce, price)` | List an NFT ship for sale (ESDTNFTTransfer) |
| `buyShip(listingId)` | Buy a listed ship (exact EGLD payment) |
| `cancelListing(listingId)` | Seller cancels and reclaims ship |
| `getActiveListings(offset, limit)` | Paginated active listings (replaces stub) |

### Tournament (`contracts/tournament/`) — v2-supernova

| Endpoint | Description |
|---|---|
| `createTournament(name, entryFee, maxPlayers)` | Create a new tournament (2–64 players) |
| `joinTournament(tournamentId)` | Join with the entry fee |
| `reportMatchResult(tournamentId, matchId, winner)` | Called by the battleship contract only |
| `cancelTournament(id)` | Cancel and refund all players |
| `getTournament(id)` | Full tournament struct (`created_at_ms` in ms) |
| `getCurrentTimestampMs` | Diagnostic: current timestamp in milliseconds |

### Leaderboard (`contracts/leaderboard/`)

| Endpoint | Description |
|---|---|
| `updatePlayer(player, egld_won)` | Record win — restricted to battleship contract |
| `getTopPlayers(limit)` | Returns sorted `LeaderEntry[]` (wins desc, EGLD tiebreaker) |
| `getPlayerRank(address)` | 1-based rank, 0 if not in top-50 |
| `getPlayerStats(address)` | Returns `(wins, egld_won)` tuple |
| `setBattleshipContract(addr)` | Owner: rotate authorized caller |

> Insertion sort O(50) bounded array — gas-safe, predictable cost regardless of total player count.

---

## 🤖 AI Practice Mode

No wallet. No EGLD. No on-chain transactions. Three difficulty levels at `/practice`:

| Difficulty | Algorithm |
|---|---|
| Easy | Random non-repeated shots |
| Medium | Hunt/Target — attacks neighbors after a hit |
| Hard | Probability density map with center weighting + neighbor boost |

Backend: `BotService` + `PracticeController` (REST: `/practice/start`, `/practice/place`, `/practice/attack`). Session-based state, rate-limited 2 attacks/s.

Frontend: `PracticePage` — difficulty selector, 10×10 placement board, 10×10 attack board, win/lose screen with **"vs Real Opponent"** CTA.

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
| `Leaderboard` | `/leaderboard` | On-chain top-50 global rankings |
| `Profile` | `/profile/:address` | Ships, stats, match history, referral link |
| `PracticePage` | `/practice` | AI Bot — no wallet needed |

### Key Hooks

| Hook | Description |
|---|---|
| `useGame` | Full game state + optimistic updates |
| `useGamePolling` | Supernova-tuned: 600ms MY_TURN / 1500ms WAITING |
| `useGameWs` | WebSocket live updates |
| `useLeaderboard` | On-chain top players, client-side cache 1 min |
| `useReferral` | Read `?ref=` URL param, persist 30d localStorage, generate share link |
| `useStaking` | Auto-fetch + refresh after actions |
| `useSound` | Web Audio FX (hit, miss, sunk, victory) |

### Config (`frontend/src/config.ts`)

`requireEnv()` throws at build time if any contract address is missing — no silent wrong-address deploys.

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
│   ├── battleship/             # PvP game (SetMapper, leaderboard wiring, audit tests)
│   │   └── GAS_OPTIMIZATION.md
│   ├── nft/                    # SFT ships (mint, upgrade, once-guards, overflow-safe)
│   ├── staking/                # EGLD reward pool (MAX_APR cap, state-before-send)
│   ├── marketplace/            # P2P market (re-entrancy safe, paginated view)
│   ├── tournament/             # Elimination brackets (v2-supernova)
│   │   └── src/deploy.md
│   └── leaderboard/            # On-chain top-50 (insertion sort O(50))
│       └── src/deploy.md
├── frontend/
│   ├── src/
│   │   ├── components/         # GameBoard, Navbar, ReferralBanner, TxButton
│   │   ├── pages/              # All pages incl. PracticePage
│   │   ├── hooks/              # useGame, useLeaderboard, useReferral, useSound…
│   │   ├── services/           # battleship, nft, staking, marketplace services
│   │   ├── config.ts           # requireEnv() fail-fast
│   │   └── main.tsx            # Sentry init + sdk-dapp + React root
│   └── public/
│       ├── manifest.json       # PWA: standalone, shortcuts, maskable icons
│       └── icons/              # PWA icons (see icons/README.md for generation)
├── backend/
│   ├── src/
│   │   ├── game/               # BotService, PracticeController, GameModule
│   │   ├── leaderboard/        # LeaderboardService (@Cron), Controller, Module
│   │   ├── health/             # HealthController (/health), HealthModule
│   │   ├── webhook/            # WebhookController + SignatureGuard
│   │   ├── events/             # EventsGateway WebSocket
│   │   ├── app.module.ts       # All modules wired incl. ScheduleModule
│   │   └── main.ts             # Sentry init + fail-fast secrets + session
│   └── Dockerfile
├── tests/
│   └── e2e/                    # Playwright: game, marketplace, staking, practice, leaderboard
├── scripts/
│   ├── mainnet-deploy.sh       # Ordered 6-contract deploy + smoke test
│   ├── devnet-smoke-test.sh    # 7 contract checks, exit 1 on failure
│   ├── check-reward-pool.sh    # Cron-ready reward pool health check
│   ├── leaderboard-cron.sh     # Weekly snapshot + reward pool alert
│   ├── seed-tournament.sh      # Create launch tournament on devnet/mainnet
│   ├── setup-monitoring.sh     # Uptime Kuma Docker + auto-monitors
│   └── check-git-secrets.sh    # Git history secret scanner (audit #32)
├── .github/
│   └── workflows/
│       ├── ci.yml              # General CI
│       ├── contract-tests.yml  # Rust build + unit tests
│       ├── e2e-tests.yml       # Playwright E2E
│       ├── auto-label.yml      # PR auto-labeling
│       ├── release.yml         # Auto GitHub Release on v*.*.* tag
│       └── security-scan.yml   # Gitleaks + npm audit + cargo audit (weekly)
├── docs/
│   ├── MAINNET_AUDIT_CHECKLIST.md  # 48-point pre-mainnet checklist
│   ├── TOKENOMICS.md               # EGLD flow, fee structure, APR sustainability
│   ├── LAUNCH_ANNOUNCEMENT.md      # Twitter/Discord/Forum templates ready to post
│   └── DISCORD_BOT.md              # Discord bot setup + NestJS DiscordService
├── docker-compose.yml          # Non-root, cap_drop ALL, healthchecks
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

### Start with Docker

```bash
git clone https://github.com/Gzeu/MetaShipX.git
cd MetaShipX
cp backend/.env.example backend/.env.local
# Set: SESSION_SECRET (32+ chars), ADMIN_SECRET, DATABASE_URL
docker-compose up -d
# Frontend: http://localhost:5173  Backend: http://localhost:4000
```

### Start manually

```bash
# Backend
cd backend && npm install && npm run start:dev

# Frontend
cd frontend && npm install && npm run dev
```

---

## 📦 Deploy

```bash
# Devnet
WALLET_PEM=~/devnet-wallet.pem CHAIN=devnet ./scripts/mainnet-deploy.sh

# Smoke test (all 7 must PASS before mainnet)
./scripts/devnet-smoke-test.sh

# Mainnet (requires typing 'deploy mainnet' to confirm)
WALLET_PEM=~/mainnet-wallet.pem CHAIN=mainnet ./scripts/mainnet-deploy.sh

# Post-deploy: wire battleship → leaderboard
mxpy contract call $BATTLESHIP_ADDR \
  --function=setLeaderboardContract \
  --arguments $LEADERBOARD_ADDR \
  --pem=wallet.pem --chain=D

# Fund reward pool
mxpy contract call $STAKING_ADDR \
  --function=fundRewardPool --value=50000000000000000000 \
  --pem=wallet.pem --chain=D
```

---

## ⛽ Gas Optimization

`attack()` is the most-called endpoint:

| Technique | Impact |
|---|---|
| `SetMapper` for `attacked_positions` | `contains()` O(1) vs O(n) on `VecMapper` |
| Batch storage writes | Single final write instead of multiple updates |
| Leaderboard: `transfer_execute` fire-and-forget | 12M gas cap, never reverts game |

See [`contracts/battleship/GAS_OPTIMIZATION.md`](contracts/battleship/GAS_OPTIMIZATION.md)

---

## 🗺 Roadmap

### ✅ Completed (v0.1.0 → v0.9.0)
- [x] 6 Rust smart contracts — Battleship, NFT, Staking, Marketplace, Tournament v2, Leaderboard
- [x] Full security audit hardening — re-entrancy, overflow guards, once-guards, MAX_APR cap
- [x] React 18 frontend — all pages, sticky Navbar, PWA manifest, Sentry, Referral system
- [x] AI Bot Practice Mode — Easy/Medium/Hard, no wallet needed
- [x] P2P Marketplace — 3-tab flow, TX banner, filter+sort, TopDecode
- [x] NestJS backend — ThrottlerModule, GameModule, LeaderboardModule, HealthModule, Sentry
- [x] E2E test suite — Playwright, Chromium + Pixel5 mobile
- [x] CI/CD — 5 workflows incl. Release auto-notes + Security scan (Gitleaks + audits)
- [x] Scripts — deploy, smoke-test, seed-tournament, monitoring, cron, secret-scan
- [x] Docs — Tokenomics, Launch Announcement, Audit Checklist, Discord Bot

### 🔜 v1.0.0 — Mainnet Launch
- [ ] PWA icons generated (see `frontend/public/icons/README.md`)
- [ ] Devnet full smoke test — all 7 checks PASS
- [ ] External security audit (Arda Security or equivalent)
- [ ] Video demo 60–90s + GIF
- [ ] Mainnet deploy + contract verification
- [ ] Launch Tournament — first official with sponsored prize pool
- [ ] xPortal featured section submission

### 🔜 Post-Launch (v1.1+)
- [ ] Referral reward on-chain (5% from first wager)
- [ ] Spectator betting (EGLD on match winner)
- [ ] Discord bot live (game alerts, leaderboard weekly, reward pool alerts)
- [ ] Guild system + Guild vs Guild tournaments
- [ ] Mobile PWA optimization + push notifications
- [ ] Multi-chain bridge (Solana ↔ MultiversX NFT ships)

---

## 📚 Documentation

| Doc | Description |
|---|---|
| [TOKENOMICS.md](docs/TOKENOMICS.md) | EGLD flow, fee structure, APR sustainability model |
| [LAUNCH_ANNOUNCEMENT.md](docs/LAUNCH_ANNOUNCEMENT.md) | Twitter/Discord/Forum templates for mainnet launch |
| [MAINNET_AUDIT_CHECKLIST.md](docs/MAINNET_AUDIT_CHECKLIST.md) | 48-point pre-mainnet security checklist |
| [DISCORD_BOT.md](docs/DISCORD_BOT.md) | Discord bot setup + NestJS DiscordService |
| [CHANGELOG.md](CHANGELOG.md) | Full version history |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |
| [SECURITY.md](SECURITY.md) | Security policy + responsible disclosure |

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## 🔒 Security

See [SECURITY.md](SECURITY.md) and [`docs/MAINNET_AUDIT_CHECKLIST.md`](docs/MAINNET_AUDIT_CHECKLIST.md).

To scan for accidentally committed secrets:
```bash
./scripts/check-git-secrets.sh
```

## 📄 License

[MIT](LICENSE) © 2026 MetaShipX
