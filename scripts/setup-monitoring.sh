#!/usr/bin/env bash
# setup-monitoring.sh — MetaShipX Uptime Kuma + monitor auto-config
# Usage: ./scripts/setup-monitoring.sh
# Requires: Docker, curl, jq
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()  { echo -e "${GREEN}✅ $*${NC}"; }
warn(){ echo -e "${YELLOW}⚠️  $*${NC}"; }
die() { echo -e "${RED}❌ $*${NC}"; exit 1; }
info(){ echo -e "${CYAN}ℹ️  $*${NC}"; }

# ── Config ────────────────────────────────────────────────────────────────────
KUMA_PORT=${KUMA_PORT:-3001}
KUMA_DATA_VOL="uptime-kuma-data"
KUMA_CONTAINER="uptime-kuma"
KUMA_URL="http://localhost:${KUMA_PORT}"
BACKEND_URL=${BACKEND_URL:-"http://localhost:3000"}
FRONTEND_URL=${FRONTEND_URL:-"http://localhost:5173"}
MX_DEVNET_API="https://devnet-api.multiversx.com"
MX_MAINNET_API="https://api.multiversx.com"

# ── Checks ────────────────────────────────────────────────────────────────────
command -v docker &>/dev/null || die "Docker not found. Install Docker first."
command -v curl   &>/dev/null || die "curl not found."
command -v jq     &>/dev/null || die "jq not found. Install: apt install jq"

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  MetaShipX — Uptime Kuma Setup"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Step 1: Start or verify Uptime Kuma ──────────────────────────────────────
if docker ps --format '{{.Names}}' | grep -q "^${KUMA_CONTAINER}$"; then
  ok "Uptime Kuma already running on port ${KUMA_PORT}"
else
  info "Pulling louislam/uptime-kuma..."
  docker pull louislam/uptime-kuma:latest

  info "Starting Uptime Kuma container..."
  docker run -d \
    --name "${KUMA_CONTAINER}" \
    --restart=always \
    -p "${KUMA_PORT}:3001" \
    -v "${KUMA_DATA_VOL}:/app/data" \
    louislam/uptime-kuma:latest

  info "Waiting for Kuma to boot (up to 30s)..."
  for i in $(seq 1 30); do
    if curl -sf "${KUMA_URL}/api/entry-page" &>/dev/null; then
      ok "Uptime Kuma is up!"
      break
    fi
    sleep 1
    if [[ $i -eq 30 ]]; then
      die "Kuma did not start in 30s. Check: docker logs ${KUMA_CONTAINER}"
    fi
  done
fi

# ── Step 2: Auto-configure monitors via Kuma API ─────────────────────────────
# Note: first run requires manual admin account creation at http://localhost:3001
# After setup, export KUMA_USER and KUMA_PASS to enable auto-monitor creation.

if [[ -z "${KUMA_USER:-}" || -z "${KUMA_PASS:-}" ]]; then
  warn "KUMA_USER / KUMA_PASS not set — skipping auto-monitor creation."
  warn "Manual steps:"
  echo "  1. Open ${KUMA_URL} in your browser"
  echo "  2. Create admin account"
  echo "  3. Add monitors manually (see list below)"
  echo "  4. Re-run with: KUMA_USER=admin KUMA_PASS=yourpass ./scripts/setup-monitoring.sh"
else
  info "Logging in to Kuma API..."
  TOKEN=$(curl -sf -X POST "${KUMA_URL}/api/login/access-token" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"${KUMA_USER}\",\"password\":\"${KUMA_PASS}\"}" | jq -r '.token')
  [[ -z "$TOKEN" || "$TOKEN" == "null" ]] && die "Login failed — check KUMA_USER/KUMA_PASS"
  ok "Logged in"

  add_monitor() {
    local name="$1" url="$2" interval=${3:-60}
    local payload="{\"type\":\"http\",\"name\":\"${name}\",\"url\":\"${url}\",\"interval\":${interval},\"maxretries\":3,\"upsideDown\":false}"
    local result
    result=$(curl -sf -X POST "${KUMA_URL}/api/monitors" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H 'Content-Type: application/json' \
      -d "$payload" 2>&1)
    if echo "$result" | jq -e '.id' &>/dev/null; then
      ok "Monitor added: ${name} → ${url}"
    else
      warn "Monitor may already exist or failed: ${name}"
    fi
  }

  info "Adding monitors..."
  add_monitor "MetaShipX Frontend"         "${FRONTEND_URL}"              60
  add_monitor "MetaShipX Backend /health"  "${BACKEND_URL}/health"        30
  add_monitor "MultiversX Devnet API"       "${MX_DEVNET_API}/blocks?size=1" 60
  add_monitor "MultiversX Mainnet API"      "${MX_MAINNET_API}/blocks?size=1" 60
  add_monitor "Backend WebSocket Gateway"  "${BACKEND_URL}/events"        120
fi

# ── Step 3: Print monitor list ────────────────────────────────────────────────
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  Monitors to track (configure manually if skipped)"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
printf '  %-40s %s\n' "Name" "URL"
printf '  %-40s %s\n' "$(printf '%.0s─' {1..40})" "$(printf '%.0s─' {1..40})"
printf '  %-40s %s\n' "MetaShipX Frontend"         "${FRONTEND_URL}"
printf '  %-40s %s\n' "MetaShipX Backend /health"  "${BACKEND_URL}/health"
printf '  %-40s %s\n' "MultiversX Devnet API"       "${MX_DEVNET_API}/blocks?size=1"
printf '  %-40s %s\n' "MultiversX Mainnet API"      "${MX_MAINNET_API}/blocks?size=1"
printf '  %-40s %s\n' "Backend WebSocket Gateway"  "${BACKEND_URL}/events"
echo ""

ok "Uptime Kuma available at: ${KUMA_URL}"
info "For production: expose behind reverse proxy (nginx/Caddy) with auth."
echo ""
