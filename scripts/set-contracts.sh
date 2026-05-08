#!/bin/bash
# ─── Set contract addresses in frontend .env.devnet after deploy ─────────────
# Usage: ./scripts/set-contracts.sh <battleship_addr> <nft_addr> <staking_addr>

set -euo pipefail

BATTLESHIP=${1:-""}
NFT=${2:-""}
STAKING=${3:-""}

if [[ -z "$BATTLESHIP" || -z "$NFT" || -z "$STAKING" ]]; then
  echo "Usage: $0 <battleship_addr> <nft_addr> <staking_addr>"
  exit 1
fi

ENV_FILE="frontend/.env.devnet"

cat > "$ENV_FILE" <<EOF
VITE_CHAIN_ID=D
VITE_MX_API_URL=https://devnet-api.multiversx.com
VITE_MX_EXPLORER_URL=https://devnet-explorer.multiversx.com
VITE_WALLETCONNECT_PROJECT_ID=
VITE_BATTLESHIP_CONTRACT=$BATTLESHIP
VITE_NFT_CONTRACT=$NFT
VITE_STAKING_CONTRACT=$STAKING
VITE_MARKETPLACE_CONTRACT=
VITE_NFT_COLLECTION_ID=SHIP-000000
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000/ws
EOF

echo "✅ Written to $ENV_FILE"
echo ""
echo "Contract addresses set:"
echo "  Battleship: $BATTLESHIP"
echo "  NFT:        $NFT"
echo "  Staking:    $STAKING"
echo ""
echo "Next: cd frontend && npm run dev"
