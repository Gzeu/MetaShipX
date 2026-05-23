#!/usr/bin/env bash
# MetaShipX — Reward Pool Health Check
# Usage: CHAIN=devnet ./scripts/check-reward-pool.sh
# Add to cron: */30 * * * * CHAIN=mainnet ./scripts/check-reward-pool.sh >> /var/log/metashipx-pool.log 2>&1
set -euo pipefail

CHAIN="${CHAIN:-devnet}"
ADDR_FILE="contracts/deployed-${CHAIN}.json"

if [[ ! -f "$ADDR_FILE" ]]; then
  echo "❌  No deploy file found: $ADDR_FILE"; exit 1
fi

STAKING_ADDR=$(python3 -c "import json; print(json.load(open('$ADDR_FILE'))['staking'])" 2>/dev/null || echo '')
if [[ -z "$STAKING_ADDR" ]]; then
  echo "❌  staking address not found in $ADDR_FILE"; exit 1
fi

PROXY_URL="${PROXY_URL:-https://devnet-api.multiversx.com}"
if [[ "$CHAIN" == "mainnet" ]]; then PROXY_URL="${PROXY_URL:-https://api.multiversx.com}"; fi

RAW=$(mxpy contract query "$STAKING_ADDR" --function getRewardPool --proxy "$PROXY_URL" 2>/dev/null \
  | grep -oE '[0-9]+' | head -1 || echo '0')
EGLD=$(python3 -c "print(f'{int('${RAW:-0}') / 1e18:.4f}')")
MIN_EGLD=1.0
OK=$(python3 -c "print('OK' if float('$EGLD') >= $MIN_EGLD else 'LOW')")

echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Chain=$CHAIN | RewardPool=${EGLD} EGLD | Status=$OK"
if [[ "$OK" == "LOW" ]]; then
  echo "⚠️  ALERT: Reward pool below ${MIN_EGLD} EGLD! Fund contract: $STAKING_ADDR"
  exit 2
fi
