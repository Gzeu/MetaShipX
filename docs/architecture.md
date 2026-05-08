# MetaShipX — Architecture Deep Dive

## Contract Interaction Flow

This document describes how the four smart contracts interact at runtime.

### Game Lifecycle

```
1. Player A calls createGame(ship_nonce=3, value=0.5 EGLD)
   → Battleship SC stores game_id=1, locks 0.5 EGLD, records p0 ship nonce

2. Player B calls joinGame(game_id=1, ship_nonce=7, value=0.5 EGLD)
   → Battleship SC accepts, records p1 ship nonce, phase→PlacingShips

3. Both players call placeShips(positions[5])
   → After both placed: phase→InProgress

4. Players alternate attack(game_id, x, y)
   → Contract updates hit/miss/sunk state
   → Returns: Hit | Miss | Sunk | GameOver

5. When GameOver:
   a. prize = 2 × bet × 99% → sent to winner
   b. fee  = 2 × bet × 1%  → forwarded to staking.fundRewardPool()
   c. nft.recordWin(winner_ship_nonce)        [async, 8M gas]
   d. tournament.reportMatchResult(...)       [async, 10M gas, if tournament]
```

### Cross-Contract Safety

All cross-contract calls use `transfer_execute` (MultiversX async fire-and-forget):
- If the NFT contract address is `zero`, the call is silently skipped
- If the Staking contract address is `zero`, the call is silently skipped
- A failed downstream call **cannot revert** the game result or prize payment
- Gas is allocated per call: NFT 8M, Staking 8M, Tournament 10M

### Staking Economics

```
Reward Pool funded by:
  - 1% of every finished game (automatic, via Battleship SC)
  - Direct fundRewardPool() calls (owner or anyone)

APR formula:
  reward = staked_amount × APR_bps × elapsed_seconds
           ─────────────────────────────────────────
                    10_000 × 31_536_000

Default APR: 2000 bps = 20%
Max APR:     set by owner via setApr(bps)
No lock-up:  unstake anytime
Auto-claim:  stake() and unstake() auto-claim pending rewards first
```

### NFT Ship Progression

```
Mint → Level 1
Upgrade → Level 2..10  (cost = level × mint_price)
Win tracking → wins counter incremented by Battleship SC

Level benefits: determined by frontend/game logic
Burn: returns ESDT token to owner, reduces supply
```

### Tournament Bracket

```
create_tournament(entry_fee, max_players)
  → players join until bracket is full
  → tournament SC calls battleship.createTournamentGame(p1, p2, t_id, match_id)
  → Battleship SC calls tournament.reportMatchResult(t_id, match_id, winner)
  → tournament SC advances bracket, distributes prizes at end
```

## Frontend Data Flow

```
User action
  → Hook (useGame / useStaking / useNft)
    → Service (battleship.service / staking.service / nft.service)
      → @multiversx/sdk-dapp Transaction
        → ProviderFactory.signTransactions()
          → TransactionManager.send()
            → MultiversX Devnet
```

Read-only queries bypass the transaction flow and use `ApiNetworkProvider.queryContract()` directly.

## WebSocket Flow

```
Player A attacks → tx confirmed on-chain
  → Backend listens to blockchain events (ws or polling)
    → Emits game event to Room `game:{id}`
      → Player B's browser receives update via WebSocket
        → useGame hook updates board state
          → React re-renders GameBoard
```
