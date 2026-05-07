# ⚓ MetaShipX

> **Battleship. On-Chain.** — Joc multiplayer de strategie navală pe blockchain-ul MultiversX cu nave NFT, staking pool și mize EGLD reale.

[![MultiversX](https://img.shields.io/badge/MultiversX-Devnet-blue)](https://devnet.multiversx.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![sdk-dapp](https://img.shields.io/badge/sdk--dapp-v5-blueviolet)](https://github.com/multiversx/mx-sdk-dapp)
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
| 🔗 **MultiversX Auth v5** | xPortal App, Browser Extension, Web Wallet, Ledger via `ProviderFactory` |
| 🏆 **Turnee** | Bracket elimination cu prize pool EGLD |
| 📊 **Profil & Statistici** | Win rate, acuratețe, istoric meciuri, achievements |

---

## 🏗 Arhitectură

```
MetaShipX
├── contracts/
│   ├── battleship/       # Logica principală de joc (Rust / MultiversX SC)
│   ├── nft/              # Mint & upgrade nave SFT
│   └── staking/          # Reward pool cu APR configurabil
└── frontend/             # React + Vite + Chakra UI + MultiversX SDK Dapp v5
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
| `createGame(bet)` | Creează joc, plătești EGLD miza |
| `joinGame(gameId)` | Adversarul intră în joc cu aceeași miză |
| `placeShips(positions[])` | Fiecare jucător plasează cele 5 nave secret |
| `attack(row, col)` | Trimite un atac; contractul verifică hit/miss |
| `withdraw()` | Câștigătorul retrage EGLD-ul combinat |
| `getGameState(gameId)` | View: starea completă a meciului |
| `getPlayerGames(address)` | View: istoricul meciurilor unui jucător |
| `joinTournament(id)` | Intră în turneu cu entry fee |
| `getTournament(id)` | View: starea turneului |
| `getActiveTournaments()` | View: lista turneelor active |

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

Stack: **React 18 + Vite + TypeScript + Chakra UI + `@multiversx/sdk-dapp` v5**

> **⚠️ Migrare sdk-dapp v5** — Aplicația folosește noul API `initApp()` + `ProviderFactory` în loc de `<DappProvider>` moștenire.

### Bootstrap v5 (`main.tsx`)

```typescript
import { initApp } from '@multiversx/sdk-dapp/out/methods/initApp/initApp';
import { EnvironmentsEnum } from '@multiversx/sdk-dapp/out/types/enums.types';

await initApp({
  dAppConfig: {
    environment: EnvironmentsEnum.devnet,
    nativeAuth: true,
    providers: { walletConnect: { walletConnectV2ProjectId: '...' } },
  },
});
// createRoot(...).render(<App />)
```

### Login (`ProviderFactory`)

```typescript
import { ProviderFactory } from '@multiversx/sdk-dapp/out/providers/ProviderFactory';
import { ProviderTypeEnum } from '@multiversx/sdk-dapp/out/providers/types/providerFactory.types';

// Login xPortal / Extension / CrossWindow / Ledger
const p = await ProviderFactory.create({ type: ProviderTypeEnum.walletConnect });
await p.login({ callbackUrl: window.location.origin + '/lobby' });

// Logout
await p.logout();
await ProviderFactory.destroy();
```

### Tranzacții (`TransactionManager`)

```typescript
import { TransactionManager } from '@multiversx/sdk-dapp/out/managers/TransactionManager';
import { refreshAccount } from '@multiversx/sdk-dapp/out/utils/account/refreshAccount';

await refreshAccount();
const dappProvider = await ProviderFactory.create({ type: ProviderTypeEnum.extension });
const signed = await dappProvider.signTransactions([tx]);
const txManager = TransactionManager.getInstance();
const sent = await txManager.send(signed);
await txManager.track(sent, { transactionsDisplayInfo: { ... } });
```

### Pagini

| Rută | Componentă | Descriere |
|---|---|---|
| `/` | `Home.tsx` | Landing page cu stats, features, CTA |
| `/lobby` | `LobbyPage.tsx` | Creează / intră în meci, lista meciuri active |
| `/game/:id` | `GamePage.tsx` | Joc complet: Placement → Battle → Result |
| `/tournaments` | `Tournaments.tsx` | Lista turneelor active |
| `/tournaments/:id` | `TournamentPage.tsx` | Detaliu turneu + join |
| `/marketplace` | `Marketplace.tsx` | NFT Shipyard: catalog, mint, upgrade |
| `/staking` | `StakingPage.tsx` | Stake/Unstake/Claim cu stats pool |
| `/leaderboard` | `Leaderboard.tsx` | Top jucători global |
| `/profile` | `Profile.tsx` | Profil, istoric meciuri, fleet, achievements |

### Services (API Layer)

```typescript
services/
├── battleship.service.ts  // createGame, joinGame, placeShips, attack, withdraw, getGameState, getPlayerGames
├── nft.service.ts         // mintShip, upgradeShip, getUserShips, getShipMetadata, getMintPrice
├── staking.service.ts     // stake, unstake, claimRewards, getStakingInfo
└── tournament.service.ts  // joinTournament, getTournament, getActiveTournaments
```

### Hooks

```typescript
hooks/
├── useGame.ts     // State complet meci + board 10×10 + optimistic updates
├── useStaking.ts  // Auto-fetch staking data + refresh după tranzacții
├── useNft.ts      // Colecție nave + mint/upgrade
└── useProfile.ts  // Stats jucător + istoric meciuri + achievements
```

### Autentificare MultiversX (v5)

Navbar-ul deschide un **Wallet Selection Drawer** cu 4 metode:

| Metodă | Provider Type | Recomandat |
|---|---|---|
| 📱 xPortal App | `ProviderTypeEnum.walletConnect` | ✅ Da |
| 🧩 Browser Extension | `ProviderTypeEnum.extension` | |
| 🌐 Web Wallet | `ProviderTypeEnum.crossWindow` | |
| 🔐 Ledger Hardware | `ProviderTypeEnum.ledger` | |

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
    ├── .env.local               # ⚠️ Creat local, nu se commitează
    ├── src/
    │   ├── main.tsx             # Bootstrap initApp() v5
    │   ├── App.tsx              # Routes + providers
    │   ├── config.ts            # VITE_ env vars + adrese contracte
    │   ├── pages/
    │   │   ├── Home.tsx
    │   │   ├── LobbyPage/
    │   │   ├── GamePage/
    │   │   ├── TournamentPage/
    │   │   ├── StakingPage/
    │   │   ├── Marketplace.tsx
    │   │   ├── Leaderboard.tsx
    │   │   └── Profile.tsx
    │   ├── components/
    │   │   ├── Layout/
    │   │   │   ├── Navbar.tsx   # Sticky nav + wallet auth drawer (v5)
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
    │   │   ├── staking.service.ts
    │   │   └── tournament.service.ts  # ← nou
    │   ├── contexts/
    │   │   └── DappProvider.tsx # Thin context (useGetAccountInfo v5)
    │   ├── styles/
    │   │   └── theme.ts
    │   ├── utils/
    │   │   └── address.ts
    │   └── config.ts
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
cd contracts/battleship && mxpy contract build
cd contracts/nft       && mxpy contract build
cd contracts/staking   && mxpy contract build
```

---

## 📦 Deploy Contracte

### 1. Configurare wallet devnet

```bash
mxpy wallet new --format=pem --outfile=wallet.pem
# Faucet EGLD devnet: https://devnet-wallet.multiversx.com/faucet
```

### 2. Deploy toate contractele

```bash
# Battleship
mxpy contract deploy \
  --bytecode=contracts/battleship/output/battleship.wasm \
  --pem=wallet.pem --gas-limit=60000000 \
  --chain=D --proxy=https://devnet-gateway.multiversx.com \
  --recall-nonce --send

# NFT
mxpy contract deploy \
  --bytecode=contracts/nft/output/nft.wasm \
  --pem=wallet.pem --gas-limit=60000000 \
  --chain=D --proxy=https://devnet-gateway.multiversx.com \
  --recall-nonce --send

# Staking
mxpy contract deploy \
  --bytecode=contracts/staking/output/staking.wasm \
  --pem=wallet.pem --gas-limit=60000000 \
  --chain=D --proxy=https://devnet-gateway.multiversx.com \
  --recall-nonce --send
```

### 3. Înregistrează colecția NFT (o singură dată)

```bash
mxpy contract call <NFT_CONTRACT_ADDRESS> \
  --function=registerShipCollection \
  --value=50000000000000000 \
  --gas-limit=10000000 --pem=wallet.pem \
  --chain=D --proxy=https://devnet-gateway.multiversx.com \
  --recall-nonce --send
```

---

## ⚙️ Configurare Frontend

Creează `.env.local` în `frontend/` (nu se commitează):

```env
# Adrese contracte (după deploy)
VITE_BATTLESHIP_ADDRESS=erd1...
VITE_NFT_ADDRESS=erd1...
VITE_STAKING_ADDRESS=erd1...

# WalletConnect v2 — obții gratis de la https://cloud.walletconnect.com
VITE_WALLET_CONNECT_V2_PROJECT_ID=abc123...
```

`config.ts` citește automat aceste variabile cu fallback la adresele placeholder:

```typescript
export const BATTLESHIP_CONTRACT_ADDRESS =
  import.meta.env.VITE_BATTLESHIP_ADDRESS ?? 'erd1qqq...';
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
   SAU
   Înscrie-te într-un Turneu
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

### ✅ Completat (Sprint 1-4)

- [x] Smart contract Battleship cu logică completă de joc
- [x] Smart contract NFT pentru nave SFT (5 tipuri, Level 1-10)
- [x] Smart contract Staking cu APR configurabil
- [x] Frontend complet: Home, Lobby, Game, Marketplace, Staking, Profile, Leaderboard
- [x] **Migrare sdk-dapp v5** — `initApp()`, `ProviderFactory`, `TransactionManager`
- [x] Autentificare MultiversX v5 (4 metode, Wallet Selection Drawer)
- [x] `tournament.service.ts` — joinTournament, getTournament, getActiveTournaments
- [x] Configurare via `.env.local` (`VITE_*` vars)
- [x] GameBoard 10×10 interactiv
- [x] Sistem de achievements (8 badges)
- [x] Profil cu statistici și istoric meciuri

### 🔜 Planificat (Sprint 5+)

- [ ] Deploy pe devnet + teste end-to-end
- [ ] Leaderboard global live (top win rate / EGLD câștigat)
- [ ] Turnee cu bracket elimination vizual
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
- Toate tranzacțiile frontend sunt semnate client-side prin `ProviderFactory`

---

## 📄 Licență

MIT © 2026 MetaShipX — Construit pe [MultiversX](https://multiversx.com)
