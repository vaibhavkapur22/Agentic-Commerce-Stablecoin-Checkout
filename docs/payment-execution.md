---
layout: default
title: Payment Execution
nav_order: 9
---

# Payment Execution
{: .no_toc }

Transaction simulation, mock execution, balance tracking, and receipt generation.
{: .fs-6 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Overview

The payment execution layer handles everything after the policy engine approves a transaction: chain selection, pre-flight simulation, mock execution, balance updates, and receipt generation.

```
Policy: ALLOW / ALLOW_WITH_LOG / User Approved
    │
    ▼
┌──────────────────────┐
│   Select Chain       │ ── No compatible chain ──→ Error
│   (chain-selector)   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Simulate Payment   │ ── Simulation fails ─────→ Error
│   (simulator)        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Create Payment     │
│   Record (pending)   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Submit Transaction │
│   (mock tx hash)     │
│   Status: submitted  │
└──────────┬───────────┘
           │
       ~500ms delay
           │
           ▼
┌──────────────────────┐
│   Confirm            │
│   Status: confirmed  │
│   Update balance     │
│   Update daily spend │
│   Update session     │
│   Write audit log    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Generate Receipt   │
└──────────────────────┘
```

---

## Transaction Simulation

Before executing, the simulator runs pre-flight checks to verify the transaction would succeed.

### Checks

| Check | Failure Condition | Result |
|:------|:-----------------|:-------|
| **Balance** | `wallet.balance_usdc < amount_usd` | Fail: "Insufficient USDC balance" |
| **Gas coverage** | `wallet.balance_usdc < amount_usd + gas` | Warning (non-fatal) |
| **Recipient** | Address is empty or zero address | Fail: "Invalid recipient address" |

### Gas Estimates

| Chain | Gas Estimate (USD) |
|:------|:------------------|
| Base | $0.01 |
| Polygon | $0.02 |
| Solana | $0.005 |
| Ethereum | $2.50 |

### SimulationResult

```typescript
interface SimulationResult {
  success: boolean;
  estimated_gas_usd: number;
  total_cost_usd: number;       // amount + gas
  warnings: string[];
}
```

---

## Mock Execution

In the MVP, transaction execution is simulated. A realistic-looking transaction hash is generated and balance is deducted in-memory.

### Transaction Hash Generation

```typescript
function generateTxHash(chain: Chain): string {
  const hex = Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
  return `0x${hex}`;
}
```

Produces hashes like: `0x7a3b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b`

### Execution Sequence

1. **Create payment record** with status `pending`
2. **Select chain** using the scoring algorithm
3. **Run simulation** to validate the transaction
4. **Update status** to `simulated` (if simulation passes)
5. **Update status** to `submitted`
6. **Wait 500ms** (simulated processing delay)
7. **Generate tx hash** and **update status** to `confirmed`
8. **Deduct balance** from wallet
9. **Add daily spend** for the user
10. **Update session spend** if an active session exists
11. **Write audit log** entry

---

## Payment Record

```typescript
interface PaymentRequest {
  payment_id: string;           // "pay_{timestamp}"
  user_id: string;
  merchant_id: string;
  purchase_id: string;
  amount_usd: number;
  token: Token;                 // "USDC"
  chain: Chain;
  from_wallet: string;
  to_wallet: string;
  status: "pending" | "simulated" | "submitted" | "confirmed" | "failed";
  tx_hash?: string;
  created_at: string;
  confirmed_at?: string;
}
```

---

## Balance Updates

On successful payment confirmation:

| Update | Operation |
|:-------|:----------|
| Wallet balance | `balance -= amount_usd` |
| Daily spend | `daily_spend += amount_usd` |
| Session spend | `session.spent_usd += amount_usd` (if session active) |

{: .note }
Gas fees are **not** deducted from the wallet balance in the MVP. They are estimated for display purposes only. In production with real blockchain transactions, gas would be paid in the chain's native token.

---

## Receipt Generation

After successful payment, a receipt is generated and stored.

### Receipt Structure

```typescript
interface Receipt {
  receipt_id: string;            // "rcpt_{timestamp}"
  payment_id: string;
  purchase_id: string;
  merchant_id: string;
  merchant_name: string;
  amount_usd: number;
  token: Token;
  chain: Chain;
  tx_hash: string;
  status: "confirmed" | "failed";
  policy_decision: PolicyDecision;
  policy_reasons: string[];
  user_approved: boolean;
  created_at: string;
}
```

### Receipt Display

Receipts are formatted as a Markdown table in the chat:

```
**Payment Confirmed!**

| Field | Value |
|-------|-------|
| Receipt ID | `rcpt_1711234567890` |
| Merchant | BrewHaus Coffee |
| Amount | $6.50 USDC |
| Chain | base |
| Tx Hash | `0x7a3b2c1d4e5f6a...` |
| Status | confirmed |
| Policy | ALLOW |
| Approved by user | Auto-approved |
```

### Audit Trail

The receipt generator creates an audit log entry:

```typescript
{
  event: "receipt_created",
  user_id: "usr_1",
  details: {
    receipt_id: "rcpt_1711234567890",
    payment_id: "pay_1711234567890",
    amount_usd: 6.50,
    chain: "base",
    tx_hash: "0x7a3b...",
    status: "confirmed"
  }
}
```

---

## Error Handling

| Error | Cause | Recovery |
|:------|:------|:---------|
| User/wallet not found | Invalid user_id | Payment fails immediately |
| Chain selection failed | No compatible chain | Payment record created with status `failed` |
| Simulation failed | Balance too low or invalid recipient | Payment record saved with status `failed` |
| Execution error | Unexpected error during mock execution | Error propagated to orchestrator |

All failures are recorded in the payment store with status `failed` for audit purposes.
