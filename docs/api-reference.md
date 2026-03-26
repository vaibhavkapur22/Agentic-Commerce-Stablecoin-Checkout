---
layout: default
title: API Reference
nav_order: 4
---

# API Reference
{: .no_toc }

Complete REST API documentation for the chat endpoint.
{: .fs-6 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## POST /api/chat

The single API endpoint that handles all user interactions --- natural language messages, approval responses, and info queries.

### Request Body

```typescript
interface ChatRequest {
  message: string;                              // Natural language input
  user_id: string;                              // User identifier (default: "usr_1")
  session_id?: string;                          // Optional session tracking
  approval_response?: "approve" | "deny";       // Response to pending approval
  pending_purchase_id?: string;                 // Purchase ID being approved/denied
}
```

### Response Body

```typescript
interface ChatResponse {
  messages: ChatMessage[];                      // Conversation messages
  requires_approval?: boolean;                  // Whether user must approve
  pending_purchase?: PurchaseRequest;           // Purchase awaiting approval
  receipt?: Receipt;                            // Receipt (if payment completed)
}
```

### Message Types

Each `ChatMessage` includes metadata indicating its type, which the UI uses for color-coded rendering:

| Type | Color | Description |
|:-----|:------|:------------|
| `text` | Default | General text response |
| `intent` | Blue | Parsed intent confirmation |
| `quote` | Green | Merchant quote details |
| `policy` | Yellow | Policy evaluation result |
| `approval_request` | Orange | Approval prompt with purchase details |
| `payment` | Purple | Payment execution status |
| `receipt` | Emerald | Payment confirmation with receipt |
| `error` | Red | Error message |

---

## Request Examples

### Send a Natural Language Message

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Buy me a latte",
    "user_id": "usr_1"
  }'
```

**Response (auto-approved):**

```json
{
  "messages": [
    {
      "id": "msg_1711234567890_a1b2",
      "role": "assistant",
      "content": "Understood: **Buy me a latte**",
      "timestamp": "2024-03-23T15:30:00.000Z",
      "metadata": { "type": "intent" }
    },
    {
      "id": "msg_1711234567891_c3d4",
      "role": "assistant",
      "content": "Got quote from **BrewHaus Coffee**: **$6.50 USDC** — Latte from BrewHaus Coffee",
      "timestamp": "2024-03-23T15:30:00.001Z",
      "metadata": { "type": "quote" }
    },
    {
      "id": "msg_1711234567892_e5f6",
      "role": "assistant",
      "content": "Policy: **ALLOW** — static_policy_passed, no_active_session, risk_check_passed",
      "timestamp": "2024-03-23T15:30:00.002Z",
      "metadata": { "type": "policy" }
    },
    {
      "id": "msg_1711234567893_g7h8",
      "role": "assistant",
      "content": "Executing payment...",
      "timestamp": "2024-03-23T15:30:00.003Z",
      "metadata": { "type": "payment" }
    },
    {
      "id": "msg_1711234567894_i9j0",
      "role": "assistant",
      "content": "**Payment Confirmed!**\n\n| Field | Value |\n...",
      "timestamp": "2024-03-23T15:30:00.504Z",
      "metadata": { "type": "receipt" }
    }
  ],
  "receipt": {
    "receipt_id": "rcpt_1711234567894",
    "payment_id": "pay_1711234567893",
    "amount_usd": 6.50,
    "token": "USDC",
    "chain": "base",
    "tx_hash": "0xabc...def",
    "status": "confirmed"
  }
}
```

### Request Requiring Approval

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Book me a $50 ride to JFK",
    "user_id": "usr_1"
  }'
```

**Response (requires approval):**

```json
{
  "messages": [
    { "metadata": { "type": "intent" }, "content": "Understood: **Book me a $50 ride to JFK**" },
    { "metadata": { "type": "quote" }, "content": "Got quote from **RideCo**: **$47.30 USDC** — Ride to JFK via RideCo" },
    { "metadata": { "type": "policy" }, "content": "Policy: **REQUIRE_APPROVAL** — amount_above_auto_approve_limit ($47.30 > $25)" },
    { "metadata": { "type": "approval_request" }, "content": "This purchase requires your approval: ..." }
  ],
  "requires_approval": true,
  "pending_purchase": {
    "purchase_id": "pur_1711234567890",
    "merchant_id": "rideco",
    "amount_usd": 47.30
  }
}
```

### Approve a Pending Purchase

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "",
    "user_id": "usr_1",
    "approval_response": "approve",
    "pending_purchase_id": "pur_1711234567890"
  }'
```

### Deny a Pending Purchase

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "",
    "user_id": "usr_1",
    "approval_response": "deny",
    "pending_purchase_id": "pur_1711234567890"
  }'
```

### Check Balance

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is my balance?",
    "user_id": "usr_1"
  }'
```

### View Transaction History

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show my transaction history",
    "user_id": "usr_1"
  }'
```

### Create an Approval Session

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "For the next 1 hour, allow rides under $60",
    "user_id": "usr_1"
  }'
```

---

## Error Responses

### Validation Error (400)

```json
{
  "error": "Message or approval_response is required"
}
```

### Server Error (500)

```json
{
  "error": "Internal server error"
}
```

### In-Band Errors

Most errors are returned as messages within a successful 200 response, with `metadata.type: "error"`:

| Error | Cause |
|:------|:------|
| Unknown intent | Message couldn't be parsed into a known intent |
| Merchant not found | No merchant matches the intent category |
| No adapter available | Merchant exists but has no registered adapter |
| Payment denied | Policy engine returned DENY |
| No compatible chain | Merchant and user have no overlapping allowed chains |
| Insufficient balance | Wallet balance too low for the payment + gas |
| Simulation failed | Pre-flight check detected an issue |
| No pending purchase | Approval response references an unknown purchase ID |

---

## Type Reference

### ChatMessage

```typescript
interface ChatMessage {
  id: string;                        // Unique message ID
  role: "user" | "assistant" | "system";
  content: string;                   // Markdown-formatted content
  timestamp: string;                 // ISO 8601 timestamp
  metadata?: {
    type?: "text" | "intent" | "quote" | "policy" |
           "approval_request" | "payment" | "receipt" | "error";
    data?: unknown;                  // Type-specific payload
  };
}
```

### PurchaseRequest

```typescript
interface PurchaseRequest {
  purchase_id: string;
  user_id: string;
  merchant_id: string;
  quote_id: string;
  amount_usd: number;
  max_amount_usd: number;
  merchant_wallet: string;
  chain_options: Chain[];
  description: string;
}
```

### Receipt

```typescript
interface Receipt {
  receipt_id: string;
  payment_id: string;
  purchase_id: string;
  merchant_id: string;
  merchant_name: string;
  amount_usd: number;
  token: Token;                      // "USDC"
  chain: Chain;                      // "base" | "polygon" | "solana" | "ethereum"
  tx_hash: string;
  status: "confirmed" | "failed";
  policy_decision: PolicyDecision;
  policy_reasons: string[];
  user_approved: boolean;
  created_at: string;
}
```
