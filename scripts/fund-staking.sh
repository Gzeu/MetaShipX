#!/usr/bin/env bash
# Fund the staking reward pool
# Usage: ./scripts/fund-staking.sh <staking_address> <amount_in_egld>
set -euo pipefail

ADDRESS=$1
AMOUNT_EGLD=$2
PROXY="https://devnet-gateway.multiversx.com"
CHAIN="D"
WALLET="./wallet/deployer.pem"

# Convert EGLD to denomination (multiply by 10^18)
AMOUNT_DENOM=$(python3 -c "print(int($AMOUNT_EGLD * 10**18))")

echo "[fund] Funding staking pool with $AMOUNT_EGLD EGLD..."
mxpy contract call $ADDRESS \
  --function fundRewardPool \
  --proxy $PROXY \
  --chain $CHAIN \
  --pem $WALLET \
  --gas-limit 10000000 \
  --value $AMOUNT_DENOM \
  --recall-nonce \
  --send

echo "[ok] Staking pool funded"
