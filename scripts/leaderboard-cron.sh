#!/usr/bin/env bash
# leaderboard-cron.sh — Weekly leaderboard snapshot + reward pool check
# Add to crontab: 0 0 * * 1 /path/to/scripts/leaderboard-cron.sh >> /var/log/metashipx-cron.log 2>&1
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()  { echo -e "$(date -u +%Y-%m-%dT%H:%M:%SZ) ${GREEN}[OK]${NC} $*"; }
warn(){ echo -e "$(date -u +%Y-%m-%dT%H:%M:%SZ) ${YELLOW}[WARN]${NC} $*"; }
die() { echo -e "$(date -u +%Y-%m-%dT%H:%M:%SZ) ${RED}[ERR]${NC} $*"; exit 1; }

CHAIN=${CHAIN:-devnet}
PROXY=$([ "$CHAIN" = "mainnet" ] && echo "https://api.multiversx.com" || echo "https://devnet-api.multiversx.com")
SNAPSHOT_DIR="./data/leaderboard-snapshots"
mkdir -p "$SNAPSHOT_DIR"
OUTFILE="${SNAPSHOT_DIR}/snapshot-$(date +%Y-%m-%d).json"

# ── Load addresses ─────────────────────────────────────────────────────────
ADDR_FILE="./contracts/deployed-${CHAIN}.json"
[[ -f "$ADDR_FILE" ]] || die "Address file not found: $ADDR_FILE. Run mainnet-deploy.sh first."

LEADERBOARD_ADDR=$(jq -r '.leaderboard' "$ADDR_FILE")
STAKING_ADDR=$(jq -r '.staking' "$ADDR_FILE")
[[ -z "$LEADERBOARD_ADDR" || "$LEADERBOARD_ADDR" == "null" ]] && die "LEADERBOARD_ADDRESS not found in $ADDR_FILE"
[[ -z "$STAKING_ADDR"     || "$STAKING_ADDR"     == "null" ]] && die "STAKING_ADDRESS not found in $ADDR_FILE"

# ── Snapshot top 50 leaderboard ─────────────────────────────────────────────────
LIFE_LIMIT_HEX=$(printf '%08x' 50)  # limit=50 as hex arg
RESPONSE=$(curl -sf \
  "${PROXY}/vm-query" \
  -H 'Content-Type: application/json' \
  -d "{
    \"scAddress\": \"${LEADERBOARD_ADDR}\",
    \"funcName\": \"getTopPlayers\",
    \"args\": [\"${LIFE_LIMIT_HEX}\"]
  }" || echo '{}')

echo "$RESPONSE" | jq "." > "$OUTFILE"
ok "Leaderboard snapshot saved to $OUTFILE"

# ── Check reward pool ──────────────────────────────────────────────────────────────
POOL_RESP=$(curl -sf \
  "${PROXY}/vm-query" \
  -H 'Content-Type: application/json' \
  -d "{\"scAddress\":\"${STAKING_ADDR}\",\"funcName\":\"getRewardPool\",\"args\":[]}" \
  || echo '{}')

POOL_HEX=$(echo "$POOL_RESP" | jq -r '.data.data.returnData[0] // ""')
if [[ -n "$POOL_HEX" && "$POOL_HEX" != "null" ]]; then
  POOL_WEI=$(python3 -c "print(int('${POOL_HEX}', 16))" 2>/dev/null || echo 0)
  POOL_EGLD=$(python3 -c "print(f'{${POOL_WEI}/10**18:.4f}')" 2>/dev/null || echo '?')
  THRESHOLD=$((10 * 10**18))  # 10 EGLD warning threshold
  if (( POOL_WEI < THRESHOLD )); then
    warn "Reward pool is LOW: ${POOL_EGLD} EGLD (threshold: 10 EGLD)"
    warn "Action: mxpy contract call ${STAKING_ADDR} --function fundRewardPool --value <amount>"
  else
    ok "Reward pool healthy: ${POOL_EGLD} EGLD"
  fi
else
  warn "Could not read reward pool balance."
fi

# ── Cleanup old snapshots (keep last 12 weeks) ────────────────────────────────────
find "$SNAPSHOT_DIR" -name 'snapshot-*.json' -mtime +84 -delete
ok "Old snapshots cleaned (kept last 12 weeks)"
ok "Cron job completed successfully."
