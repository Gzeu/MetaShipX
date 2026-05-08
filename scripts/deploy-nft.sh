#!/usr/bin/env bash
# ============================================================
# deploy-nft.sh — Deploy the MetaShipX NFT/SFT contract
# Usage: bash scripts/deploy-nft.sh [devnet|testnet|mainnet]
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

CONTRACT_DIR="./contracts/nft"
WASM_PATH="$CONTRACT_DIR/output/metashipx-nft.wasm"

echo "🔨  Building NFT contract..."
(cd "$CONTRACT_DIR" && mxpy contract build)

echo "🚀  Deploying NFT contract to $NETWORK..."
OUTPUT=$(mxpy contract deploy \
  --bytecode "$WASM_PATH" \
  --pem "$PEM_FILE" \
  --gas-limit 80000000 \
  --proxy "$GATEWAY" \
  --chain "$([ "$NETWORK" = mainnet ] && echo D || echo D)" \
  --recall-nonce \
  --send \
  --outfile /tmp/deploy-nft-result.json 2>&1)

echo "$OUTPUT"

# Extract contract address
ADDRESS=$(python3 -c "
import json, sys
data = json.load(open('/tmp/deploy-nft-result.json'))
print(data.get('contractAddress', data.get('address', 'unknown')))
" 2>/dev/null || grep -oE 'erd1[a-z0-9]{58}' /tmp/deploy-nft-result.json | tail -1)

echo ""
echo "✅  NFT contract deployed!"
echo "📋  Address: $ADDRESS"

# Write to .env
if [ -f "$ENV_FILE" ]; then
  # Update existing entry
  if grep -q 'NFT_CONTRACT_ADDRESS=' "$ENV_FILE"; then
    sed -i "s|NFT_CONTRACT_ADDRESS=.*|NFT_CONTRACT_ADDRESS=$ADDRESS|" "$ENV_FILE"
  else
    echo "NFT_CONTRACT_ADDRESS=$ADDRESS" >> "$ENV_FILE"
  fi
else
  echo "NFT_CONTRACT_ADDRESS=$ADDRESS" > "$ENV_FILE"
fi

echo "📝  Saved to .env: NFT_CONTRACT_ADDRESS=$ADDRESS"
echo ""
echo "⚡  Next: Register the SFT collection by calling registerShipCollection"
echo "    mxpy contract call $ADDRESS --function registerShipCollection \\"
echo "      --value 50000000000000000 --pem $PEM_FILE --gas-limit 100000000 \\"
echo "      --proxy $GATEWAY --recall-nonce --send"
