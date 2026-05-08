#!/bin/bash
# MetaShipX — one-command devnet deploy
# Usage: ./deploy.sh <your-pem-file>

set -e

PEM=${1:-"wallet.pem"}
PROXY="https://devnet-gateway.multiversx.com"
CHAIN="D"

echo "🔨 Building all contracts..."
(cd contracts && cargo build --release 2>&1 | tail -5)

build_contract() {
  local name=$1
  echo "📦 Building $name..."
  mxpy contract build "contracts/$name" --no-wasm-opt
}

deploy_contract() {
  local name=$1
  local gas=${2:-60000000}
  echo "🚀 Deploying $name..."
  mxpy contract deploy \
    --bytecode "contracts/$name/output/$name.wasm" \
    --pem "$PEM" \
    --proxy "$PROXY" \
    --chain "$CHAIN" \
    --gas-limit "$gas" \
    --send \
    --recall-nonce \
    --outfile "deploy-$name.json"
  echo "✅ $name deployed. Address saved to deploy-$name.json"
}

build_contract battleship
build_contract nft
build_contract staking
build_contract tournament

deploy_contract battleship 60000000
deploy_contract nft        60000000
deploy_contract staking    60000000
deploy_contract tournament 60000000

echo ""
echo "🎉 All contracts deployed!"
echo ""
echo "📋 Update frontend/src/config.ts with these addresses:"
for c in battleship nft staking tournament; do
  if [ -f "deploy-$c.json" ]; then
    ADDR=$(cat "deploy-$c.json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('emittedContractAddress','N/A'))" 2>/dev/null || echo 'N/A')
    echo "  $c: $ADDR"
  fi
done
