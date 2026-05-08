# Contributing to MetaShipX

Thank you for your interest in contributing!

## Development Setup

```bash
# Clone
git clone https://github.com/Gzeu/MetaShipX.git
cd MetaShipX

# Frontend
cd frontend && npm install && cp .env.example .env.local
npm run dev

# Backend (separate terminal)
cd backend && npm install && cp .env.example .env
npm run dev
```

## Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/short-description` | `feat/spectator-mode` |
| Bug fix | `fix/short-description` | `fix/game-id-overflow` |
| Contract | `contract/short-description` | `contract/staking-apr` |
| Docs | `docs/short-description` | `docs/deploy-guide` |

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add tournament bracket display
fix: correct EGLD denomination in staking hook
contract: add slashing mechanism to staking
test: add tournament prize distribution tests
docs: update deploy-devnet.sh instructions
```

## Smart Contract Changes

1. Modify the Rust source in `contracts/<name>/src/lib.rs`
2. Run `mxpy contract build contracts/<name>` to verify it compiles
3. Update the TypeScript types in `frontend/src/types/contracts.ts`
4. Add or update tests in `tests/`
5. Describe the ABI change in your PR description

⚠️ **Breaking storage layout changes require a migration plan.**

## Running Tests

```bash
# Unit tests
npx ts-mocha tests/**/*.test.ts

# TypeScript check
cd frontend && npx tsc --noEmit
cd backend && npx tsc --noEmit
```

## Code Style

- **TypeScript**: strict mode, no `any`
- **Rust**: `cargo fmt` + `cargo clippy -- -D warnings`
- **Components**: functional, hooks-based, no class components
- **Naming**: `camelCase` for variables/functions, `PascalCase` for components/types

## Security

Please **do not** open public issues for security vulnerabilities.
See [SECURITY.md](./SECURITY.md) instead.
