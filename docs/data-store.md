---
layout: default
title: Data Store
nav_order: 10
---

# Data Store
{: .no_toc }

In-memory data store, seed data, and store API.
{: .fs-6 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Overview

The MVP uses an in-memory data store backed by JavaScript `Map` objects. All data resets on server restart. In production, this would be replaced with PostgreSQL or a similar persistent database.

---

## Entity Collections

| Collection | Key | Type | Purpose |
|:-----------|:----|:-----|:--------|
| `users` | `user_id` | `Map<string, User>` | User profiles and preferences |
| `wallets` | `wallet_id` | `Map<string, Wallet>` | Wallet balances and chain info |
| `merchants` | `merchant_id` | `Map<string, Merchant>` | Merchant profiles and wallet addresses |
| `sessions` | `session_id` | `Map<string, SessionApproval>` | Temporary approval sessions |
| `payments` | `payment_id` | `Map<string, PaymentRequest>` | Transaction records |
| `receipts` | `receipt_id` | `Map<string, Receipt>` | Payment confirmations |
| `auditLog` | --- | `AuditLogEntry[]` | Append-only event log |
| `dailySpend` | `user_id` | `Map<string, number>` | Daily spend tracking |

---

## Seed Data

### User: Alice

```typescript
{
  user_id: "usr_1",
  name: "Alice",
  default_wallet_id: "w_1",
  allowed_chains: ["base", "polygon"],
  auto_approve_limit_usd: 25,
  daily_limit_usd: 200,
  allowlisted_merchants: ["rideco", "brewhaus", "invoice_co"]
}
```

### Wallet

```typescript
{
  wallet_id: "w_1",
  type: "custodial",
  address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28",
  supported_tokens: ["USDC"],
  chain: "base",
  balance_usdc: 500.0
}
```

### Merchants

| Merchant | ID | Category | Wallet Addresses |
|:---------|:---|:---------|:-----------------|
| RideCo | `rideco` | transport | Base: `0xMerchantRideCo_Base_001`, Polygon: `0xMerchantRideCo_Polygon_001` |
| BrewHaus Coffee | `brewhaus` | food_beverage | Base: `0xMerchantBrewHaus_Base_001` |
| InvoiceCo | `invoice_co` | invoice | Base: `0xMerchantInvoiceCo_Base_001`, Polygon: `0xMerchantInvoiceCo_Polygon_001`, Ethereum: `0xMerchantInvoiceCo_Eth_001` |

---

## Store API

### User Operations

| Method | Signature | Description |
|:-------|:----------|:------------|
| `getUser` | `(id: string) → User \| undefined` | Look up user by ID |

### Wallet Operations

| Method | Signature | Description |
|:-------|:----------|:------------|
| `getWallet` | `(id: string) → Wallet \| undefined` | Look up wallet by ID |
| `getUserWallet` | `(userId: string) → Wallet \| undefined` | Get user's default wallet |
| `deductBalance` | `(walletId: string, amount: number) → boolean` | Deduct USDC, returns false if insufficient |

### Merchant Operations

| Method | Signature | Description |
|:-------|:----------|:------------|
| `getMerchant` | `(id: string) → Merchant \| undefined` | Look up by merchant ID |
| `findMerchantByName` | `(name: string) → Merchant \| undefined` | Search by name (case-insensitive, partial match) |
| `findMerchantByCategory` | `(category: string) → Merchant \| undefined` | Search by category |
| `getAllMerchants` | `() → Merchant[]` | List all merchants |

### Session Operations

| Method | Signature | Description |
|:-------|:----------|:------------|
| `getSession` | `(id: string) → SessionApproval \| undefined` | Look up session by ID |
| `getActiveSessionForUser` | `(userId: string) → SessionApproval \| undefined` | Find non-expired session for user |
| `createSession` | `(session: SessionApproval) → void` | Store a new session |
| `updateSessionSpend` | `(sessionId: string, amount: number) → void` | Add to session's spent total |

### Payment Operations

| Method | Signature | Description |
|:-------|:----------|:------------|
| `getPayment` | `(id: string) → PaymentRequest \| undefined` | Look up payment by ID |
| `savePayment` | `(payment: PaymentRequest) → void` | Store a payment record |
| `updatePaymentStatus` | `(id: string, status: string, txHash?: string) → void` | Update payment status and optional tx hash |

### Receipt Operations

| Method | Signature | Description |
|:-------|:----------|:------------|
| `getReceipt` | `(id: string) → Receipt \| undefined` | Look up receipt by ID |
| `saveReceipt` | `(receipt: Receipt) → void` | Store a receipt |
| `getUserReceipts` | `(userId: string) → Receipt[]` | Get all receipts for a user |

### Daily Spend

| Method | Signature | Description |
|:-------|:----------|:------------|
| `getDailySpend` | `(userId: string) → number` | Get today's total spend |
| `addDailySpend` | `(userId: string, amount: number) → void` | Add to daily spend total |

### Audit Log

| Method | Signature | Description |
|:-------|:----------|:------------|
| `addAuditEntry` | `(entry: AuditLogEntry) → void` | Append to audit log |
| `getAuditLog` | `(userId?: string) → AuditLogEntry[]` | Get log entries, optionally filtered by user |

---

## Audit Log Events

| Event | Trigger | Details Captured |
|:------|:--------|:----------------|
| `policy_evaluation` | Every policy check | purchase_id, merchant_id, amount, decision, reasons |
| `payment_executed` | Successful payment | payment_id, amount, chain, tx_hash |
| `receipt_created` | Receipt generation | receipt_id, payment_id, amount, chain, tx_hash, status |
| `session_created` | Session delegation | Full session object |
| `payment_denied_by_user` | User clicks Deny | purchase_id |

---

## Entity Relationships

```
User (usr_1)
  │
  ├──→ Wallet (w_1)
  │       └── balance_usdc: 500.00
  │
  ├──→ Sessions (temporary)
  │       └── merchant_scope, spend limits, expiry
  │
  ├──→ Daily Spend
  │       └── running total (resets conceptually per day)
  │
  └──→ Payments
          │
          ├── purchase_id ──→ PurchaseRequest (in-memory, orchestrator)
          ├── merchant_id ──→ Merchant
          └── payment_id  ──→ Receipt
                               └── policy_decision, policy_reasons
```
