#!/usr/bin/env bash
# ============================================================
# deploy-staking.sh — Deploy the MetaShipX Staking contract
# Usage: bash scripts/deploy-staking.sh [devnet|testnet|mainnet]
# ============================================================
set -euo pipefail

NETWORK="${1:-devnet}"
PEM_FILE="${WALLET_PEM:-./wallet/deployer.pem}"
ENV_FILE=".env"

case "$NETWORK" in
  devnet)   GATEWAY="https://devnet-gateway.multiversx.com" ;;
  testnet)  GATEWAY="https://testnet-gateway.multiversx.com" ;;
  mainnet)  GATEWAY="https://gateway.multiversx.com" ;;
  *) echo "Unknown network: $NETWORK"; exit 1 ;;
esac

CONTRACT_DIR="./contracts/staking"
WASM_PATH="$CONTRACT_DIR/output/metashipx-staking.wasm"

echo "🔨  Building Staking contract..."
(cd "$CONTRACT_DIR" && mxpy contract build)

echo "🚀  Deploying Staking contract to $NETWORK..."
mxpy contract deploy \
  --bytecode "$WASM_PATH" \
  --pem "$PEM_FILE" \
  --gas-limit 60000000 \
  --proxy "$GATEWAY" \
  --recall-nonce \
  --send \
  --outfile /tmp/deploy-staking-result.json

ADDRESS=$(python3 -c "
import json
data = json.load(open('/tmp/deploy-staking-result.json'))
print(data.get('contractAddress', data.get('address', 'unknown')))
" 2>/dev/null || grep -oE 'erd1[a-z0-9]{58}' /tmp/deploy-staking-result.json | tail -1)

echo ""
echo "✅  Staking contract deployed!"
echo "📋  Address: $ADDRESS"

if [ -f "$ENV_FILE" ]; then
  if grep -q 'STAKING_CONTRACT_ADDRESS=' "$ENV_FILE"; then
    sed -i "s|STAKING_CONTRACT_ADDRESS=.*|STAKING_CONTRACT_ADDRESS=$ADDRESS|" "$ENV_FILE"
  else
    echo "STAKING_CONTRACT_ADDRESS=$ADDRESS" >> "$ENV_FILE"
  fi
else
  echo "STAKING_CONTRACT_ADDRESS=$ADDRESS" > "$ENV_FILE"
fi

echo "📝  Saved to .env: STAKING_CONTRACT_ADDRESS=$ADDRESS"
