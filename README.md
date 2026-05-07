# ⚓ MetaShipX

> **Battleship. On-Chain.** — Multiplayer naval strategy game on MultiversX with NFT ships, EGLD wagering, staking rewards, and tournaments.

[![MultiversX](https://img.shields.io/badge/MultiversX-Devnet-blue)](https://devnet.multiversx.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![sdk-dapp](https://img.shields.io/badge/sdk--dapp-v5-blueviolet)](https://github.com/multiversx/mx-sdk-dapp)
[![Rust](https://img.shields.io/badge/Rust-SmartContracts-orange?logo=rust)](https://www.rust-lang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## What is MetaShipX?

Two players battle on a 10×10 grid, each commanding a fleet of NFT ships. Every move is a blockchain transaction. The winner takes the combined EGLD wager. Earn staking rewards from match fees and compete in elimination tournaments.

**Stack:** Rust smart contracts · React 18 + Vite · Chakra UI · `@multiversx/sdk-dapp` v5

---

## Architecture

```
contracts/
├── battleship/   — game logic, wager escrow, attack validation
├── nft/          — SFT ship minting & upgrades (5 types, Level 1–10)
└── staking/      — reward pool, 20% APR, no lock-up

frontend/
├── services/     — battleship · nft · staking · tournament
├── hooks/        — useGame · useStaking · useNft · useProfile
├── components/   — GameBoard 10×10 · Navbar with wallet drawer
└── pages/        — Home · Lobby · Game · Tournaments · Staking · Marketplace · Profile
```

---

## Smart Contracts

### Battleship
| Endpoint | Description |
|---|---|
| `createGame` | Create a match, lock EGLD wager |
| `joinGame` | Opponent joins with equal wager |
| `placeShips` | Each player places 5 ships secretly |
| `attack(row, col)` | Attack a cell; contract validates hit/miss |
| `withdraw` | Winner claims combined EGLD |

### NFT Ships
| Ship | Size | Mint Price | Rarity |
|---|---|---|---|
| Destroyer | 2 | 0.05 EGLD | Common |
| Submarine | 3 | 0.08 EGLD | Uncommon |
| Cruiser | 3 | 0.08 EGLD | Uncommon |
| Battleship | 4 | 0.15 EGLD | Rare |
| Carrier | 5 | 0.30 EGLD | Legendary |

### Staking
Deposit EGLD → earn `amount × APR × elapsed / SECONDS_PER_YEAR`. Claim anytime, no lock-up. Pool funded by match fees.

---

## Getting Started

### Prerequisites
```bash
# Rust + wasm target
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown

# MultiversX CLI
pip3 install multiversx-sdk-cli
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local   # fill in contract addresses
npm run dev                   # http://localhost:5173
```

### Environment Variables (`.env.local`)
```env
VITE_BATTLESHIP_ADDRESS=erd1...
VITE_NFT_ADDRESS=erd1...
VITE_STAKING_ADDRESS=erd1...
VITE_WALLET_CONNECT_V2_PROJECT_ID=abc123
```
Get a free WalletConnect v2 Project ID at [cloud.walletconnect.com](https://cloud.walletconnect.com).

### Deploy Contracts
```bash
# Build
cd contracts/battleship && mxpy contract build
cd contracts/nft        && mxpy contract build
cd contracts/staking    && mxpy contract build

# Deploy (repeat for nft + staking)
mxpy contract deploy \
  --bytecode=contracts/battleship/output/battleship.wasm \
  --pem=wallet.pem --gas-limit=60000000 \
  --chain=D --proxy=https://devnet-gateway.multiversx.com \
  --recall-nonce --send

# Register NFT collection (once, costs 0.05 EGLD)
mxpy contract call <NFT_ADDRESS> \
  --function=registerShipCollection --value=50000000000000000 \
  --gas-limit=10000000 --pem=wallet.pem \
  --chain=D --proxy=https://devnet-gateway.multiversx.com \
  --recall-nonce --send
```

---

## SDK Dapp v5 — Key Patterns

```typescript
// Bootstrap (main.tsx)
await initApp({ dAppConfig: { environment: EnvironmentsEnum.devnet, nativeAuth: true } });

// Login
const p = await ProviderFactory.create({ type: ProviderTypeEnum.walletConnect });
await p.login({ callbackUrl: window.location.origin + '/lobby' });

// Send transaction
await refreshAccount();
const signed = await provider.signTransactions([tx]);
const sent   = await TransactionManager.getInstance().send(signed);
```

---

## Roadmap

### ✅ Done
- [x] Battleship smart contract (full game cycle)
- [x] NFT contract — 5 ship types, Level 1–10, win tracking
- [x] Staking contract — APR pool, auto-claim
- [x] Frontend — all pages, GameBoard 10×10, achievements
- [x] sdk-dapp v5 migration — `initApp`, `ProviderFactory`, `TransactionManager`
- [x] Wallet drawer — xPortal · Extension · Web Wallet · Ledger
- [x] Tournament service — join, view, list active
- [x] VITE_ env var config

### 🔜 Next
- [ ] Devnet deploy + end-to-end testing
- [ ] Live global leaderboard
- [ ] Tournament bracket UI
- [ ] NFT secondary marketplace
- [ ] Spectator mode (watch live matches)
- [ ] Sound & hit/miss animations
- [ ] Mainnet launch

---

## Security

- `#[only_owner]` guards on all admin endpoints
- Ship placements hashed on-chain (opponent cannot see)
- Wager locked in contract until match ends
- All transactions signed client-side via `ProviderFactory`

---

MIT © 2026 MetaShipX — Built on [MultiversX](https://multiversx.com)
