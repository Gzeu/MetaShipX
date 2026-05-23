#!/bin/bash
# MetaShipX — Seed Tournament Script
# Creates a test tournament on devnet for smoke testing
# Usage: ./scripts/seed-tournament.sh

set -euo pipefail

PROXY="https://devnet-gateway.multiversx.com"
CHAIN_ID="D"
ENV_FILE="frontend/.env.local"
WALLET_PEM="${WALLET_PEM:-./devnet-wallet.pem}"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Run deploy-devnet.sh first to generate $ENV_FILE"
  exit 1
fi

TOURNAMENT_ADDR=$(grep VITE_TOURNAMENT_ADDRESS "$ENV_FILE" | cut -d= -f2)

if [ -z "$TOURNAMENT_ADDR" ]; then
  echo "❌ VITE_TOURNAMENT_ADDRESS not found in $ENV_FILE"
  exit 1
fi

echo "🏆 Seeding tournament on devnet..."
echo "Tournament contract: $TOURNAMENT_ADDR"

# Tournament name as hex
NAME_HEX=$(echo -n "TestTournament" | xxd -p)
# Entry fee: 0.01 EGLD = 10000000000000000 wei = 0x2386F26FC10000
ENTRY_FEE_HEX="2386F26FC10000"
# Max players: 8 = 0x08
MAX_PLAYERS_HEX="08"

mxpy contract call "$TOURNAMENT_ADDR" \
  --function=createTournament \
  --pem="$WALLET_PEM" \
  --proxy="$PROXY" \
  --chain="$CHAIN_ID" \
  --gas-limit=10000000 \
  --value=0 \
  --arguments "0x${NAME_HEX}" "0x${ENTRY_FEE_HEX}" "0x${MAX_PLAYERS_HEX}" \
  --send --wait-result

echo ""
echo "✅ Tournament seeded! Check devnet explorer for transaction."
echo "🔍 Query tournaments: mxpy contract query $TOURNAMENT_ADDR --function=getActiveTournaments --proxy=$PROXY"
