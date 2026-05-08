#!/bin/bash
# ─── Request devnet EGLD from faucet for a wallet address ────────────────────
# Usage: ./scripts/devnet-faucet.sh <erd1_address>

set -euo pipefail

ADDRESS=${1:-""}

if [[ -z "$ADDRESS" ]]; then
  echo "Usage: $0 <erd1_address>"
  echo ""
  echo "Or use the web faucet: https://r3d4.fr/faucet"
  exit 1
fi

echo "Requesting 1 EGLD from devnet faucet for: $ADDRESS"

curl -s -X POST "https://devnet-wallet.multiversx.com/api/account/topup" \
  -H "Content-Type: application/json" \
  -d "{\"receiver\": \"$ADDRESS\"}" | jq .

echo ""
echo "Check balance:"
echo "  mxpy account get --address=$ADDRESS --proxy=https://devnet-gateway.multiversx.com"
