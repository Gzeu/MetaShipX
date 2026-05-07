# ⚓ MetaShipX

> **Battleship. On-Chain.** — Joc multiplayer de strategie navală pe blockchain-ul MultiversX cu nave NFT, staking pool și mize EGLD reale.

[![MultiversX](https://img.shields.io/badge/MultiversX-Devnet-blue)](https://devnet.multiversx.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![Rust](https://img.shields.io/badge/Rust-SmartContracts-orange?logo=rust)](https://www.rust-lang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 📋 Cuprins

- [Prezentare generală](#-prezentare-generală)
- [Arhitectură](#-arhitectură)
- [Smart Contracts](#-smart-contracts)
- [Frontend](#-frontend)
- [Structura proiectului](#-structura-proiectului)
- [Instalare & Setup](#-instalare--setup)
- [Deploy contracte](#-deploy-contracte)
- [Configurare frontend](#-configurare-frontend)
- [Flux de joc](#-flux-de-joc)
- [Roadmap](#-roadmap)

---

## 🎮 Prezentare generală

MetaShipX este un joc **Battleship** complet on-chain pe **MultiversX**. Doi jucători se înfruntă cu nave NFT unice, plasate secret pe o tablă 10×10. Câștigătorul ia miza combinată în EGLD.

### Features principale

| Feature | Descriere |
|---|---|
| ⚔️ **Battleship On-Chain** | Logica de joc verificată de smart contract; fiecare atac = tranzacție |
| ⚓ **NFT Ships (SFT)** | 5 tipuri de nave mintabile (Destroyer → Carrier), upgradabile până la Level 10 |
| 💎 **Staking Pool** | 20% APR din taxele meciurilor, fără lock-up, claim oricând |
| 🔗 **MultiversX Auth** | xPortal App, Browser Extension, Web Wallet, Ledger |
| 📊 **Profil & Statistici** | Win rate, acuratețe, istoric meciuri, achievements |

---

## 🏗 Arhitectură

```
MetaShipX
├── contracts/
│   ├── battleship/       # Logica principală de joc (Rust / MultiversX SC)
│   ├── nft/              # Mint & upgrade nave SFT
│   └── staking/          # Reward pool cu APR configurabil
└── frontend/             # React + Vite + Chakra UI + MultiversX SDK
```

Cele trei contracte interacționează astfel:

```
[Jucător A]         [Jucător B]
     │                    │
     └────── createGame ──┘
              │
     [Battleship Contract]
        ├── validează plasarea navelor
        ├── procesează atacuri
        ├── trimite EGLD câștigătorului
        └── apelează NFT Contract (recordWin)
                │
     [NFT Contract]           [Staking Contract]
     mint/upgrade nave        stake/unstake/claim EGLD
```

---

## 📝 Smart Contracts

### 1. Battleship — `contracts/battleship/`

Contractul principal. Gestionează ciclul complet al unui meci.

| Endpoint | Descriere |
|---|---|
| `createGame(bet)` | Creează joc, plătește EGLD miza |
| `joinGame(gameId)` | Adversarul intră în joc cu aceeași miză |
| `placeShips(positions[])` | Fiecare jucător plasează cele 5 nave secret |
| `attack(row, col)` | Trimite un atac; contractul verifică hit/miss |
| `withdraw()` | Câștigătorul retrage EGLD-ul combinat |
| `getGameState(gameId)` | View: starea completă a meciului |
| `getPlayerGames(address)` | View: istoricul meciurilor unui jucător |

### 2. NFT Ships — `contracts/nft/`

Contract SFT (Semi-Fungible Token) pentru nave.

| Endpoint | Descriere |
|---|---|
| `registerShipCollection()` | Owner: emite colecția SFT (cost 0.05 EGLD sistem) |
| `mintShip(shipType, name)` | Mintează o navă SFT; plătit în EGLD |
| `upgradeShip(nonce)` | Crește level-ul navei (max 10); cost = `level × mintPrice` |
| `recordWin(nonce)` | Apelat de Battleship Contract la victorie |
| `burnShip(nonce)` | Returnează tokenul și îl distruge |

**Tipuri de nave și prețuri:**

| # | Tip | Dimensiune | Preț Mint | Raritate |
|---|---|---|---|---|
| 0 | Destroyer | 2 celule | 0.05 EGLD | Common |
| 1 | Submarine | 3 celule | 0.08 EGLD | Uncommon |
| 2 | Cruiser | 3 celule | 0.08 EGLD | Uncommon |
| 3 | Battleship | 4 celule | 0.15 EGLD | Rare |
| 4 | Carrier | 5 celule | 0.30 EGLD | Legendary |

### 3. Staking — `contracts/staking/`

Pool de recompense alimentat din taxele meciurilor.

| Endpoint | Descriere |
|---|---|
| `fundRewardPool()` | Oricine poate alimenta pool-ul cu EGLD |
| `stake()` | Depune EGLD în pool (auto-claim dacă există stake activ) |
| `unstake(amount)` | Retrage EGLD (auto-claim înainte) |
| `claimRewards()` | Calculează și trimite rewards acumulate |
| `setApr(value)` | Owner: modifică APR (default 20% = `2000/10000`) |

**Formula rewards:**
```
reward = stakedAmount × APR × elapsedSeconds / SECONDS_PER_YEAR
```

---

## 🖥 Frontend

Stack: **React 18 + Vite + TypeScript + Chakra UI + MultiversX SDK Dapp**

### Pagini

| Rută | Componentă | Descriere |
|---|---|---|
| `/` | `Home.tsx` | Landing page cu stats, features, CTA |
| `/game` | `Game.tsx` | Joc complet: Lobby → Placement → Battle → Result |
| `/marketplace` | `Marketplace.tsx` | NFT Shipyard: catalog, mint, upgrade, colecție |
| `/staking` | `Staking.tsx` | Stake/Unstake/Claim cu stats pool |
| `/profile` | `Profile.tsx` | Profil, istoric meciuri, fleet, achievements |

### Services (API Layer)

```typescript
services/
├── battleship.service.ts  // createGame, joinGame, attack, getGameState
├── nft.service.ts         // mintShip, upgradeShip, getUserShips
└── staking.service.ts     // stake, unstake, claimRewards, getStakingInfo
```

### Hooks

```typescript
hooks/
├── useGame.ts     // State complet meci + board 10×10
├── useStaking.ts  // Auto-fetch staking data + refresh după tranzacții
├── useNft.ts      // Colecție nave + mint/upgrade
└── useProfile.ts  // Stats jucător + istoric meciuri + achievements
```

### Autentificare MultiversX

Navbar-ul integrează **4 metode de login** prin `@multiversx/sdk-dapp`:
- 📱 **xPortal App** — WalletConnect v2, QR scan (recomandat)
- 🧩 **Browser Extension** — MultiversX DeFi Wallet
- 🌐 **Web Wallet** — wallet.multiversx.com
- 🔐 **Ledger Hardware** — hardware wallet USB

---

## 📁 Structura proiectului

```
MetaShipX/
├── contracts/
│   ├── battleship/
│   │   ├── src/lib.rs           # Smart contract principal
│   │   └── Cargo.toml
│   ├── nft/
│   │   ├── src/lib.rs           # Contract SFT nave
│   │   └── Cargo.toml
│   └── staking/
│       ├── src/lib.rs           # Reward pool
│       └── Cargo.toml
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Home.tsx
    │   │   ├── Game.tsx
    │   │   ├── Marketplace.tsx
    │   │   ├── Staking.tsx
    │   │   └── Profile.tsx
    │   ├── components/
    │   │   ├── Layout/
    │   │   │   ├── Navbar.tsx   # Sticky nav + wallet auth drawer
    │   │   │   └── Footer.tsx
    │   │   └── GameBoard/
    │   │       ├── GameBoard.tsx
    │   │       └── GameBoard.css
    │   ├── hooks/
    │   │   ├── useGame.ts
    │   │   ├── useStaking.ts
    │   │   ├── useNft.ts
    │   │   └── useProfile.ts
    │   ├── services/
    │   │   ├── battleship.service.ts
    │   │   ├── nft.service.ts
    │   │   └── staking.service.ts
    │   ├── contexts/
    │   │   └── DappProvider.tsx
    │   ├── styles/
    │   │   └── theme.ts
    │   ├── utils/
    │   │   └── address.ts
    │   └── config.ts            # Adrese contracte + rețea
    ├── package.json
    └── vite.config.ts
```

---

## 🚀 Instalare & Setup

### Prerequisite

- **Node.js** ≥ 18
- **Rust** + `wasm32-unknown-unknown` target
- **mxpy** (MultiversX CLI) ≥ 9.0

```bash
# Instalare Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown

# Instalare mxpy
pip3 install multiversx-sdk-cli
```

### Frontend

```bash
cd frontend
npm install
npm run dev        # Dev server: http://localhost:5173
npm run build      # Build producție în dist/
npm run preview    # Previzualizare build
```

### Smart Contracts (build)

```bash
# Battleship
cd contracts/battleship
mxpy contract build

# NFT
cd contracts/nft
mxpy contract build

# Staking
cd contracts/staking
mxpy contract build
```

---

## 📦 Deploy Contracte

### 1. Configurare wallet devnet

```bash
# Generează sau importă wallet
mxpy wallet new --format=pem --outfile=wallet.pem

# Obține EGLD devnet (faucet)
# https://devnet-wallet.multiversx.com/faucet
```

### 2. Deploy Battleship Contract

```bash
cd contracts/battleship
mxpy contract deploy \
  --bytecode=output/battleship.wasm \
  --pem=../../wallet.pem \
  --gas-limit=60000000 \
  --chain=D \
  --proxy=https://devnet-gateway.multiversx.com \
  --recall-nonce \
  --send
```

### 3. Deploy NFT Contract

```bash
cd contracts/nft
mxpy contract deploy \
  --bytecode=output/nft.wasm \
  --pem=../../wallet.pem \
  --gas-limit=60000000 \
  --chain=D \
  --proxy=https://devnet-gateway.multiversx.com \
  --recall-nonce \
  --send

# Înregistrează colecția SFT (o singură dată, necesită 0.05 EGLD)
mxpy contract call <NFT_CONTRACT_ADDRESS> \
  --function=registerShipCollection \
  --value=50000000000000000 \
  --gas-limit=10000000 \
  --pem=../../wallet.pem \
  --chain=D \
  --proxy=https://devnet-gateway.multiversx.com \
  --recall-nonce \
  --send
```

### 4. Deploy Staking Contract

```bash
cd contracts/staking
mxpy contract deploy \
  --bytecode=output/staking.wasm \
  --pem=../../wallet.pem \
  --gas-limit=60000000 \
  --chain=D \
  --proxy=https://devnet-gateway.multiversx.com \
  --recall-nonce \
  --send
```

---

## ⚙️ Configurare Frontend

Actualizează `frontend/src/config.ts` cu adresele obținute după deploy:

```typescript
// frontend/src/config.ts
export const NETWORK_CONFIG = {
  chainId: 'D',   // 'D' devnet | 'T' testnet | '1' mainnet
  apiUrl: 'https://devnet-api.multiversx.com',
  explorerUrl: 'https://devnet-explorer.multiversx.com',
};

export const BATTLESHIP_CONTRACT_ADDRESS = 'erd1...'; // adresa ta
export const NFT_CONTRACT_ADDRESS        = 'erd1...'; // adresa ta
export const STAKING_CONTRACT_ADDRESS    = 'erd1...'; // adresa ta
```

---

## 🎯 Flux de joc

```
1. Conectează wallet (xPortal / Extension / Web / Ledger)
        │
2. [Opțional] Mintează o navă NFT în Marketplace
        │
3. Creează meci (setezi miza în EGLD) → primești Game ID
   SAU
   Intră în meci (introduci Game ID de la adversar)
        │
4. Plasare nave — alegi orientarea (H/V) și plasezi
   cele 5 nave pe tabla 10×10
        │
5. Bătălie — click pe tabla adversarului pentru a ataca.
   Contractul verifică hit/miss. Alternați rândurile.
        │
6. Câștigătorul distruge toate navele inamice.
   Contractul trimite automat EGLD-ul combinat.
        │
7. [Opțional] Stakeeaza câștigul pentru 20% APR
```

---

## 🗺 Roadmap

### ✅ Completat (Sprint 1-3)

- [x] Smart contract Battleship cu logică completă de joc
- [x] Smart contract NFT pentru nave SFT (5 tipuri, Level 1-10)
- [x] Smart contract Staking cu APR configurabil
- [x] Frontend complet: Home, Game, Marketplace, Staking, Profile
- [x] Autentificare MultiversX (4 metode)
- [x] GameBoard 10×10 interactiv
- [x] Sistem de achievements (8 badges)
- [x] Profil cu statistici și istoric meciuri

### 🔜 Planificat (Sprint 4+)

- [ ] Deploy pe devnet + teste end-to-end
- [ ] Leaderboard global (top win rate / EGLD câștigat)
- [ ] Turnee cu bracket elimination
- [ ] Trade nave NFT pe piața secundară
- [ ] Meciuri spectator (watch live)
- [ ] Sunet și animații de impact (hit/miss)
- [ ] Deploy mainnet

---

## 🛡 Securitate

- Contractele folosesc `#[only_owner]` pentru funcțiile administrative
- Plasarea navelor este hash-uită on-chain (nu e vizibilă adversarului)
- Suma mizată este blocată în contract până la finalizarea meciului
- Funcția `withdraw()` validează câștigătorul înainte de transfer

---

## 📄 Licență

MIT © 2026 MetaShipX — Construit pe [MultiversX](https://multiversx.com)
