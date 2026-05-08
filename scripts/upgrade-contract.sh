#!/usr/bin/env bash
# Usage: ./scripts/upgrade-contract.sh <contract_name> <address>
# Example: ./scripts/upgrade-contract.sh battleship erd1...
set -euo pipefail

CONTRACT=$1
ADDRESS=$2
PROXY="https://devnet-gateway.multiversx.com"
CHAIN="D"
WALLET="./wallet/deployer.pem"

echo "[upgrade] Building $CONTRACT..."
mxpy contract build contracts/$CONTRACT

echo "[upgrade] Upgrading $CONTRACT at $ADDRESS..."
mxpy contract upgrade $ADDRESS \
  --bytecode contracts/$CONTRACT/output/$CONTRACT.wasm \
  --proxy $PROXY \
  --chain $CHAIN \
  --pem $WALLET \
  --gas-limit 60000000 \
  --recall-nonce \
  --send

echo "[ok] $CONTRACT upgraded successfully"
