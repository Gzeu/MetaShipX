# ⚓ MetaShipX

> **Battleship. On-Chain.** — Multiplayer naval strategy game on MultiversX with NFT ships, EGLD wagering, staking rewards, tournaments, secondary marketplace, spectators, cosmetic skins, and immersive combat FX.

[![Build](https://github.com/Gzeu/MetaShipX/actions/workflows/ci.yml/badge.svg)](https://github.com/Gzeu/MetaShipX/actions)
[![MultiversX](https://img.shields.io/badge/MultiversX-Devnet-blue)](https://devnet.multiversx.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![sdk-dapp](https://img.shields.io/badge/sdk--dapp-v5-blueviolet)](https://github.com/multiversx/mx-sdk-dapp)
[![Rust](https://img.shields.io/badge/Rust-SmartContracts-orange?logo=rust)](https://www.rust-lang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## What is MetaShipX?

Two players battle on a 10×10 grid, each commanding a fleet of **NFT ships**. Every move is a blockchain transaction. The winner takes the combined EGLD wager. Match fees automatically fund a **staking reward pool**. Players can **list and buy ships on a secondary marketplace**, unlock **cosmetic skins**, and let others **watch live matches** with sound + hit/miss animations.

**Stack:** Rust smart contracts · React 18 + Vite · Chakra UI · `@multiversx/sdk-dapp` v5 · NestJS backend · WebSocket real-time · Docker

---

## Features

| Area | Description |
|---|---|
| Battleship PvP | 10×10 board, on-chain wagers, turn-based attacks |
| NFT Fleet | Mint ships, level 1-10 upgrades, win tracking |
| Staking | 20% APR reward pool funded by match fees |
| Tournaments | Elimination brackets with prizes |
| Marketplace | List ship NFTs for EGLD and buy from other players |
| Spectator Mode | Watch live matches in read-only mode with real-time updates |
| Cosmetics | Ship skins/traits for visual customization |
| Immersion | Sound effects and hit/miss/sunk/game-over animations |

---

## Roadmap

### ✅ Implemented
- Battleship contract
- NFT ship minting + upgrade contract
- Staking contract
- Tournament contract
- Frontend services/hooks/components
- Cross-contract integration
- README / changelog / architecture docs

### 🚧 In Progress
- Devnet deployment
- Lobby + page wiring
- End-to-end contract tests

### 🔜 Next
- NFT secondary marketplace (list/buy ships)
- Spectator mode (watch live matches)
- Sound & hit/miss animations
- Ship skin system (cosmetic NFT traits)
- Global leaderboard
- Mainnet launch
