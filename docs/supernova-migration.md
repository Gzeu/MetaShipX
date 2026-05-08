# Supernova Migration Guide — MetaShipX

> **Status:** ✅ Fully migrated — `multiversx-sc 0.65.1`

## Why Supernova breaks naive contracts

Supernova drops block time from **6 000 ms → 600 ms** (10× faster).
Contracts that stored timestamps in **seconds** and compared them to year-constants had two failure modes:

| Problem | Root cause | Effect |
|---|---|---||
| Division by zero | `now - last = 0` on back-to-back txs in same block | Panic / silent reward skip |
| Inflated rewards | Staking formula still uses `SECONDS_PER_YEAR` but time source is now 10× denser | Over-payment |
| Broken timeouts | `require!(ts_now > last_ts)` always true at 600 ms | Security bypass |

## Changes per contract

### Staking

| Before | After |
|---|---|
| `get_block_timestamp()` → seconds | `get_block_timestamp_millis()` → milliseconds |
| `SECONDS_PER_YEAR = 31_536_000` | `MILLIS_PER_YEAR = 31_536_000_000` |
| `u64` arithmetic | `u128` intermediate to prevent overflow |
| No minimum elapsed guard | `MIN_ELAPSED_MS = 600` guard |
| `staked_at`, `last_claimed` in seconds | `staked_at_ms`, `last_claimed_ms` in milliseconds |

### Battleship

| Before | After |
|---|---|
| No turn timeout | `last_action_nonce` stored on every action |
| N/A | `TURN_TIMEOUT_BLOCKS = 3_000` (~30 min at 600 ms/block) |
| N/A | `claimAbandonedGame` endpoint |
| N/A | `getTurnBlocksRemaining` view |

**Why block nonces, not milliseconds, for timeouts?**
Nonces are strictly monotonic — guaranteed to increase by exactly 1 per block.
Milliseconds can theoretically repeat if the system clock is adjusted.
For game-theoretic security (funds at stake), nonces are safer.

### NFT

| Before | After |
|---|---|
| No minted_at field | `minted_at_ms: u64` stored at mint time |
| N/A | `shipMinted` event includes `minted_at_ms` |
| N/A | `getCurrentTimestampMs` diagnostic view |

## Trade-off analysis: timestamp vs nonce

Developers in the MultiversX ecosystem differ on whether to use
**millisecond timestamps** or **block nonces** for time-sensitive logic.

```
Timestamps (ms)           Block Nonces
─────────────             ────────────
✅ Human-readable         ✅ Strictly monotonic
✅ APR/reward math        ✅ No clock-skew risk
✅ Natural for durations  ✅ Ideal for game timeouts
⚠️  Needs MIN_ELAPSED_MS  ⚠️  Requires BLOCKS_PER_UNIT doc
⚠️  u128 intermediate     ⚠️  Changes meaning at network upgrade
```

**MetaShipX decision:**
- **Staking** → timestamps (ms): APR needs wall-clock durations
- **Battleship** → nonces: game timeouts need monotonic guarantees

## Upgrade notes for deployed contracts

If upgrading a live contract with existing `StakeInfo` records stored in
the old seconds-based format:

1. Drain and re-stake all positions (users must re-stake after upgrade)
2. OR deploy a migration endpoint that reads old `staked_at` (seconds),
   multiplies by 1 000, and writes back as `staked_at_ms`
3. The `last_claimed` → `last_claimed_ms` migration is the most critical
   field — stale values will cause inflated first-claim after upgrade

## Chain simulator testing

```bash
# Requires SpaceCraft SDK >= 0.64
mxpy contract build
mxpy testnet start --config devnet  # use chain simulator for local Supernova test
mxpy contract test --recursive contracts/
```
