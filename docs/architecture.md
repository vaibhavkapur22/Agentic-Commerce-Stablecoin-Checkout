---
layout: default
title: Architecture
nav_order: 3
---

# Architecture
{: .no_toc }

System design, payment lifecycle, and architectural patterns.
{: .fs-6 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Design Principles

### Separation of AI and Cryptographic Authority

The core architectural insight is separating **AI decisioning** from **transaction execution**. The agent makes commerce decisions (parsing intents, selecting merchants, choosing chains), but a deterministic policy engine enforces spending controls before any funds move. This prevents the AI layer from unilaterally spending money.

```
AI Layer (non-deterministic)          Trust Layer (deterministic)
┌────────────────────────┐            ┌────────────────────────┐
│  Intent Parsing        │            │  Static Policy         │
│  Merchant Resolution   │ ────────→  │  Session Policy        │
│  Quote Retrieval       │            │  Risk Policy           │
│  Chain Recommendation  │            │  Balance Checks        │
└────────────────────────┘            └────────────────────────┘
       Suggestions only                  Enforces hard rules
```

### Five-Layer Architecture

The system processes payments through five sequential layers:

| Layer | Responsibility | Deterministic? |
|:------|:---------------|:--------------|
| **1. Intent** | Parse natural language into structured intents | Rule-based (MVP) |
| **2. Commerce** | Resolve merchant, get quote, build purchase request | Yes |
| **3. Policy** | Evaluate 3-tier policy engine, decide ALLOW/DENY/REQUIRE_APPROVAL | Yes |
| **4. Payment** | Select chain, simulate, execute, update balances | Yes |
| **5. Receipt** | Generate receipt, write audit log | Yes |

---

## Payment Lifecycle

Every payment follows this exact sequence through the orchestrator:

### State Flow

```
User Message
    │
    ▼
Parse Intent ──────────── intent === "unknown" ──→ Error Response
    │
    ▼
Resolve Merchant ──────── not found ─────────────→ Error Response
    │
    ▼
Get Quote ─────────────── adapter missing ───────→ Error Response
    │
    ▼
Build PurchaseRequest
    │
    ▼
Evaluate Policy
    │
    ├── DENY ──────────────────────────────────→ Error Response
    │
    ├── REQUIRE_APPROVAL ──→ Store Pending ──→ Prompt User
    │                                              │
    │                              ┌───────────────┤
    │                              │               │
    │                           Approve          Deny
    │                              │               │
    │                              ▼               ▼
    │                         Continue         Cancel + Audit
    │
    ├── ALLOW ─────────────────────┐
    ├── ALLOW_WITH_LOG ────────────┤
    │                              │
    ▼                              ▼
Select Chain ──────────── no compatible chain ──→ Error Response
    │
    ▼
Simulate Payment ──────── simulation fails ────→ Error Response
    │
    ▼
Execute (Mock) ────────── submit tx
    │
    ▼
Update Balances
    │
    ▼
Generate Receipt
    │
    ▼
Return Response
```

### Payment Status Transitions

```
pending → simulated → submitted → confirmed
                                 → failed
```

| Status | Meaning |
|:-------|:--------|
| `pending` | Payment record created |
| `simulated` | Pre-flight checks passed |
| `submitted` | Transaction broadcast to chain |
| `confirmed` | Transaction confirmed on-chain |
| `failed` | Any step failed |

---

## Architectural Patterns

### Adapter Pattern (Merchants)

Each merchant implements the `MerchantAdapter` interface, decoupling the orchestrator from merchant-specific logic:

```typescript
interface MerchantAdapter {
  merchantId: string;
  getQuote(input: QuoteRequest): Promise<QuoteResponse>;
  createOrder(input: CreateOrderRequest): Promise<CreateOrderResponse>;
  confirmPayment(input: ConfirmPaymentRequest): Promise<ConfirmPaymentResponse>;
}
```

New merchants are added by implementing this interface and registering in the adapter registry. The orchestrator resolves merchants via a category-to-adapter mapping, so no orchestrator changes are needed.

### Composite Policy Pattern

The policy engine evaluates three independent policy layers and composes the final decision using a **most-restrictive-wins** rule:

```
Priority: DENY > REQUIRE_APPROVAL > ALLOW_WITH_LOG > ALLOW
```

Each layer returns its own `PolicyEvaluation` with a decision and reasons. The composite engine collects all reasons and applies the highest-priority decision. This means any single layer can block a payment, but no single layer can override a denial from another.

### Idempotent Identifiers

All entities use timestamp-based IDs with prefixes for type safety:

| Entity | ID Format | Example |
|:-------|:----------|:--------|
| Purchase | `pur_{timestamp}` | `pur_1711234567890` |
| Payment | `pay_{timestamp}` | `pay_1711234567891` |
| Receipt | `rcpt_{timestamp}` | `rcpt_1711234567892` |
| Session | `sess_{timestamp}` | `sess_1711234567893` |
| Audit | `audit_{timestamp}` | `audit_1711234567894` |
| Quote | `q_{type}_{timestamp}` | `q_ride_1711234567895` |

---

## Security Model

### Trust Boundaries

```
┌──────────────────────────────────────────────┐
│  Untrusted: User Input                       │
│  Natural language, arbitrary strings          │
├──────────────────────────────────────────────┤
│  Semi-trusted: Intent Parser Output          │
│  Structured but derived from untrusted input │
├──────────────────────────────────────────────┤
│  Trusted: Policy Engine                      │
│  Deterministic rules, no AI influence        │
├──────────────────────────────────────────────┤
│  Trusted: Payment Execution                  │
│  Only runs after policy approval             │
└──────────────────────────────────────────────┘
```

### Key Security Properties

| Property | Implementation |
|:---------|:---------------|
| **Spending limits** | Static policy enforces daily limit ($200) and per-transaction auto-approve threshold ($25) |
| **Merchant allowlist** | Only pre-approved merchants can receive payments |
| **Chain allowlist** | Users can only transact on explicitly allowed chains |
| **Session scoping** | Delegated sessions are scoped to specific merchants, amounts, and time windows |
| **Risk detection** | Velocity checks, anomaly detection, and round-number heuristics flag suspicious patterns |
| **Audit logging** | Every policy evaluation, payment, and receipt is logged with full context |
| **Balance verification** | Simulation checks balance sufficiency before execution |
| **Approval gating** | Payments above threshold require explicit user confirmation in-chat |

---

## Data Model

### In-Memory Store

The MVP uses an in-memory store with seed data. All data resets on server restart.

```
┌──────────┐     ┌──────────┐     ┌───────────┐
│  Users   │────→│  Wallets │     │ Merchants │
└──────────┘     └──────────┘     └───────────┘
     │                                  │
     │                                  │
     ▼                                  │
┌──────────┐     ┌──────────┐          │
│ Sessions │     │ Payments │←─────────┘
└──────────┘     └──────────┘
                      │
                      ▼
                 ┌──────────┐     ┌───────────┐
                 │ Receipts │     │ Audit Log │
                 └──────────┘     └───────────┘
```

### Seed Data

**User: Alice (usr_1)**

| Field | Value |
|:------|:------|
| Wallet | $500.00 USDC on Base |
| Auto-approve | $25.00 |
| Daily limit | $200.00 |
| Chains | Base, Polygon |
| Merchants | RideCo, BrewHaus, InvoiceCo |

**Merchants:**

| Merchant | ID | Category | Chains |
|:---------|:---|:---------|:-------|
| RideCo | `rideco` | transport | Base, Polygon |
| BrewHaus Coffee | `brewhaus` | food_beverage | Base |
| InvoiceCo | `invoice_co` | invoice | Base, Polygon, Ethereum |
