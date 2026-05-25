#!/usr/bin/env bash
# seed-tournament.sh — Create a test tournament on devnet/testnet for demo/QA
# Usage: CHAIN=devnet WALLET_PEM=~/wallet.pem ./scripts/seed-tournament.sh
set -euo pipefail

GREEN='\033[0;32m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'
ok()  { echo -e "${GREEN}✅ $*${NC}"; }
info(){ echo -e "${CYAN}ℹ️  $*${NC}"; }
die() { echo -e "${RED}❌ $*${NC}"; exit 1; }

CHAIN=${CHAIN:-devnet}
WALLET_PEM=${WALLET_PEM:-"./owner.pem"}
PROXY=$([ "$CHAIN" = "mainnet" ] && echo "https://api.multiversx.com" || echo "https://devnet-api.multiversx.com")
CHAIN_ID=$([ "$CHAIN" = "mainnet" ] && echo "1" || echo "D")
ADDR_FILE="./contracts/deployed-${CHAIN}.json"

[[ -f "$WALLET_PEM" ]]  || die "Wallet PEM not found: $WALLET_PEM"
[[ -f "$ADDR_FILE"   ]]  || die "Address file not found: $ADDR_FILE. Run mainnet-deploy.sh first."

TOURNAMENT_ADDR=$(jq -r '.tournament' "$ADDR_FILE")
[[ -z "$TOURNAMENT_ADDR" || "$TOURNAMENT_ADDR" == "null" ]] && die "tournament address not found in $ADDR_FILE"

# Tournament params
NAME_HEX=$(echo -n "Launch Tournament #1" | xxd -p | tr -d '\n')
ENTRY_FEE="500000000000000000"  # 0.5 EGLD in wei
MAX_PLAYERS=16
ENTRY_FEE_HEX=$(printf '%032x' $ENTRY_FEE)
MAX_PLAYERS_HEX=$(printf '%08x' $MAX_PLAYERS)

info "Creating tournament on ${CHAIN}..."
info "  Name: Launch Tournament #1"
info "  Entry fee: 0.5 EGLD"
info "  Max players: 16"

mxpy contract call "$TOURNAMENT_ADDR" \
  --function createTournament \
  --arguments "0x${NAME_HEX}" "0x${ENTRY_FEE_HEX}" "0x${MAX_PLAYERS_HEX}" \
  --pem "$WALLET_PEM" \
  --proxy "$PROXY" \
  --chain "$CHAIN_ID" \
  --gas-limit 20000000 \
  --send

ok "Tournament created on ${CHAIN}!"
info "Players can join at: /tournaments"
info "To cancel: mxpy contract call $TOURNAMENT_ADDR --function cancelTournament --arguments 0x01 ..."
