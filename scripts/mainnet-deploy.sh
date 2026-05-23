#!/bin/bash
# MetaShipX — Mainnet Deploy Script
# Usage: ./scripts/mainnet-deploy.sh
# Requires: mxpy installed, WALLET_PEM env var pointing to mainnet wallet PEM
# WARNING: This deploys with REAL EGLD. Double-check all addresses.

set -euo pipefail

NETWORK="mainnet"
PROXY="https://gateway.multiversx.com"
CHAIN_ID="1"
WALLET_PEM="${WALLET_PEM:-./mainnet-wallet.pem}"
ENV_FILE="frontend/.env.mainnet"

echo "🚀 MetaShipX Mainnet Deploy"
echo "Network: $NETWORK | Proxy: $PROXY | Chain: $CHAIN_ID"
echo "Wallet: $WALLET_PEM"
echo ""
read -p "⚠️  MAINNET deploy with REAL EGLD. Type 'yes' to continue: " confirm
[ "$confirm" = "yes" ] || { echo "Aborted."; exit 1; }

build_contract() {
  local dir=$1
  echo "📦 Building $dir..."
  cd "contracts/$dir"
  sc-meta all build --locked
  cd ../..
}

deploy_contract() {
  local dir=$1
  local label=$2
  local args="${3:-}"
  echo "🔗 Deploying $label..."
  OUTPUT=$(mxpy contract deploy \
    --bytecode="contracts/$dir/output/${dir//-/_}.wasm" \
    --pem="$WALLET_PEM" \
    --proxy="$PROXY" \
    --chain="$CHAIN_ID" \
    --gas-limit=100000000 \
    ${args} \
    --send --wait-result 2>&1)
  ADDRESS=$(echo "$OUTPUT" | grep -o 'erd1[a-z0-9]*' | tail -1)
  echo "  ✅ $label deployed at: $ADDRESS"
  echo "$ADDRESS"
}

# Build all
build_contract "nft"
build_contract "staking"
build_contract "marketplace"
build_contract "battleship"
build_contract "tournament"

# Deploy in dependency order
NFT_ADDR=$(deploy_contract "nft" "NFT Contract")
STAKING_ADDR=$(deploy_contract "staking" "Staking Contract")
MARKETPLACE_ADDR=$(deploy_contract "marketplace" "Marketplace Contract")
BATTLESHIP_ADDR=$(deploy_contract "battleship" "Battleship Contract" "--arguments addr:$NFT_ADDR addr:$STAKING_ADDR")
TOURNAMENT_ADDR=$(deploy_contract "tournament" "Tournament Contract" "--arguments addr:$BATTLESHIP_ADDR")

# Write env file
cat > "$ENV_FILE" << EOF
VITE_BATTLESHIP_ADDRESS=$BATTLESHIP_ADDR
VITE_NFT_ADDRESS=$NFT_ADDR
VITE_STAKING_ADDRESS=$STAKING_ADDR
VITE_MARKETPLACE_ADDRESS=$MARKETPLACE_ADDR
VITE_TOURNAMENT_ADDRESS=$TOURNAMENT_ADDR
VITE_CHAIN_ID=$CHAIN_ID
VITE_NETWORK=$NETWORK
VITE_PROXY=$PROXY
EOF

echo ""
echo "✅ All contracts deployed! Addresses saved to $ENV_FILE"
echo ""
echo "📋 Summary:"
echo "  Battleship:  $BATTLESHIP_ADDR"
echo "  NFT:         $NFT_ADDR"
echo "  Staking:     $STAKING_ADDR"
echo "  Marketplace: $MARKETPLACE_ADDR"
echo "  Tournament:  $TOURNAMENT_ADDR"
echo ""
echo "🔍 Next: Run smoke tests → scripts/smoke-test-mainnet.sh"
