#!/usr/bin/env bash
# ============================================================
# generate-devnet-wallet.sh
# Generates a new MultiversX PEM wallet for devnet deployment.
# Usage: bash scripts/generate-devnet-wallet.sh
# ============================================================
set -euo pipefail

WALLET_DIR="./wallet"
PEM_FILE="$WALLET_DIR/deployer.pem"

mkdir -p "$WALLET_DIR"

# Check mxpy
if ! command -v mxpy &> /dev/null; then
  echo "❌  mxpy not found. Install with: pip install multiversx-sdk-cli"
  exit 1
fi

# Guard against overwriting
if [ -f "$PEM_FILE" ]; then
  echo "⚠️   Wallet already exists at $PEM_FILE"
  read -rp "Overwrite? (y/N): " confirm
  [[ "$confirm" == [yY] ]] || { echo "Aborted."; exit 0; }
fi

echo "🔑  Generating new wallet..."
mxpy wallet new --format pem --outfile "$PEM_FILE"

# Extract and display the bech32 address
ADDRESS=$(mxpy wallet convert --infile "$PEM_FILE" --in-format pem --out-format address-bech32 2>/dev/null || echo "unknown")

echo ""
echo "✅  Wallet created: $PEM_FILE"
echo "📋  Address: $ADDRESS"
echo ""
echo "💧  Fund this wallet with devnet EGLD:"
echo "    https://devnet-wallet.multiversx.com/faucet"
echo "    (request at least 1 EGLD)"
echo ""
echo "⚠️   NEVER commit wallet/deployer.pem to git!"
