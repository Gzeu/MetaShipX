#!/usr/bin/env bash
# check-git-secrets.sh — MetaShipX local secret scanner (#32 audit item)
# Scans git history for accidentally committed secrets/keys/mnemonics.
# Safe: read-only, no network, no side effects.
# Usage: ./scripts/check-git-secrets.sh
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
ok()  { echo -e "${GREEN}✅ $*${NC}"; }
warn(){ echo -e "${YELLOW}⚠️  $*${NC}"; }
die() { echo -e "${RED}❌ CRITICAL: $*${NC}"; }
info(){ echo -e "${CYAN}ℹ️  $*${NC}"; }

echo ""
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  MetaShipX — Git History Secret Scanner"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

FOUND=0
OUTPUT_FILE="/tmp/metashipx-secret-scan-$(date +%s).txt"

# ── Pattern list ──────────────────────────────────────────────────────────────
declare -A PATTERNS=(
  ["Mnemonic/seed phrase"]="\\b(mnemonic|seed_phrase|seedPhrase|seed phrase)\\b"
  ["Private key"]="\\b(private_key|privateKey|privKey|priv_key)\\b"
  ["PEM file content"]="-----BEGIN (PRIVATE|ENCRYPTED)"
  ["Raw hex private key (64 chars)"]="['\"][0-9a-fA-F]{64}['\"]"
  ["API key pattern"]="(api_key|API_KEY|apiKey)\\s*[=:]\\s*['\"][^'\"]{16,}"
  ["Secret/password in assignment"]="(SECRET|PASSWORD|PASSWD)\\s*=\\s*['\"][^'\"]{8,}"
  ["MultiversX wallet address hardcoded"]="erd1[0-9a-z]{58}"
  ["Bearer token"]="Bearer\\s+[A-Za-z0-9\\-._~+/]{20,}"
  ["AWS key prefix"]="AKIA[0-9A-Z]{16}"
)

info "Scanning all commits and all branches..."
info "This may take 10-30 seconds on large repos.\n"

for label in "${!PATTERNS[@]}"; do
  pattern="${PATTERNS[$label]}"
  info "Checking: ${label}..."

  # Search staged/working tree first (fast)
  STAGED=$(git grep -rn -E "$pattern" -- ':!*.sh' ':!*.md' 2>/dev/null | grep -v 'example\|placeholder\|YOUR_' || true)

  # Search full git history
  HISTORY=$(git log --all -p --no-merges 2>/dev/null \
    | grep -E "^\+" \
    | grep -v "^\+\+\+" \
    | grep -iE "$pattern" \
    | grep -v 'example\|placeholder\|YOUR_\|change-me\|CHANGE_ME\|<.*>\|#.*secret' \
    || true)

  if [[ -n "$STAGED" || -n "$HISTORY" ]]; then
    die "FOUND: ${label}"
    FOUND=$((FOUND + 1))
    echo "" >> "$OUTPUT_FILE"
    echo "=== ${label} ==="  >> "$OUTPUT_FILE"
    [[ -n "$STAGED"  ]] && echo "[Working tree]" >> "$OUTPUT_FILE" && echo "$STAGED" >> "$OUTPUT_FILE"
    [[ -n "$HISTORY" ]] && echo "[Git history]"  >> "$OUTPUT_FILE" && echo "$HISTORY" >> "$OUTPUT_FILE"
  fi
done

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [[ $FOUND -eq 0 ]]; then
  ok "No secrets detected in git history or working tree."
  ok "Audit item #32 — PASS"
else
  die "${FOUND} secret pattern(s) found!"
  echo ""
  warn "Full report saved to: ${OUTPUT_FILE}"
  echo ""
  echo -e "${BOLD}Remediation steps:${NC}"
  echo "  1. Rotate ALL exposed keys/secrets immediately"
  echo "  2. Remove from history:"
  echo "       pip install git-filter-repo"
  echo "       git filter-repo --path path/to/secret/file --invert-paths"
  echo "  3. Force push: git push --force --all"
  echo "  4. Notify all collaborators to re-clone"
  echo "  5. Check if secret was ever pushed to GitHub:"
  echo "       gh secret list  # if using GitHub Secrets"
  echo ""
  echo -e "${RED}DO NOT deploy to mainnet until all items are resolved.${NC}"
  exit 1
fi
echo ""
