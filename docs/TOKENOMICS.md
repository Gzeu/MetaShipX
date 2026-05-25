# MetaShipX — Tokenomics & Game Economy

> This document describes the EGLD flow, fee structure, staking APR sustainability model,
> and long-term economic design of MetaShipX.

---

## 1. Token: EGLD (native MultiversX)

MetaShipX uses **EGLD exclusively** — no custom token, no governance token.
This eliminates token launch risk, regulatory complexity, and artificial inflation.
All value is denominated and settled in EGLD.

---

## 2. EGLD Flow Diagram

```
         Player A                    Player B
         deposits                    deposits
         wager (W)                   wager (W)
              │                           │
              └──────────┬────────────────┘
                         │
                  Battleship Contract
                  holds: 2W
                         │
              ┌──────────┼──────────────────┐
              │ Match fee │                  │
           (2W × fee%)   │             (2W - fee) goes
              │          │             to winner
              ▼          ▼
        Staking Contract     Winner's Wallet
        (reward pool)
              │
         Stakers earn
         20% APR from pool
```

---

## 3. Fee Structure

| Event | Fee | Recipient |
|-------|-----|----------|
| Match completion | `MATCH_FEE_BPS` (default: 500 = 5%) | Staking reward pool |
| NFT mint | Fixed per ship type | Protocol treasury (owner) |
| NFT upgrade | `level × mint_price` | Protocol treasury |
| Marketplace listing | 0 (free to list) | — |
| Marketplace sale | `MARKET_FEE_BPS` (configurable) | Protocol treasury |
| Tournament entry | Entry fee set per tournament | Tournament prize pool |
| Tournament fee | `TOURNAMENT_FEE_BPS` of prize pool | Protocol treasury |

### Match Fee Detail

With default 5% fee on a 1 EGLD vs 1 EGLD match:
- Total pot: 2 EGLD
- Fee to staking pool: 0.10 EGLD
- Winner receives: 1.90 EGLD (net +0.90 EGLD)
- Loser loses: 1.00 EGLD

---

## 4. NFT Ships — Mint Economy

| Ship | Size | Mint Price | Rarity | Max Supply (suggested) |
|------|------|------------|--------|------------------------|
| Destroyer | 2 | 0.05 EGLD | Common | Unlimited |
| Submarine | 3 | 0.08 EGLD | Uncommon | Unlimited |
| Cruiser | 3 | 0.10 EGLD | Rare | 10,000 |
| Battleship | 4 | 0.15 EGLD | Epic | 5,000 |
| Carrier | 5 | 0.25 EGLD | Legendary | 1,000 |

**Upgrade cost formula:** `upgrade_cost = level × mint_price`
- Example: Carrier from level 4 → 5: `4 × 0.25 = 1.00 EGLD`
- Maximum upgrade total (level 1 → 10): `sum(1..9) × mint_price = 45 × mint_price`
- Carrier full upgrade: `45 × 0.25 = 11.25 EGLD` total invested

**Level benefits** (off-chain display, on-chain tracked):
- Level 1-3: Base appearance
- Level 4-6: Silver skin overlay
- Level 7-9: Gold skin overlay  
- Level 10: Legendary animated skin (unique visual)

---

## 5. Staking APR Sustainability Model

### Revenue Sources to Staking Pool
1. **Match fees** — primary source (5% of every completed game)
2. **Owner top-ups** — `fundRewardPool` callable by anyone
3. **Tournament fees** — portion of tournament prize pools

### APR Calculation

The contract uses block-time-based accrual:
```
pending_rewards = staked_amount × APR_bps / 10_000 × elapsed_ms / MILLIS_PER_YEAR
```

### Sustainability Threshold

To sustain 20% APR on X EGLD staked, the pool needs:
```
Required annual inflow = X × 0.20 EGLD
```

| TVL Staked | Required Annual Match Volume | At 0.10 EGLD fee/game |
|-----------|-----------------------------|-----------------------|
| 100 EGLD | 20 EGLD/year | 200 games/year (0.5/day) |
| 500 EGLD | 100 EGLD/year | 1,000 games/year (2.7/day) |
| 2,000 EGLD | 400 EGLD/year | 4,000 games/year (11/day) |
| 10,000 EGLD | 2,000 EGLD/year | 20,000 games/year (55/day) |

**Conclusion:** 20% APR is sustainable with modest game volume. At 10 games/day (realistic at launch),
the protocol can sustain ~1,800 EGLD TVL without top-ups.

### Risk Management
- `MAX_APR = 10,000 bps` (100%) hard-coded cap — prevents misconfiguration
- `check-reward-pool.sh` warns if pool < 1 EGLD (cron-ready)
- APR can be lowered by owner via `setApr` if pool depletes
- Partial unstake supported — stakers aren't locked

---

## 6. Tournament Economy

```
Entry fee × N players = Prize pool
Prize pool × (1 - TOURNAMENT_FEE_BPS/10000) = Net prizes
Net prizes distributed: 70% winner / 20% finalist / 10% semifinalists (suggested)
```

Example — 16-player tournament at 0.5 EGLD entry:
- Gross pool: 8 EGLD
- Protocol fee (5%): 0.40 EGLD
- Net prize pool: 7.60 EGLD
  - 1st place: 5.32 EGLD
  - 2nd place: 1.52 EGLD
  - 3rd/4th: 0.38 EGLD each

---

## 7. Protocol Treasury Usage

Funds from minting, upgrades, and marketplace fees accumulate to the owner address.
Suggested allocation:

| Category | % | Purpose |
|----------|---|---------|
| Reward pool top-ups | 40% | Maintain staking APR during growth phase |
| Development | 30% | Audits, infrastructure, new features |
| Marketing | 20% | Tournaments, influencers, bounties |
| Reserve | 10% | Emergency / protocol insurance |

---

## 8. Anti-Inflation Properties

- **No token minting** — EGLD is a fixed-supply asset
- **Burn mechanism** (future): portion of upgrade fees could be burned via MultiversX native burn
- **NFT ships are consumable** — `burnShip` removes supply permanently
- **Wager system is zero-sum** — no new EGLD created, just redistributed
- **Upgrade cost scales quadratically** — prevents hyperinflation of high-level ships

---

## 9. Growth Projections

| Metric | Month 1 | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|---------|----------|
| Daily active games | 10 | 50 | 150 | 400 |
| Ships minted | 500 | 2,500 | 8,000 | 25,000 |
| TVL staked (EGLD) | 200 | 1,000 | 3,000 | 10,000 |
| Tournament players/month | 32 | 128 | 500 | 2,000 |
| Protocol revenue (EGLD/month) | 5 | 25 | 80 | 250 |

---

## 10. Competitive Positioning

| Project | Chain | Token model | Wager system | P2P Market | Staking |
|---------|-------|------------|-------------|-----------|--------|
| **MetaShipX** | MultiversX | EGLD only | ✅ On-chain | ✅ | ✅ 20% APR |
| Knights of Cathena | MultiversX | Custom token | ❌ | ✅ | ✅ |
| Gods Unchained | ImmutableX | GODS token | ❌ | ✅ | ❌ |
| Crypto Blades | BNB | SKILL token | ❌ | ❌ | ✅ |

MetaShipX is the **only project in the MultiversX ecosystem** with on-chain PvP wagering.

---

*Last updated: v0.8.0 — May 2026*
