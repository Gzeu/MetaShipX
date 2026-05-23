#!/bin/bash
# MetaShipX — Reward Pool Health Check
# Alerts if the staking reward pool drops below THRESHOLD EGLD
# Usage: ./scripts/check-reward-pool.sh [--network devnet|mainnet]
# Cron example: */30 * * * * /path/to/check-reward-pool.sh >> /var/log/metashipx.log 2>&1

set -euo pipefail

NETWORK="${1:---network=devnet}"
NETWORK="${NETWORK#--network=}"

if [ "$NETWORK" = "mainnet" ]; then
  PROXY="https://gateway.multiversx.com"
  ENV_FILE="frontend/.env.mainnet"
else
  PROXY="https://devnet-gateway.multiversx.com"
  ENV_FILE="frontend/.env.local"
fi

# Load staking address from env file
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Env file not found: $ENV_FILE"
  exit 1
fi

STAKING_ADDR=$(grep VITE_STAKING_ADDRESS "$ENV_FILE" | cut -d= -f2)
THRESHOLD_EGLD="${REWARD_POOL_THRESHOLD:-10}"  # Default alert threshold: 10 EGLD

if [ -z "$STAKING_ADDR" ]; then
  echo "❌ VITE_STAKING_ADDRESS not found in $ENV_FILE"
  exit 1
fi

echo "🔍 Checking reward pool for staking contract: $STAKING_ADDR"

# Query getRewardPool view
RESPONSE=$(mxpy contract query "$STAKING_ADDR" \
  --function=getRewardPool \
  --proxy="$PROXY" 2>&1)

POOL_HEX=$(echo "$RESPONSE" | grep -o '"hex":"[a-f0-9]*"' | head -1 | sed 's/"hex":"//;s/"//')

if [ -z "$POOL_HEX" ]; then
  echo "⚠️  Could not read reward pool (contract may not be deployed)"
  exit 0
fi

# Convert hex to decimal EGLD (18 decimals)
POOL_WEI=$(printf '%d' "0x${POOL_HEX}" 2>/dev/null || echo "0")
POOL_EGLD=$(echo "scale=4; $POOL_WEI / 1000000000000000000" | bc)

echo "💰 Reward Pool: $POOL_EGLD EGLD (threshold: $THRESHOLD_EGLD EGLD)"

# Alert check
COMPARE=$(echo "$POOL_EGLD < $THRESHOLD_EGLD" | bc)
if [ "$COMPARE" = "1" ]; then
  echo "🚨 ALERT: Reward pool is BELOW threshold!"
  echo "   Current: $POOL_EGLD EGLD | Threshold: $THRESHOLD_EGLD EGLD"
  echo "   Action required: fund staking contract via fundRewardPool endpoint"
  # Optionally send webhook alert
  if [ -n "${DISCORD_WEBHOOK_URL:-}" ]; then
    curl -s -X POST "$DISCORD_WEBHOOK_URL" \
      -H 'Content-Type: application/json' \
      -d "{\"content\": \"🚨 MetaShipX Reward Pool LOW: ${POOL_EGLD} EGLD (threshold: ${THRESHOLD_EGLD} EGLD)\"}" \
      > /dev/null
    echo "   Discord alert sent."
  fi
  exit 2
fi

echo "✅ Reward pool is healthy."
