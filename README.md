# ⚓ MetaShipX

> **Battleship. On-Chain.** — Multiplayer naval strategy game on MultiversX with NFT ships, EGLD wagering, staking rewards, tournaments, secondary marketplace, spectator mode, cosmetic skins, and immersive combat FX.

[![Build](https://github.com/Gzeu/MetaShipX/actions/workflows/ci.yml/badge.svg)](https://github.com/Gzeu/MetaShipX/actions)
[![MultiversX](https://img.shields.io/badge/MultiversX-Devnet-blue)](https://devnet.multiversx.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![sdk-dapp](https://img.shields.io/badge/sdk--dapp-v5-blueviolet)](https://github.com/multiversx/mx-sdk-dapp)
[![Rust](https://img.shields.io/badge/Rust-SmartContracts-orange?logo=rust)](https://www.rust-lang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 🎮 Ce este MetaShipX?

Doi jucători se bat pe o grilă **10×10**, fiecare comandând o flotă de **NFT ships**. Fiecare mutare este o tranzacție blockchain. Câștigătorul ia mizele combinate EGLD. Taxele din meciuri alimentează automat un **reward pool de staking**. Jucătorii pot **lista și cumpăra nave pe marketplace**, debloca **skin-uri cosmetice**, și lăsa alți utilizatori să **urmărească live meciurile** cu sunete + animații hit/miss.

**Stack:** Rust smart contracts · React 18 + Vite · Chakra UI · `@multiversx/sdk-dapp` v5 · NestJS backend · WebSocket real-time · PostgreSQL · Docker

---

## ✨ Features

| Zonă | Descriere |
|---|---|
| **Battleship PvP** | Grilă 10×10, wager on-chain EGLD, atacuri turn-based |
| **NFT Fleet** | Mint nave SFT, upgrade level 1-10, tracking victorii |
| **Staking** | 20% APR, reward pool alimentat din taxe meci |
| **Tournaments** | Bracket eliminatoriu cu premii EGLD |
| **Marketplace** | Listează/cumpără nave NFT între jucători |
| **Spectator Mode** | Watch live read-only cu WebSocket real-time |
| **Cosmetics** | Ship skins/traits pentru customizare vizuală |
| **Imersiune** | Sound effects + animații hit/miss/sunk/game-over |

---

## 🏗 Arhitectură

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
└────────────────────────┘    └─────────────────────────────────┘
```

---

## 📝 Smart Contracts

### Battleship (`contracts/battleship/`)

| Endpoint | Descriere |
|---|---|
| `createGame(bet)` | Creează joc nou cu miză EGLD |
| `joinGame(gameId)` | Alătură-te cu aceeași miză |
| `placeShips(gameId, positions)` | Depune hash-ul poziționării navelor |
| `attack(gameId, row, col)` | Execută atac (turn-based) |
| `withdraw(gameId)` | Retrage miza dacă adversarul n-a mai jucat (timeout 24h) |
| `getGameState(gameId)` | Returnează starea completă a jocului |
| `getPlayerGames(address)` | Lista jocurilor unui jucător |

### NFT Ships (`contracts/nft/`)

| Endpoint | Descriere |
|---|---|
| `registerShipCollection` | Owner issuează colecția SFT (0.05 EGLD, o singură dată) |
| `mintShip(shipType, name)` | Mintează navă SFT (plătit în EGLD) |
| `upgradeShip(nonce)` | Crește level navă (max 10), cost = `level × mint_price` |
| `recordWin(nonce)` | Înregistrează victorie on-chain (apelat de battleship) |
| `burnShip(nonce)` | Arde nava și returnează tokenul |
| `getShipMetadata(nonce)` | Metadata navă: tip, level, victorii |
| `getOwnerShips(address)` | Toate navele unui owner |

**Tipuri nave și prețuri:**

| Navă | Mărime | Preț mint | Raritate |
|---|---|---|---|
| Destroyer | 2 | 0.05 EGLD | Common |
| Submarine | 3 | 0.08 EGLD | Uncommon |
| Cruiser | 3 | 0.1 EGLD | Rare |
| Battleship | 4 | 0.15 EGLD | Epic |
| Carrier | 5 | 0.25 EGLD | Legendary |

### Staking (`contracts/staking/`)

| Endpoint | Descriere |
|---|---|
| `fundRewardPool` | Alimentează pool-ul cu EGLD (oricine, inclusiv battleship) |
| `stake` | Depune EGLD în staking |
| `unstake(amount)` | Retrage parțial sau total |
| `claimRewards` | Revendică rewards acumulate (APR 20%/an) |
| `setApr(value)` | Owner setează APR (bps, default 2000 = 20%) |
| `getStakeInfo(address)` | Stare staking + rewards pending |
| `getTotalStaked` | Total EGLD blocat în contract |
| `getRewardPool` | Sold disponibil pentru rewards |

---

## 🖥 Frontend

### Pagini

| Pagină | Rută | Descriere |
|---|---|---|
| `Home` | `/` | Landing, statistici, CTA |
| `LobbyPage` | `/lobby` | Lista jocuri active, creare joc nou |
| `GamePage` | `/game/:id` | Tabla 10×10, atacuri, timer turn |
| `SpectatorPage` | `/spectate/:id` | Watch live read-only |
| `StakingPage` | `/staking` | Stake / Unstake / Claim rewards |
| `MarketplacePage` | `/marketplace` | Cumpără/listează nave NFT |
| `Tournaments` | `/tournaments` | Bracket-uri, join, rezultate |
| `Leaderboard` | `/leaderboard` | Top jucători global |
| `Profile` | `/profile/:address` | Nave, statistici, istoricul jocurilor |

### Services & Hooks

```
frontend/src/
├── services/
│   ├── battleship.service.ts   # createGame, joinGame, attack, getGameState
│   ├── nft.service.ts          # mintShip, upgradeShip, getUserShips
│   └── staking.service.ts      # stake, unstake, claimRewards, getStakingInfo
├── hooks/
│   ├── useGame.ts              # State complet joc + optimistic updates
│   ├── useStaking.ts           # Auto-fetch + refresh după acțiuni
│   ├── useGamePolling.ts       # Polling interval pentru stare joc
│   ├── useGameWs.ts            # WebSocket live updates
│   └── useSound.ts             # Web Audio FX (hit, miss, sunk, victory)
└── utils/
    └── board.ts                # EMPTY_BOARD, canPlace, applyAttack, serializePositions
```

### Autentificare (sdk-dapp v5)

- xPortal Mobile (QR / deeplink)
- Web Wallet (devnet.multiversx.com)
- Ledger Hardware
- WalletConnect v2

---

## 📁 Structura Proiect

```
MetaShipX/
├── contracts/
│   ├── battleship/             # Joc PvP on-chain
│   ├── nft/                    # SFT ships mint + upgrade
│   └── staking/                # Reward pool EGLD
├── frontend/
│   ├── src/
│   │   ├── components/         # GameBoard, Navbar, etc.
│   │   ├── pages/              # Toate paginile aplicației
│   │   ├── hooks/              # React hooks custom
│   │   ├── services/           # Interacțiune contracte
│   │   ├── utils/              # board.ts, formatters
│   │   └── config.ts           # Adrese contracte per env
│   └── Dockerfile.dev
├── backend/
│   ├── src/
│   │   ├── webhook/            # Controller + Service + Entity
│   │   └── events/             # EventsGateway WebSocket
│   ├── .env.example
│   └── Dockerfile
├── docker-compose.yml          # Postgres + Backend + Frontend
├── deploy-devnet.sh            # Script deploy automat devnet
└── README.md
```

---

## 🚀 Instalare & Rulare Locală

### Prerequisite

```bash
# Rust + MultiversX framework
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install multiversx-sc-meta

# mxpy CLI
pip install multiversx-sdk-cli

# Node.js 20+
node --version  # v20+
```

### Start local cu Docker

```bash
# 1. Clonează
git clone https://github.com/Gzeu/MetaShipX.git
cd MetaShipX

# 2. Configurează backend
cp backend/.env.example backend/.env.local
# editează: WEBHOOK_SECRET=<openssl rand -hex 32>

# 3. Pornește tot
docker-compose up -d

# Frontend: http://localhost:5173
# Backend:  http://localhost:4000
# Postgres: localhost:5432
```

### Start manual (fără Docker)

```bash
# Backend
cd backend && npm install && npm run start:dev

# Frontend
cd frontend && npm install && npm run dev
```

---

## 📦 Deploy pe Devnet

```bash
# Compilează și deployează toate contractele
chmod +x deploy-devnet.sh
./deploy-devnet.sh

# SAU manual:
cd contracts/battleship
mxpy contract build
mxpy contract deploy \
  --bytecode=output/battleship.wasm \
  --pem=wallet/devnet.pem \
  --chain=D \
  --gas-limit=60000000 \
  --proxy=https://devnet-gateway.multiversx.com

# Repetă pentru nft/ și staking/
# Apoi actualizează frontend/src/config.ts cu adresele primite
```

### Post-deploy (o singură dată)

```bash
# Înregistrează colecția NFT (0.05 EGLD devnet)
mxpy contract call <NFT_CONTRACT_ADDRESS> \
  --function=registerShipCollection \
  --value=50000000000000000 \
  --pem=wallet/devnet.pem \
  --chain=D \
  --gas-limit=10000000 \
  --proxy=https://devnet-gateway.multiversx.com \
  --send
```

---

## 🗺 Roadmap

### ✅ Sprint 1-3 (Completat)
- [x] Smart contract Battleship (PvP complet)
- [x] Smart contract NFT (SFT mint, upgrade, burn)
- [x] Smart contract Staking (reward pool, APR configurabil)
- [x] Frontend — toate paginile și hooks
- [x] Backend NestJS — webhook + WebSocket gateway
- [x] Docker Compose complet
- [x] CI/CD GitHub Actions
- [x] Board utilities (`board.ts`, `EMPTY_BOARD`)
- [x] README + CONTRIBUTING + SECURITY

### 🚧 Sprint 4 (În progres)
- [ ] Deploy devnet + test end-to-end
- [ ] Actualizare adrese contracte în `config.ts`
- [ ] Teste Rust pentru contracte

### 🔜 Sprint 5+
- [ ] Tournament contract complet
- [ ] Marketplace secondary (list/buy)
- [ ] Skin system (cosmetic traits)
- [ ] Global leaderboard on-chain
- [ ] Mainnet launch

---

## 🤝 Contribuții

Vezi [CONTRIBUTING.md](CONTRIBUTING.md) pentru ghidul de contribuții.

## 🔒 Securitate

Vezi [SECURITY.md](SECURITY.md) pentru raportarea vulnerabilităților.

## 📄 Licență

[MIT](LICENSE) © 2026 MetaShipX
