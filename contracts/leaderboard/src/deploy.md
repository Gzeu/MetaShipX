# Leaderboard Contract — Deploy Runbook

## Prerequisites
- `mxpy` installed
- `sc-meta` installed (`cargo install multiversx-sc-meta`)
- `BATTLESHIP_ADDRESS` known (from deployed battleship contract)
- PEM wallet file available

## Build
```bash
cd contracts/leaderboard
sc-meta all build --release
# Output: output/leaderboard.wasm
```

## Deploy
```bash
mxpy contract deploy \
  --bytecode output/leaderboard.wasm \
  --pem $WALLET_PEM \
  --proxy https://devnet-gateway.multiversx.com \
  --chain D \
  --gas-limit 60000000 \
  --arguments $BATTLESHIP_ADDRESS \
  --send
# Copy LEADERBOARD_ADDRESS from output
```

## Wire battleship → leaderboard
After deploy, add to battleship contract:
```bash
# In battleship contract: call setLeaderboardContract(LEADERBOARD_ADDRESS)
mxpy contract call $BATTLESHIP_ADDRESS \
  --function setLeaderboardContract \
  --arguments $LEADERBOARD_ADDRESS \
  --pem $WALLET_PEM --proxy ... --chain D --send
```

## Smoke Tests
```bash
# Should return empty list initially
mxpy contract query $LEADERBOARD_ADDRESS \
  --function getTopPlayers --arguments 10 \
  --proxy https://devnet-gateway.multiversx.com

# Should return 0 for any address
mxpy contract query $LEADERBOARD_ADDRESS \
  --function getPlayerRank \
  --arguments $ANY_ADDRESS \
  --proxy https://devnet-gateway.multiversx.com
```

## Mainnet checklist
- [ ] Audit `update_player` caller check (only battleship)
- [ ] Verify `sort_top50` gas on 50 entries (~50 storage reads/writes = ~2M gas)
- [ ] Set correct battleship mainnet address via `setBattleshipContract`
- [ ] Verify `MAX_ENTRIES = 50` is acceptable (changeable via contract upgrade)
