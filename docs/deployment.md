---
layout: default
title: Deployment & Roadmap
nav_order: 13
---

# Deployment & Roadmap
{: .no_toc }

Production considerations, current limitations, and planned enhancements.
{: .fs-6 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Deployment

### Build & Run

```bash
# Production build
npm run build

# Start production server
npm start
```

The application runs as a standard Next.js server. No external databases or services are required for the MVP.

### GitHub Pages (Documentation)

This documentation site is hosted on GitHub Pages using Jekyll with the Just the Docs theme. It deploys automatically from the `docs/` directory on the `main` branch.

---

## Current MVP Limitations

| Limitation | Impact | Phase 2 Solution |
|:-----------|:-------|:-----------------|
| **Mock payments** | No real blockchain transactions | Integrate ethers.js / viem for testnet/mainnet |
| **In-memory store** | Data resets on restart | PostgreSQL with Prisma or Drizzle |
| **Rule-based parsing** | Limited natural language understanding | LLM with tool calling (Claude / GPT) |
| **Single user** | Only Alice (usr_1) | Multi-user auth with NextAuth.js |
| **Three merchants** | RideCo, BrewHaus, InvoiceCo only | Dynamic merchant onboarding |
| **No persistence** | Sessions, payments, receipts lost on restart | Database-backed storage |
| **No webhooks** | Merchants cannot receive payment notifications | Webhook delivery system |
| **No gas deduction** | Gas estimated but not deducted from balance | Real gas payment in native tokens |

---

## Security Considerations

### Current Security Model

| Property | Status | Notes |
|:---------|:-------|:------|
| Spending limits | Enforced | Static policy layer |
| Merchant allowlist | Enforced | Static policy layer |
| Chain allowlist | Enforced | Static policy layer |
| Approval gating | Enforced | Above auto-approve threshold |
| Risk detection | Enforced | Velocity, anomaly, round-number checks |
| Audit logging | Enforced | All events logged |
| API authentication | Not implemented | MVP uses hardcoded user |
| Private key management | Not applicable | Mock execution, no real keys |
| HTTPS | Not enforced | Depends on deployment platform |
| Rate limiting | Not implemented | Needed for production |

### Production Security Checklist

- [ ] Add API authentication (API keys or JWT)
- [ ] Implement rate limiting
- [ ] Enforce HTTPS
- [ ] Use HSM or secure enclave for private keys
- [ ] Add CSRF protection
- [ ] Implement request signing
- [ ] Add input sanitization beyond pattern matching
- [ ] Set up monitoring and alerting
- [ ] Regular security audits

---

## Phase 2 Roadmap

### Real Blockchain Integration

Replace mock payment execution with real on-chain transactions:

```
Current:  generateTxHash() → mock hash
Phase 2:  ethers.js/viem → real testnet transaction
```

**Components to build:**
- Chain-specific transaction builders (EVM, Solana)
- Nonce management with Redis
- Transaction confirmation polling
- Gas price oracle integration
- USDC contract interaction (ERC-20 transfer)

### LLM-Based Intent Parsing

Replace regex patterns with LLM tool calling:

```
Current:  RegExp patterns → ParsedIntent
Phase 2:  Claude/GPT with tools → ParsedIntent
```

**Benefits:**
- Handle arbitrary phrasing and context
- Multi-turn conversations
- Disambiguation ("Did you mean ride or delivery?")
- Intent confidence with explanation

### Multi-User Support

- User registration and authentication
- Per-user wallet management
- Role-based access control
- User-specific policy configuration

### Persistent Storage

Replace in-memory maps with PostgreSQL:

| Collection | Table |
|:-----------|:------|
| `users` | `users` |
| `wallets` | `wallets` |
| `merchants` | `merchants` |
| `sessions` | `session_approvals` |
| `payments` | `payments` |
| `receipts` | `receipts` |
| `auditLog` | `audit_log` |
| `dailySpend` | `daily_spend` |

### Smart Contract Wallet Integration

- Session key delegation via ERC-4337
- On-chain spending policies
- Multi-sig approval for high-value transactions
- Gasless transactions via paymasters

### Additional Merchant Integrations

- Dynamic merchant onboarding API
- Merchant webhook delivery
- Settlement and reconciliation
- Dispute handling

### Enhanced Risk Scoring

- Machine learning-based anomaly detection
- Cross-merchant pattern analysis
- Geolocation-based risk signals
- Device fingerprinting
- Behavioral biometrics

### Monitoring & Observability

| Component | Recommended Tool |
|:----------|:----------------|
| Metrics | Prometheus + Grafana |
| Logging | ELK Stack (Elasticsearch, Logstash, Kibana) |
| Alerting | PagerDuty or Opsgenie |
| Tracing | OpenTelemetry |
| Error tracking | Sentry |

### Key Metrics to Track

| Metric | Alert Threshold |
|:-------|:---------------|
| Payment success rate | < 95% |
| Policy evaluation latency | > 100ms |
| Chain selection latency | > 50ms |
| API response time (p99) | > 2s |
| Daily spend utilization | > 90% for any user |
| Failed simulation rate | > 5% |

---

## Scaling Considerations

| Component | Scales Horizontally? | Notes |
|:----------|:--------------------|:------|
| Next.js API | Yes | Stateless request handling |
| In-memory store | No | Must be replaced with shared database |
| Policy engine | Yes | Pure functions, no shared state |
| Chain selector | Yes | Pure functions, no shared state |
| Simulator | Yes | Stateless validation |
| Intent parser | Yes | Stateless parsing |

### Bottlenecks

1. **In-memory store**: Single process, single server. First thing to replace.
2. **Pending purchases map**: In-memory, lost on restart. Move to Redis or database.
3. **Daily spend tracking**: In-memory counter. Move to database with time-windowed queries.
