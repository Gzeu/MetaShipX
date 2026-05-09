# Tournament Contract — Fresh Deploy Runbook (v2-supernova)

> **Why fresh deploy?**  
> The `Tournament` struct field was renamed `created_at → created_at_ms` and the
> value type changed from raw seconds (`get_block_timestamp`) to milliseconds
> (`get_block_timestamp_millis`).  
> MultiversX uses `TopEncode` positional encoding for storage — renaming a field
> changes nothing by itself, but the **value semantics** differ (seconds vs ms),
> so any live data must be migrated or the contract redeployed fresh.

---

## Prerequisites

```bash
cargo install multiversx-sc-meta   # sc-meta CLI
pip install mxpy                   # or mxpy already installed
```

Make sure `~/.cargo/bin` is in `$PATH` and you have a funded devnet wallet at
`~/wallet/devnet.pem`.

---

## 1. Build

```bash
cd contracts/tournament
sc-meta all build
# Output: output/tournament.wasm  (~60 KB after opt-level=z)
```

Verify WASM size is reasonable:
```bash
ls -lh output/tournament.wasm
# Expected: 50-80 KB
```

---

## 2. Deploy to devnet

```bash
# Replace BATTLESHIP_ADDRESS with your deployed battleship contract address
export BATTLESHIP_ADDR="erd1..."

mxpy contract deploy \
  --bytecode output/tournament.wasm \
  --pem ~/wallet/devnet.pem \
  --proxy https://devnet-gateway.multiversx.com \
  --chain D \
  --gas-limit 80000000 \
  --arguments $BATTLESHIP_ADDR \
  --send \
  --outfile output/deploy-devnet.json

# Save the new contract address:
cat output/deploy-devnet.json | jq '.contractAddress'
```

---

## 3. Smoke test

```bash
export TOURNAMENT_ADDR="erd1..."   # from step 2

# Check getCurrentTimestampMs — should return millis (~1.7 trillion)
mxpy contract query $TOURNAMENT_ADDR \
  --proxy https://devnet-gateway.multiversx.com \
  --function getCurrentTimestampMs
# Expected: a number > 1_700_000_000_000 (ms since epoch)

# Check platform fee default (5%)
mxpy contract query $TOURNAMENT_ADDR \
  --proxy https://devnet-gateway.multiversx.com \
  --function getPlatformFee
# Expected: 5
```

---

## 4. Update frontend config

In `frontend/src/config.ts` (or `.env.devnet`):

```ts
export const TOURNAMENT_CONTRACT_ADDRESS = "erd1..."; // new address from step 2
```

---

## 5. Mainnet (when ready)

Same steps, change flags:
```bash
--proxy https://gateway.multiversx.com \
--chain 1 \
--pem ~/wallet/mainnet.pem
```

---

## Rollback

Old contract (v1) remains at its original address — it is **not** destroyed.
If v2 has issues, revert `TOURNAMENT_CONTRACT_ADDRESS` in the frontend config
to point back to the v1 address while debugging.
