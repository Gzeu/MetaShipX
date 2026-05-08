# Security Policy

## Supported Versions

| Version | Supported |
|---------|----------|
| devnet | ✅ |
| testnet | ✅ (when deployed) |
| mainnet | ✅ (when deployed) |

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Instead, report security issues privately:

1. Go to [Security Advisories](https://github.com/Gzeu/MetaShipX/security/advisories/new)
2. Describe the vulnerability in detail
3. Include steps to reproduce
4. Include potential impact

We will acknowledge your report within **48 hours** and provide a fix timeline within **7 days**.

## Smart Contract Security

MetaShipX smart contracts handle real EGLD. Before mainnet deployment:

- [ ] Internal audit of all contract endpoints
- [ ] Formal verification of financial logic
- [ ] External audit by a recognized MultiversX security firm
- [ ] Bug bounty program

## Known Security Considerations

- **Wallet keys**: Never commit `.pem` files. See `.gitignore`.
- **Environment variables**: Never hardcode contract addresses in source. Use `.env.local`.
- **Frontend**: All transactions are signed client-side. The backend is read-only.
- **Reentrancy**: MultiversX contracts are not susceptible to EVM-style reentrancy, but async callbacks are audited.

## Responsible Disclosure

We are committed to working with security researchers. Reporters of valid vulnerabilities will be credited in release notes (unless they prefer anonymity).
