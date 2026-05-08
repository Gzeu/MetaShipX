#!/usr/bin/env bash
# ============================================================
# deploy-battleship.sh — Deploy the MetaShipX Battleship contract
# Usage: bash scripts/deploy-battleship.sh [devnet|testnet|mainnet]
#
# Prereqs:
#   - NFT_CONTRACT_ADDRESS set in .env
#   - STAKING_CONTRACT_ADDRESS set in .env
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

# Load existing .env
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

CONTRACT_DIR="./contracts/battleship"
WASM_PATH="$CONTRACT_DIR/output/metashipx-battleship.wasm"

echo "🔨  Building Battleship contract..."
(cd "$CONTRACT_DIR" && mxpy contract build)

echo "🚀  Deploying Battleship contract to $NETWORK..."
mxpy contract deploy \
  --bytecode "$WASM_PATH" \
  --pem "$PEM_FILE" \
  --gas-limit 80000000 \
  --proxy "$GATEWAY" \
  --recall-nonce \
  --send \
  --outfile /tmp/deploy-battleship-result.json

ADDRESS=$(python3 -c "
import json
data = json.load(open('/tmp/deploy-battleship-result.json'))
print(data.get('contractAddress', data.get('address', 'unknown')))
" 2>/dev/null || grep -oE 'erd1[a-z0-9]{58}' /tmp/deploy-battleship-result.json | tail -1)

echo ""
echo "✅  Battleship contract deployed!"
echo "📋  Address: $ADDRESS"

if [ -f "$ENV_FILE" ]; then
  if grep -q 'BATTLESHIP_CONTRACT_ADDRESS=' "$ENV_FILE"; then
    sed -i "s|BATTLESHIP_CONTRACT_ADDRESS=.*|BATTLESHIP_CONTRACT_ADDRESS=$ADDRESS|" "$ENV_FILE"
  else
    echo "BATTLESHIP_CONTRACT_ADDRESS=$ADDRESS" >> "$ENV_FILE"
  fi
else
  echo "BATTLESHIP_CONTRACT_ADDRESS=$ADDRESS" > "$ENV_FILE"
fi

echo "📝  Saved to .env: BATTLESHIP_CONTRACT_ADDRESS=$ADDRESS"

# Wire up cross-contract references if addresses are available
if [ -n "${NFT_CONTRACT_ADDRESS:-}" ]; then
  echo ""
  echo "🔗  Wiring NFT contract ($NFT_CONTRACT_ADDRESS)..."
  mxpy contract call "$ADDRESS" \
    --function setNftContract \
    --arguments "$NFT_CONTRACT_ADDRESS" \
    --pem "$PEM_FILE" \
    --gas-limit 10000000 \
    --proxy "$GATEWAY" \
    --recall-nonce \
    --send
  echo "✅  setNftContract done"
fi

if [ -n "${STAKING_CONTRACT_ADDRESS:-}" ]; then
  echo ""
  echo "🔗  Wiring Staking contract ($STAKING_CONTRACT_ADDRESS)..."
  mxpy contract call "$ADDRESS" \
    --function setStakingContract \
    --arguments "$STAKING_CONTRACT_ADDRESS" \
    --pem "$PEM_FILE" \
    --gas-limit 10000000 \
    --proxy "$GATEWAY" \
    --recall-nonce \
    --send
  echo "✅  setStakingContract done"
fi

echo ""
echo "🎮  Battleship is ready! Cross-contract integrations wired."
