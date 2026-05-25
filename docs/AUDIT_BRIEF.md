# MetaShipX — External Security Audit Brief

**Project:** MetaShipX — On-chain Battleship PvP on MultiversX  
**Version:** v0.9.0  
**Date:** May 2026  
**Repo:** https://github.com/Gzeu/MetaShipX  
**Contact:** George Pricop (Gzeu)

---

## 1. Scope

### In Scope — Smart Contracts (Rust / multiversx-sc 0.65.1)

| Contract | Path | Priority |
|---------|------|----------|
| `battleship` | `contracts/battleship/` | 🔴 Critical — handles EGLD wager + game logic |
| `staking` | `contracts/staking/` | 🔴 Critical — holds staked EGLD + reward pool |
| `marketplace` | `contracts/marketplace/` | 🔴 Critical — P2P ESDT transfers + listings |
| `nft` | `contracts/nft/` | 🟡 High — SFT mint/burn/upgrade |
| `tournament` | `contracts/tournament/` | 🟡 High — EGLD prize pool distribution |
| `leaderboard` | `contracts/leaderboard/` | 🟢 Medium — read-heavy, no value at risk |

### In Scope — Backend (NestJS)
- Webhook signature verification (`webhook.guard.ts`)
- Session security (`main.ts`)
- Rate limiting (`ThrottlerModule`)
- Practice bot session isolation (`practice.controller.ts`)

### Out of Scope
- Frontend React code
- MultiversX protocol / sdk-dapp internals
- Infrastructure (Docker, CI)

---

## 2. Architecture Overview

```
User Wallet (xPortal / Ledger / Web Wallet)
        │
        │  EGLD / ESDT transactions
        ▼
 MultiversX Mainnet
  ├── battleship contract  ← createGame, joinGame, placeShips, attack, withdraw
  │     └── calls → leaderboard (fire-and-forget, 12M gas, non-reverting)
  │     └── calls → tournament.reportMatchResult
  │     └── calls → staking.fundRewardPool (match fee %)
  ├── nft contract         ← mintShip, upgradeShip, burnShip, recordWin
  ├── staking contract     ← stake, unstake, claimRewards, fundRewardPool
  ├── marketplace contract ← listShip, buyShip, cancelListing
  ├── tournament contract  ← createTournament, joinTournament, declareTournamentWinner
  └── leaderboard contract ← updatePlayer (restricted), getTopPlayers

Backend (NestJS / PostgreSQL)
  ├── WebSocket gateway    ← real-time game events to frontend
  ├── MultiversX webhook   ← receives tx notifications, verified by X-Signature
  └── Practice API         ← session-based AI bot games (no on-chain tx)
```

---

## 3. Known Fixes Applied Pre-Audit (v0.8.0)

All of the following were identified in internal review and fixed:

| # | Contract | Issue | Fix Applied |
|---|---------|-------|-------------|
| 1 | Staking | Re-entrancy in `claimRewards` | State zeroed BEFORE `direct_egld` send |
| 2 | Staking | APR manipulation | `MAX_APR = 10_000 bps` hard cap in `setApr` + `init` |
| 3 | Marketplace | Re-entrancy in `buyShip` | `listing.active = false` + nonce cleared BEFORE sends |
| 4 | Marketplace | Double-list same NFT | `active_listing_by_nonce` re-list guard |
| 5 | NFT | Integer overflow in upgrade cost | `saturating_mul` on `level × mint_price` |
| 6 | NFT | Uncapped level progression | `require!(level < 10)` hard cap |
| 7 | NFT | Multiple `registerCollection` calls | Once-guard on storage |
| 8 | NFT | `burnShip` caller spoofing | `require!(caller == owner)` |
| 9 | Tournament | Unauthorized `reportMatchResult` | `require!(caller == battleship_contract)` |
| 10 | Battleship | Zero-wager games | `require!(bet > 0)` in `createGame` |
| 11 | Battleship | Out-of-bounds attacks | `require!(row <= 9 && col <= 9)` |

---

## 4. Threat Model — Critical Paths

### Battleship — Highest Value Flow
```
createGame(bet=X EGLD) → joinGame(bet=X EGLD)
→ placeShips (commit hash) → reveal phase
→ attack() × N turns → GameOver event
→ winner receives 2X - fee
→ fee → staking reward pool
```
**Risks to verify:**
- Can a player attack out-of-turn?
- Can `withdraw()` be called while game is active?
- Is the commit-reveal scheme cryptographically sound against grinding?
- Can a player force timeout by never calling `placeShips`?
- Is `TURN_TIMEOUT_BLOCKS = 3_000` safe at 600ms blocks? (~30 min)

### Staking — TVL Risk
```
stake(EGLD) → claimRewards() → unstake(amount)
                ↑
          fundRewardPool (battleship + public)
```
**Risks to verify:**
- Is APR calculation correct at block ms precision? (`MILLIS_PER_YEAR`)
- Can reward pool be drained faster than it fills?
- Is partial unstake accounting correct?

### Marketplace — ESDT Transfer Risk
```
listShip(nonce, price) → buyShip(listing_id)
                          → ESDT to buyer + EGLD to seller
```
**Risks to verify:**
- Race condition between `cancelListing` and `buyShip`?
- Can seller receive EGLD without buyer receiving ESDT?
- Is listing price manipulation possible between list and buy?

---

## 5. Gas Considerations

- `attack()` — gas optimized: `SetMapper` O(1) contains, batch storage writes
- `leaderboard.updatePlayer()` — called via `transfer_execute` with 12M gas cap, non-reverting if OOG
- `tournament.reportMatchResult()` — called by battleship; must not revert battleship tx if tournament fails
- All cross-contract calls are fire-and-forget to prevent cascading failures

---

## 6. Test Coverage Available

```bash
# Unit tests (Rust)
cd contracts/battleship && cargo test
cd contracts/staking    && cargo test
cd contracts/marketplace && cargo test
cd contracts/nft        && cargo test
cd contracts/tournament && cargo test
cd contracts/leaderboard && cargo test

# Devnet smoke tests (7 checks)
./scripts/devnet-smoke-test.sh

# E2E (Playwright, devnet endpoints)
npx playwright test
```

---

## 7. Deliverables Requested from Auditor

1. **Critical findings** (blockers for mainnet) with PoC where applicable
2. **Medium/Low findings** with recommended mitigations
3. **Informational** notes (gas efficiency, code quality)
4. **Final report** in PDF + Markdown
5. **Timeline:** 3–5 business days for initial report

---

## 8. Access & Resources

- Devnet contract addresses: generated by `./scripts/mainnet-deploy.sh CHAIN=devnet`
- MultiversX docs: https://docs.multiversx.com
- `multiversx-sc` framework: https://docs.rs/multiversx-sc/0.65.1
- Internal checklist: `docs/MAINNET_AUDIT_CHECKLIST.md` (43/48 items ✅)
- Gas optimization notes: `contracts/battleship/GAS_OPTIMIZATION.md`
