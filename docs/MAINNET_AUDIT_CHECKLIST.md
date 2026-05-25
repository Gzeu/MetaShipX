# MetaShipX — Mainnet Audit Checklist

Status as of v0.9.0. All items must be ✅ before mainnet deploy.

## Smart Contracts — Security

| # | Item | Status | Fixed in |
|---|------|--------|----------|
| 1 | Staking: state-before-send in claimRewards | ✅ Done | v0.8.0 |
| 2 | Staking: APR hard cap 10000 bps | ✅ Done | v0.8.0 |
| 3 | Marketplace: listing.active=false BEFORE sends | ✅ Done | v0.8.0 |
| 4 | Marketplace: re-list guard (same nonce) | ✅ Done | v0.8.0 |
| 5 | Marketplace: getActiveListings paginated view | ✅ Done | v0.8.0 |
| 6 | NFT: upgradeShip overflow-safe cost (saturating_mul) | ✅ Done | v0.8.0 |
| 7 | NFT: max level 10 hard cap | ✅ Done | v0.8.0 |
| 8 | NFT: registerCollection once-guard | ✅ Done | v0.8.0 |
| 9 | NFT: burnShip validates caller == owner | ✅ Done | v0.8.0 |
| 10 | Battleship: wager=0 guard in createGame | ✅ Done | v0.8.0 |
| 11 | Battleship: attack OOB (row/col > 9) guard | ✅ Done | v0.8.0 |
| 12 | Tournament: reportMatchResult caller == battleship | ✅ Done | v0.4.0 |
| 13 | All contracts: no private keys / mnemonics in storage | ✅ N/A | by design |
| 14 | External audit (Arda Security or equivalent) | ⏳ Pending | v1.0.0 — brief ready: docs/AUDIT_BRIEF.md |

## Backend — Security

| # | Item | Status | Fixed in |
|---|------|--------|----------|
| 15 | SESSION_SECRET >= 32 chars validated at startup | ✅ Done | v0.8.0 |
| 16 | ADMIN_SECRET >= 16 chars validated in production | ✅ Done | v0.8.0 |
| 17 | MX_WEBHOOK_PUBKEY required in production | ✅ Done | v0.8.0 |
| 18 | Webhook signature verification (X-Signature header) | ✅ Done | v0.8.0 |
| 19 | CORS explicit whitelist (no wildcard in production) | ✅ Done | v0.8.0 |
| 20 | httpOnly: true on session cookie | ✅ Done | v0.8.0 |
| 21 | Docker: non-root user (node) | ✅ Done | v0.8.0 |
| 22 | Docker: cap_drop ALL + no-new-privileges | ✅ Done | v0.8.0 |
| 23 | Docker: health checks on all services | ✅ Done | v0.8.0 |
| 24 | PostgreSQL SSL in production (sslmode=require) | ⏳ Pending | add ?sslmode=require to DATABASE_URL |
| 25 | ThrottlerModule active (3 req/s global) | ✅ Done | v0.5.0 |
| 26 | Rate limit: 1 attack/2s per player | ✅ Done | v0.5.0 |

## Frontend — Security

| # | Item | Status | Fixed in |
|---|------|--------|----------|
| 27 | config.ts fail-fast requireEnv() | ✅ Done | v0.5.0 |
| 28 | No contract addresses hardcoded | ✅ Done | v0.3.0 |
| 29 | No private keys in frontend code | ✅ N/A | by design |
| 30 | tx pending state blocks duplicate clicks | ✅ Done | v0.5.0 |

## Infrastructure

| # | Item | Status | Fixed in |
|---|------|--------|----------|
| 31 | .env*.local in .gitignore | ✅ Done | v0.1.0 |
| 32 | No secrets in git history | ⏳ Verify locally | run: git log --all -p \| grep -iE "mnemonic\|private_key\|PEM\|SECRET=" |
| 33 | CI: contract build on every push to contracts/ | ✅ Done | v0.5.0 |
| 34 | CI: E2E tests on frontend/backend changes | ✅ Done | v0.5.0 |
| 35 | Devnet smoke test script | ✅ Done | v0.8.0 |
| 36 | mainnet-deploy.sh with double-confirm | ✅ Done | v0.5.0 |
| 37 | Deployed addresses persisted to JSON | ✅ Done | v0.5.0 |
| 38 | Reward pool >= 50 EGLD before launch | ⏳ Pending | at deploy time |
| 39 | Uptime monitoring (Uptime Kuma / Grafana) | ⏳ Pending | pre-launch |
| 40 | Sentry error tracking frontend + backend | ✅ Done | v0.9.0 |
| 41 | Branch protection on main | ⏳ Set manually | GitHub → Settings → Branches → Add ruleset: require PR + status checks |

## Testing

| # | Item | Status | Fixed in |
|---|------|--------|----------|
| 42 | E2E: game-flow (create/join/place/attack/win) | ✅ Done | v0.5.0 |
| 43 | E2E: marketplace (list/buy/cancel) | ✅ Done | v0.5.0 |
| 44 | E2E: staking (stake/claim/unstake) | ✅ Done | v0.5.0 |
| 45 | E2E: practice mode full flow | ✅ Done | v0.8.0 |
| 46 | E2E: leaderboard renders + responsive | ✅ Done | v0.8.0 |
| 47 | Unit tests: all 6 contracts (min 1 per critical endpoint) | ✅ Done | v0.8.0 |
| 48 | Devnet smoke test: all 6 contracts respond | ✅ Done | v0.8.0 |

## Pre-Mainnet Final Steps

```bash
# 1. Verify no secrets in history (LOCAL — never push output)
git log --all -p | grep -iE "mnemonic|private_key|PEM|secret" | grep -v SESSION_SECRET

# 2. Deploy to devnet
./scripts/mainnet-deploy.sh CHAIN=devnet

# 3. Run smoke tests
./scripts/devnet-smoke-test.sh

# 4. Fund reward pool (min 50 EGLD)
mxpy contract call $STAKING_ADDRESS --function fundRewardPool \
  --value 50000000000000000000 --pem owner.pem --proxy https://devnet-api.multiversx.com

# 5. Run E2E suite against devnet
npx playwright test

# 6. Deploy to testnet
./scripts/mainnet-deploy.sh CHAIN=testnet

# 7. External audit — submit docs/AUDIT_BRIEF.md to Arda Security
# Contact: https://ardasecurity.io or equivalent MultiversX-familiar firm

# 8. Mainnet deploy (after audit clearance)
./scripts/mainnet-deploy.sh CHAIN=mainnet
# Requires typing: deploy mainnet
```
