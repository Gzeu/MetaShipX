#!/usr/bin/env bash
# =============================================================
# MetaShipX — Deploy all contracts to MultiversX Devnet
# Usage: ./scripts/deploy-devnet.sh
# Requires: mxpy >= 9.x, funded devnet wallet at ./wallet/deployer.pem
# =============================================================
set -euo pipefail

PROXY="https://devnet-gateway.multiversx.com"
CHAIN="D"
WALLET="./wallet/deployer.pem"
GAS=60000000

COLOR_GREEN='\033[0;32m'
COLOR_BLUE='\033[0;34m'
COLOR_YELLOW='\033[1;33m'
COLOR_RESET='\033[0m'

log() { echo -e "${COLOR_BLUE}[deploy]${COLOR_RESET} $1"; }
ok()  { echo -e "${COLOR_GREEN}[ok]${COLOR_RESET} $1"; }
warn(){ echo -e "${COLOR_YELLOW}[warn]${COLOR_RESET} $1"; }

# ── 1. Build all contracts ──────────────────────────────────────
log "Building contracts..."
mxpy contract build contracts/battleship
mxpy contract build contracts/nft
mxpy contract build contracts/staking
mxpy contract build contracts/tournament
ok "All contracts built"

# ── 2. Deploy Battleship ────────────────────────────────────────
log "Deploying Battleship contract..."
BATTLESHIP_OUT=$(mxpy contract deploy \
  --bytecode contracts/battleship/output/battleship.wasm \
  --proxy $PROXY \
  --chain $CHAIN \
  --pem $WALLET \
  --gas-limit $GAS \
  --recall-nonce \
  --send \
  --outfile /tmp/battleship-deploy.json 2>&1)

BATTLESHIP_ADDR=$(python3 -c "
import json, sys
data = json.load(open('/tmp/battleship-deploy.json'))
print(data['contractAddress'])
")
ok "Battleship deployed at: $BATTLESHIP_ADDR"

# ── 3. Deploy NFT ───────────────────────────────────────────────
log "Deploying NFT contract..."
mxpy contract deploy \
  --bytecode contracts/nft/output/nft.wasm \
  --proxy $PROXY \
  --chain $CHAIN \
  --pem $WALLET \
  --gas-limit $GAS \
  --arguments $BATTLESHIP_ADDR \
  --recall-nonce \
  --send \
  --outfile /tmp/nft-deploy.json

NFT_ADDR=$(python3 -c "
import json
data = json.load(open('/tmp/nft-deploy.json'))
print(data['contractAddress'])
")
ok "NFT deployed at: $NFT_ADDR"

# ── 4. Deploy Staking ───────────────────────────────────────────
log "Deploying Staking contract..."
mxpy contract deploy \
  --bytecode contracts/staking/output/staking.wasm \
  --proxy $PROXY \
  --chain $CHAIN \
  --pem $WALLET \
  --gas-limit $GAS \
  --recall-nonce \
  --send \
  --outfile /tmp/staking-deploy.json

STAKING_ADDR=$(python3 -c "
import json
data = json.load(open('/tmp/staking-deploy.json'))
print(data['contractAddress'])
")
ok "Staking deployed at: $STAKING_ADDR"

# ── 5. Deploy Tournament ────────────────────────────────────────
log "Deploying Tournament contract..."
mxpy contract deploy \
  --bytecode contracts/tournament/output/tournament.wasm \
  --proxy $PROXY \
  --chain $CHAIN \
  --pem $WALLET \
  --gas-limit $GAS \
  --arguments $BATTLESHIP_ADDR \
  --recall-nonce \
  --send \
  --outfile /tmp/tournament-deploy.json

TOURNAMENT_ADDR=$(python3 -c "
import json
data = json.load(open('/tmp/tournament-deploy.json'))
print(data['contractAddress'])
")
ok "Tournament deployed at: $TOURNAMENT_ADDR"

# ── 6. Post-deploy: registerShipCollection ──────────────────────
log "Registering ship collection (requires 0.05 EGLD)..."
mxpy contract call $NFT_ADDR \
  --function registerShipCollection \
  --proxy $PROXY \
  --chain $CHAIN \
  --pem $WALLET \
  --gas-limit 80000000 \
  --value 50000000000000000 \
  --recall-nonce \
  --send
ok "Ship collection registration tx sent"

# ── 7. Write .env.devnet ────────────────────────────────────────
ENV_FILE="frontend/.env.devnet"
cat > $ENV_FILE <<EOF
VITE_ENV=devnet
VITE_BATTLESHIP_CONTRACT=$BATTLESHIP_ADDR
VITE_NFT_CONTRACT=$NFT_ADDR
VITE_STAKING_CONTRACT=$STAKING_ADDR
VITE_TOURNAMENT_CONTRACT=$TOURNAMENT_ADDR
VITE_API_URL=https://devnet-api.multiversx.com
VITE_BACKEND_URL=http://localhost:3001
EOF

ok "Written $ENV_FILE"

cat > backend/.env.devnet <<EOF
NODE_ENV=development
PORT=3001
MX_API_URL=https://devnet-api.multiversx.com
MX_CHAIN=D
BATTLESHIP_CONTRACT=$BATTLESHIP_ADDR
NFT_CONTRACT=$NFT_ADDR
STAKING_CONTRACT=$STAKING_ADDR
TOURNAMENT_CONTRACT=$TOURNAMENT_ADDR
EOF

ok "Written backend/.env.devnet"

# ── 8. Summary ──────────────────────────────────────────────────
echo ""
echo -e "${COLOR_GREEN}══════════════════════════════════════════${COLOR_RESET}"
echo -e "${COLOR_GREEN}  MetaShipX deployed to Devnet ✓${COLOR_RESET}"
echo -e "${COLOR_GREEN}══════════════════════════════════════════${COLOR_RESET}"
echo ""
echo "  Battleship : $BATTLESHIP_ADDR"
echo "  NFT        : $NFT_ADDR"
echo "  Staking    : $STAKING_ADDR"
echo "  Tournament : $TOURNAMENT_ADDR"
echo ""
warn "Next steps:"
warn "  1. cp frontend/.env.devnet frontend/.env.local"
warn "  2. cp backend/.env.devnet  backend/.env"
warn "  3. cd frontend && npm run dev"
warn "  4. cd backend  && npm run dev"
echo ""
