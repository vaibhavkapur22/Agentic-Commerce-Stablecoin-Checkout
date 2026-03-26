---
layout: default
title: Configuration
nav_order: 12
---

# Configuration
{: .no_toc }

Application settings, user defaults, and development setup.
{: .fs-6 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Application Configuration

### Next.js Configuration

**File:** `next.config.mjs`

```javascript
const nextConfig = {};
export default nextConfig;
```

The application uses default Next.js 14 settings with the App Router.

### TypeScript Configuration

**File:** `tsconfig.json`

| Setting | Value |
|:--------|:------|
| Target | ES2017 |
| Module | ESNext |
| Strict mode | Enabled |
| Path alias | `@/*` → `./src/*` |
| JSX | preserve |
| Lib | DOM, DOM.Iterable, ESNext |

### Tailwind Configuration

**File:** `tailwind.config.ts`

Content scanning includes all files in `src/`:
```
"./src/**/*.{js,ts,jsx,tsx,mdx}"
```

### ESLint Configuration

**File:** `.eslintrc.json`

Extends `next/core-web-vitals` with TypeScript support. Allows unused variables prefixed with underscore (`_`).

---

## User Defaults

The default user (Alice) is configured in `src/lib/store/index.ts`:

| Parameter | Default | Description |
|:----------|:--------|:------------|
| `user_id` | `usr_1` | User identifier |
| `name` | Alice | Display name |
| `default_wallet_id` | `w_1` | Associated wallet |
| `allowed_chains` | `["base", "polygon"]` | Chains user can transact on |
| `auto_approve_limit_usd` | `25` | Payments under this amount auto-approve |
| `daily_limit_usd` | `200` | Maximum daily spend |
| `allowlisted_merchants` | `["rideco", "brewhaus", "invoice_co"]` | Approved merchants |

---

## Wallet Defaults

| Parameter | Default | Description |
|:----------|:--------|:------------|
| `wallet_id` | `w_1` | Wallet identifier |
| `type` | `custodial` | Wallet type |
| `address` | `0x742d35Cc...` | Wallet address |
| `supported_tokens` | `["USDC"]` | Supported tokens |
| `chain` | `base` | Primary chain |
| `balance_usdc` | `500.00` | Starting balance |

---

## Chain Configuration

Chain statistics are configured in `src/lib/payment/chain-selector.ts`:

| Chain | Fee (USD) | Latency (sec) | Reliability | Composite Score |
|:------|:----------|:-------------|:-----------|:---------------|
| Base | $0.01 | 2 | 0.99 | 0.364 |
| Polygon | $0.02 | 3 | 0.98 | 0.698 |
| Solana | $0.005 | 1 | 0.97 | 0.932 |
| Ethereum | $2.50 | 15 | 0.999 | 1.480 |

### Scoring Weights

| Factor | Weight |
|:-------|:-------|
| Fee | 40% (`fee × 0.4`) |
| Latency | 30% (`latency × 0.03`) |
| Reliability | 30% (`(1 - reliability) × 100 × 0.3`) |

---

## Risk Policy Thresholds

Configured in `src/lib/policy/risk-policy.ts`:

| Parameter | Value | Description |
|:----------|:------|:------------|
| Velocity threshold | 70% of daily limit | Triggers velocity risk signal |
| Amount anomaly threshold | 3x auto-approve limit | Triggers anomaly risk signal |
| Round number threshold | >= $100 and divisible by $50 | Triggers round-number signal |
| Velocity score | +0.30 | Score contribution per signal |
| Anomaly score | +0.30 | Score contribution per signal |
| Round number score | +0.10 | Score contribution per signal |
| ALLOW_WITH_LOG threshold | >= 0.30 | Moderate risk |
| REQUIRE_APPROVAL threshold | >= 0.80 | High risk |

---

## Merchant Configuration

### Quote Expiry Times

| Merchant | Quote Validity |
|:---------|:--------------|
| RideCo | 5 minutes |
| BrewHaus Coffee | 10 minutes |
| InvoiceCo | 30 minutes |

### BrewHaus Menu Prices

| Item | Price (USD) |
|:-----|:-----------|
| Coffee | $5.50 |
| Latte | $6.50 |
| Espresso | $4.00 |
| Cappuccino | $6.00 |
| Mocha | $7.00 |
| Tea | $4.50 |
| Default | $5.50 |

### RideCo Price Range

| Parameter | Value |
|:----------|:------|
| Minimum | $35.00 |
| Maximum | $60.00 |
| Distribution | Uniform random |

---

## Development Setup

### Prerequisites

```bash
node --version   # v18+
npm --version    # v9+
```

### Start Development Server

```bash
npm install
npm run dev
```

The development server starts at `http://localhost:3000` with hot reload enabled.

### Build for Production

```bash
npm run build
npm start
```

### Lint

```bash
npm run lint
```

---

## Dependencies

### Runtime

| Package | Version | Purpose |
|:--------|:--------|:--------|
| `next` | 14.2.35 | React framework |
| `react` | ^18 | UI library |
| `react-dom` | ^18 | DOM rendering |

### Development

| Package | Version | Purpose |
|:--------|:--------|:--------|
| `typescript` | ^5 | Type checking |
| `@types/node` | ^20 | Node.js types |
| `@types/react` | ^18 | React types |
| `@types/react-dom` | ^18 | React DOM types |
| `tailwindcss` | ^3.4.1 | Utility CSS |
| `postcss` | ^8 | CSS processing |
| `eslint` | ^8 | Linting |
| `eslint-config-next` | 14.2.35 | Next.js lint rules |
