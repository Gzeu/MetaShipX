#!/bin/bash
# MetaShipX — Deploy Marketplace Contract
set -euo pipefail

SOURCE_DIR="$(dirname "$0")"
ROOT_DIR="$(cd "$SOURCE_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  set -a; source "$ENV_FILE"; set +a
fi

NETWORK="${NETWORK:-devnet}"
GATEWAY="${MULTIVERSX_GATEWAY:-https://devnet-gateway.multiversx.com}"
PEM="${WALLET_PEM:-./wallet/deployer.pem}"
CONTRACT_DIR="$ROOT_DIR/contracts/marketplace"

echo "==> Building Marketplace contract..."
cd "$CONTRACT_DIR"
mxpy contract build

echo "==> Deploying to $NETWORK..."
DEPLOY_OUTPUT=$(mxpy contract deploy \
  --bytecode output/marketplace.wasm \
  --pem "$PEM" \
  --gas-limit 80000000 \
  --proxy "$GATEWAY" \
  --recall-nonce \
  --send 2>&1)

MARKETPLACE_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP 'erd1[a-z0-9]+' | tail -1)
echo "Marketplace deployed at: $MARKETPLACE_ADDRESS"

# Update .env
if grep -q 'MARKETPLACE_CONTRACT_ADDRESS' "$ENV_FILE" 2>/dev/null; then
  sed -i.bak "s|^MARKETPLACE_CONTRACT_ADDRESS=.*|MARKETPLACE_CONTRACT_ADDRESS=$MARKETPLACE_ADDRESS|" "$ENV_FILE"
else
  echo "MARKETPLACE_CONTRACT_ADDRESS=$MARKETPLACE_ADDRESS" >> "$ENV_FILE"
fi

echo "==> .env updated. Done."
