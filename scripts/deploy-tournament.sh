#!/usr/bin/env bash
# ============================================================
# deploy-tournament.sh — Deploy the MetaShipX Tournament contract
# Usage: bash scripts/deploy-tournament.sh [devnet|testnet|mainnet]
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

if [ -f "$ENV_FILE" ]; then
  source "$ENV_FILE"
fi

CONTRACT_DIR="./contracts/tournament"
WASM_PATH="$CONTRACT_DIR/output/metashipx-tournament.wasm"

echo "🔨  Building Tournament contract..."
(cd "$CONTRACT_DIR" && mxpy contract build)

echo "🚀  Deploying Tournament contract to $NETWORK..."
mxpy contract deploy \
  --bytecode "$WASM_PATH" \
  --pem "$PEM_FILE" \
  --gas-limit 80000000 \
  --proxy "$GATEWAY" \
  --recall-nonce \
  --send \
  --outfile /tmp/deploy-tournament-result.json

ADDRESS=$(python3 -c "
import json
data = json.load(open('/tmp/deploy-tournament-result.json'))
print(data.get('contractAddress', data.get('address', 'unknown')))
" 2>/dev/null || grep -oE 'erd1[a-z0-9]{58}' /tmp/deploy-tournament-result.json | tail -1)

echo ""
echo "✅  Tournament contract deployed!"
echo "📋  Address: $ADDRESS"

if [ -f "$ENV_FILE" ]; then
  if grep -q 'TOURNAMENT_CONTRACT_ADDRESS=' "$ENV_FILE"; then
    sed -i "s|TOURNAMENT_CONTRACT_ADDRESS=.*|TOURNAMENT_CONTRACT_ADDRESS=$ADDRESS|" "$ENV_FILE"
  else
    echo "TOURNAMENT_CONTRACT_ADDRESS=$ADDRESS" >> "$ENV_FILE"
  fi
else
  echo "TOURNAMENT_CONTRACT_ADDRESS=$ADDRESS" > "$ENV_FILE"
fi

echo "📝  Saved to .env: TOURNAMENT_CONTRACT_ADDRESS=$ADDRESS"

# Wire tournament → battleship
if [ -n "${BATTLESHIP_CONTRACT_ADDRESS:-}" ]; then
  echo ""
  echo "🔗  Wiring Battleship contract into Tournament..."
  mxpy contract call "$ADDRESS" \
    --function setBattleshipContract \
    --arguments "$BATTLESHIP_CONTRACT_ADDRESS" \
    --pem "$PEM_FILE" \
    --gas-limit 10000000 \
    --proxy "$GATEWAY" \
    --recall-nonce \
    --send
  echo "✅  setBattleshipContract done"

  echo ""
  echo "🔗  Wiring Tournament contract into Battleship..."
  mxpy contract call "$BATTLESHIP_CONTRACT_ADDRESS" \
    --function setTournamentContract \
    --arguments "$ADDRESS" \
    --pem "$PEM_FILE" \
    --gas-limit 10000000 \
    --proxy "$GATEWAY" \
    --recall-nonce \
    --send
  echo "✅  setTournamentContract done"
fi

echo ""
echo "🏆  Tournament contract is ready!"
echo ""
echo "📋  Full deployment summary:"
echo "    Battleship:  ${BATTLESHIP_CONTRACT_ADDRESS:-not deployed}"
echo "    NFT:         ${NFT_CONTRACT_ADDRESS:-not deployed}"
echo "    Staking:     ${STAKING_CONTRACT_ADDRESS:-not deployed}"
echo "    Tournament:  $ADDRESS"
