---
layout: default
title: Policy Engine
nav_order: 6
---

# Policy Engine
{: .no_toc }

Three-layer policy evaluation with composite decision logic.
{: .fs-6 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Overview

The policy engine is the trust boundary between AI decision-making and payment execution. It evaluates three independent policy layers in sequence and composes a final decision using a **most-restrictive-wins** rule.

```
PurchaseRequest
    │
    ▼
┌──────────────────┐
│  Static Policy   │ ── DENY? ──→ Return immediately
│  (Hard Rules)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Session Policy  │
│  (Delegation)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Risk Policy     │
│  (Heuristics)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Compose Final   │
│  Decision        │
│                  │
│  Most restrictive│
│  decision wins   │
└──────────────────┘
```

---

## Decision Types

| Decision | Meaning | Action |
|:---------|:--------|:-------|
| `ALLOW` | Payment passes all checks | Execute immediately |
| `ALLOW_WITH_LOG` | Payment allowed but flagged for monitoring | Execute + log extra audit entry |
| `REQUIRE_APPROVAL` | Payment needs explicit user confirmation | Prompt user in chat |
| `DENY` | Payment blocked | Reject with reason |

### Decision Priority

```
DENY > REQUIRE_APPROVAL > ALLOW_WITH_LOG > ALLOW
```

If any layer returns `DENY`, the final decision is `DENY`. If any layer returns `REQUIRE_APPROVAL` (and none returns `DENY`), the final decision is `REQUIRE_APPROVAL`, and so on.

---

## Layer 1: Static Policy

Hard rules based on user configuration. Evaluated first because a `DENY` here short-circuits the entire evaluation.

### Checks (in order)

| # | Check | On Failure |
|:--|:------|:-----------|
| 1 | Merchant is in user's allowlist | `DENY: merchant_not_allowlisted` |
| 2 | At least one chain in common between merchant and user | `DENY: no_allowed_chain_available` |
| 3 | Daily spend + purchase amount within daily limit | `DENY: daily_limit_exceeded` |
| 4 | Amount within auto-approve threshold | `REQUIRE_APPROVAL: amount_above_auto_approve_limit` |
| 5 | Wallet balance sufficient | `DENY: insufficient_wallet_balance` |

### Configuration (Alice defaults)

| Parameter | Value |
|:----------|:------|
| `auto_approve_limit_usd` | $25.00 |
| `daily_limit_usd` | $200.00 |
| `allowed_chains` | Base, Polygon |
| `allowlisted_merchants` | rideco, brewhaus, invoice_co |

### Example Evaluations

**$6.50 latte from BrewHaus:**
- Merchant allowlisted? Yes
- Chain compatible? Yes (Base)
- Under daily limit? Yes ($6.50 < $200)
- Under auto-approve? Yes ($6.50 < $25)
- Balance sufficient? Yes
- Result: `ALLOW`

**$50 ride from RideCo:**
- Merchant allowlisted? Yes
- Chain compatible? Yes (Base, Polygon)
- Under daily limit? Yes ($50 < $200)
- Under auto-approve? No ($50 > $25)
- Result: `REQUIRE_APPROVAL`

**Payment to unknown merchant:**
- Merchant allowlisted? No
- Result: `DENY`

---

## Layer 2: Session Policy

Evaluates temporary delegated permissions created via session commands like "For the next 1 hour, allow rides under $60".

### Checks (in order)

| # | Check | On Failure |
|:--|:------|:-----------|
| 1 | Active session exists | Pass through (no contribution) |
| 2 | Session not expired | `REQUIRE_APPROVAL: session_expired` |
| 3 | Merchant/category in session scope | `REQUIRE_APPROVAL: merchant_outside_session_scope` |
| 4 | Amount within single transaction limit | `REQUIRE_APPROVAL: amount_exceeds_session_txn_limit` |
| 5 | Session total spend not exceeded | `REQUIRE_APPROVAL: session_spend_limit_would_be_exceeded` |

### Session Structure

```typescript
interface SessionApproval {
  session_id: string;
  user_id: string;
  merchant_scope: string[];      // Merchant IDs or categories
  max_spend_usd: number;         // Total session budget
  single_txn_limit_usd: number;  // Per-transaction limit
  spent_usd: number;             // Running total
  expires_at: string;            // ISO timestamp
  created_at: string;
}
```

### Session Creation Examples

| Command | Scope | Max Spend | Duration |
|:--------|:------|:----------|:---------|
| "Allow rides under $60 for 1 hour" | rideco, transport | $60 | 1 hour |
| "Allow coffee under $20 for 2 hours" | brewhaus, food_beverage | $20 | 2 hours |
| "Allow spending under $100" | rideco, brewhaus, invoice_co | $100 | 1 hour (default) |

### Behavior When No Session Exists

If no active session is found, the session policy returns `ALLOW` with reason `no_active_session`. This means it doesn't block the payment but also doesn't contribute an auto-approval. The static policy's auto-approve threshold still governs.

---

## Layer 3: Risk Policy

Dynamic heuristic checks that flag unusual patterns without hard-blocking payments.

### Risk Signals

| Signal | Trigger | Score Contribution |
|:-------|:--------|:-------------------|
| **Velocity** | Daily spend > 70% of daily limit | +0.30 |
| **Amount anomaly** | Amount > 3x auto-approve limit ($75) | +0.30 |
| **Round number** | Amount >= $100 and divisible by $50 | +0.10 |

### Risk Score Thresholds

| Score Range | Decision |
|:------------|:---------|
| 0.0 -- 0.29 | `ALLOW` |
| 0.3 -- 0.79 | `ALLOW_WITH_LOG` |
| 0.8 -- 1.0 | `REQUIRE_APPROVAL` |

### Example Calculations

**$6.50 latte, no prior spend:**
- Velocity: $0 / $200 = 0% (< 70%) → 0
- Amount: $6.50 < $75 → 0
- Round: $6.50 not round → 0
- Score: **0.0** → `ALLOW`

**$150 invoice, $150 already spent today:**
- Velocity: $150 / $200 = 75% (> 70%) → +0.30
- Amount: $150 > $75 → +0.30
- Round: $150 >= $100 and $150 % $50 = 0 → +0.10
- Score: **0.70** → `ALLOW_WITH_LOG`

**$200 payment, $180 already spent today:**
- Velocity: $180 / $200 = 90% (> 70%) → +0.30
- Amount: $200 > $75 → +0.30
- Round: $200 >= $100 and $200 % $50 = 0 → +0.10
- Would exceed daily limit → `DENY` from static policy (never reaches risk)

---

## Composite Decision Logic

The policy engine collects decisions from all three layers and applies the most restrictive:

```typescript
function composeFinalDecision(decisions: PolicyDecision[]): PolicyDecision {
  if (decisions.includes("DENY"))              return "DENY";
  if (decisions.includes("REQUIRE_APPROVAL"))  return "REQUIRE_APPROVAL";
  if (decisions.includes("ALLOW_WITH_LOG"))    return "ALLOW_WITH_LOG";
  return "ALLOW";
}
```

### Worked Example: $47.30 Ride

| Layer | Decision | Reasons |
|:------|:---------|:--------|
| Static | `REQUIRE_APPROVAL` | amount_above_auto_approve_limit ($47.30 > $25) |
| Session | `ALLOW` | no_active_session |
| Risk | `ALLOW` | risk_check_passed |
| **Final** | **`REQUIRE_APPROVAL`** | Most restrictive wins |

### Worked Example: $6.50 Latte

| Layer | Decision | Reasons |
|:------|:---------|:--------|
| Static | `ALLOW` | static_policy_passed |
| Session | `ALLOW` | no_active_session |
| Risk | `ALLOW` | risk_check_passed |
| **Final** | **`ALLOW`** | All layers agree |

---

## Audit Logging

Every policy evaluation generates an audit log entry:

```typescript
{
  id: "audit_1711234567890",
  timestamp: "2024-03-23T15:30:00.000Z",
  event: "policy_evaluation",
  user_id: "usr_1",
  details: {
    purchase_id: "pur_1711234567890",
    merchant_id: "rideco",
    amount_usd: 47.30,
    decision: "REQUIRE_APPROVAL",
    reasons: [
      "amount_above_auto_approve_limit ($47.30 > $25)",
      "no_active_session",
      "risk_check_passed"
    ]
  }
}
```
