# Wallet Setup for MetaShipX

This directory holds the deployer wallet PEM file (gitignored) and configuration.

## Quick Start

### 1. Generate a devnet wallet

```bash
bash scripts/generate-devnet-wallet.sh
```

This will:
- Generate a new PEM wallet at `wallet/deployer.pem`
- Print the bech32 address
- Open the MultiversX devnet faucet URL

### 2. Fund the wallet

Visit the faucet link printed by the script or go to:
https://devnet-wallet.multiversx.com/faucet

Request **at least 1 EGLD** (needed for contract deploys + `registerShipCollection` fee).

### 3. Deploy

```bash
# Deploy all contracts in order
bash scripts/deploy-nft.sh
bash scripts/deploy-staking.sh
bash scripts/deploy-battleship.sh
bash scripts/deploy-tournament.sh
```

### 4. Copy addresses to .env

Each deploy script appends the contract address to `.env` automatically.

## Security

- `wallet/deployer.pem` is in `.gitignore` — **never commit it**
- Use a dedicated deployer wallet, not your personal wallet
- For mainnet, use a hardware wallet or multisig
