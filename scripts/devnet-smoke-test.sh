#!/bin/bash
# MetaShipX — Devnet Smoke Test
# Run after: ./scripts/mainnet-deploy.sh CHAIN=devnet
# Usage: ./scripts/devnet-smoke-test.sh

set -euo pipefail

PROXY="https://devnet-api.multiversx.com"
DEPLOYED_FILE="contracts/deployed-devnet.json"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; FAILURES=$((FAILURES+1)); }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

FAILURES=0

# Load deployed addresses
if [ ! -f "$DEPLOYED_FILE" ]; then
  echo -e "${RED}ERROR: $DEPLOYED_FILE not found. Run ./scripts/mainnet-deploy.sh CHAIN=devnet first.${NC}"
  exit 1
fi

BATTLESHIP_ADDRESS=$(jq -r '.BATTLESHIP_ADDRESS' "$DEPLOYED_FILE")
NFT_ADDRESS=$(jq -r '.NFT_ADDRESS' "$DEPLOYED_FILE")
STAKING_ADDRESS=$(jq -r '.STAKING_ADDRESS' "$DEPLOYED_FILE")
MARKETPLACE_ADDRESS=$(jq -r '.MARKETPLACE_ADDRESS' "$DEPLOYED_FILE")
TOURNAMENT_ADDRESS=$(jq -r '.TOURNAMENT_ADDRESS' "$DEPLOYED_FILE")
LEADERBOARD_ADDRESS=$(jq -r '.LEADERBOARD_ADDRESS // empty' "$DEPLOYED_FILE")

echo ""
echo "===================================================="
echo "  MetaShipX Devnet Smoke Test"
echo "===================================================="
echo "  Proxy: $PROXY"
echo "  File:  $DEPLOYED_FILE"
echo "===================================================="
echo ""

# ── Staking APR ─────────────────────────────────────────────────────
echo "[1/7] Staking APR..."
APR_RESULT=$(mxpy contract query "$STAKING_ADDRESS" \
  --function getApr \
  --proxy "$PROXY" 2>&1) && \
  pass "Staking getApr: $APR_RESULT" || fail "Staking getApr failed: $APR_RESULT"

# ── Staking Reward Pool ────────────────────────────────────────────
echo "[2/7] Staking Reward Pool..."
POOL_RESULT=$(mxpy contract query "$STAKING_ADDRESS" \
  --function getRewardPool \
  --proxy "$PROXY" 2>&1) && \
  pass "Staking getRewardPool: $POOL_RESULT" || fail "Staking getRewardPool failed"

# Warn if pool is 0
if echo "$POOL_RESULT" | grep -q '"0"\|value: 0'; then
  warn "Reward pool is 0 — fund it before launch: mxpy contract call STAKING_ADDRESS --function fundRewardPool --value 50000000000000000000"
fi

# ── NFT Collection ID ──────────────────────────────────────────────
echo "[3/7] NFT Collection ID..."
NFT_RESULT=$(mxpy contract query "$NFT_ADDRESS" \
  --function getCollectionId \
  --proxy "$PROXY" 2>&1) && \
  pass "NFT getCollectionId: $NFT_RESULT" || fail "NFT getCollectionId failed: $NFT_RESULT"

# ── Marketplace Active Listings ──────────────────────────────────────
echo "[4/7] Marketplace Active Listings..."
MP_RESULT=$(mxpy contract query "$MARKETPLACE_ADDRESS" \
  --function getActiveListings \
  --arguments 0x00 0x14 \
  --proxy "$PROXY" 2>&1) && \
  pass "Marketplace getActiveListings (empty on fresh deploy is OK): ok" || fail "Marketplace getActiveListings failed: $MP_RESULT"

# ── Tournament Timestamp ─────────────────────────────────────────────
echo "[5/7] Tournament getCurrentTimestampMs..."
TS_RESULT=$(mxpy contract query "$TOURNAMENT_ADDRESS" \
  --function getCurrentTimestampMs \
  --proxy "$PROXY" 2>&1) && \
  pass "Tournament getCurrentTimestampMs: $TS_RESULT" || fail "Tournament timestamp query failed: $TS_RESULT"

# ── Battleship contract responds ───────────────────────────────────
echo "[6/7] Battleship contract responds..."
BS_RESULT=$(mxpy contract query "$BATTLESHIP_ADDRESS" \
  --function getPlayerGames \
  --arguments 0x0000000000000000000000000000000000000000000000000000000000000000 \
  --proxy "$PROXY" 2>&1) && \
  pass "Battleship getPlayerGames (empty): ok" || fail "Battleship query failed: $BS_RESULT"

# ── Leaderboard (optional — may not be deployed) ─────────────────────
echo "[7/7] Leaderboard getTopPlayers (optional)..."
if [ -n "$LEADERBOARD_ADDRESS" ]; then
  LB_RESULT=$(mxpy contract query "$LEADERBOARD_ADDRESS" \
    --function getTopPlayers \
    --arguments 0x0A \
    --proxy "$PROXY" 2>&1) && \
    pass "Leaderboard getTopPlayers (empty on fresh deploy): ok" || warn "Leaderboard query warn: $LB_RESULT"
else
  warn "Leaderboard not deployed yet — skipping (expected pre-v0.9.0)"
fi

# ── Summary ─────────────────────────────────────────────────────────
echo ""
echo "===================================================="
if [ "$FAILURES" -eq 0 ]; then
  echo -e "${GREEN}ALL SMOKE TESTS PASSED ✅${NC}"
  echo "  Ready for: ./scripts/mainnet-deploy.sh CHAIN=testnet"
else
  echo -e "${RED}$FAILURES SMOKE TEST(S) FAILED ❌${NC}"
  echo "  Fix failures before proceeding to testnet/mainnet."
  exit 1
fi
echo "===================================================="
