---
layout: default
title: Merchant Adapters
nav_order: 8
---

# Merchant Adapters
{: .no_toc }

Pluggable merchant integration layer with quote, order, and payment confirmation.
{: .fs-6 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Overview

Merchant adapters decouple the commerce orchestrator from merchant-specific business logic. Each adapter implements a standard interface for quoting, ordering, and confirming payments. The orchestrator interacts with merchants exclusively through this interface.

```
Orchestrator
    │
    ▼
┌──────────────────┐
│ Adapter Registry │
│                  │
│  categoryMap:    │
│   ride → rideco  │
│   coffee → brew  │
│   invoice → inv  │
└────────┬─────────┘
         │
    ┌────┼────────────┐
    │    │             │
    ▼    ▼             ▼
┌──────┐ ┌──────┐ ┌──────────┐
│RideCo│ │ Brew │ │InvoiceCo │
│      │ │ Haus │ │          │
└──────┘ └──────┘ └──────────┘
```

---

## MerchantAdapter Interface

```typescript
interface MerchantAdapter {
  merchantId: string;
  getQuote(input: QuoteRequest): Promise<QuoteResponse>;
  createOrder(input: CreateOrderRequest): Promise<CreateOrderResponse>;
  confirmPayment(input: ConfirmPaymentRequest): Promise<ConfirmPaymentResponse>;
}
```

### QuoteRequest / QuoteResponse

```typescript
interface QuoteRequest {
  merchant_id: string;
  service_type: string;        // Intent type (e.g., "purchase_ride")
  params: Record<string, unknown>;  // Intent-specific parameters
}

interface QuoteResponse {
  quote_id: string;
  merchant_id: string;
  merchant_name: string;
  amount_usd: number;
  recipient_wallet: string;
  supported_chains: Chain[];
  description: string;
  expires_at: string;          // ISO timestamp
}
```

### CreateOrderRequest / CreateOrderResponse

```typescript
interface CreateOrderRequest {
  quote_id: string;
  merchant_id: string;
  user_id: string;
}

interface CreateOrderResponse {
  order_id: string;
  merchant_id: string;
  amount_usd: number;
  status: "created" | "pending_payment";
}
```

### ConfirmPaymentRequest / ConfirmPaymentResponse

```typescript
interface ConfirmPaymentRequest {
  order_id: string;
  tx_hash: string;
  chain: string;
}

interface ConfirmPaymentResponse {
  order_id: string;
  status: "acknowledged" | "pending_confirmation";
}
```

---

## Adapter Registry

The registry maps merchant IDs to adapter instances and provides category-based lookup for intent resolution.

### Category Mapping

| Category Keywords | Resolved Merchant |
|:-----------------|:-----------------|
| ride, transport, taxi, uber, lyft | `rideco` |
| coffee, cafe, food, beverage | `brewhaus` |
| invoice, bill, payment | `invoice_co` |

### Registration

```typescript
const adapters: Map<string, MerchantAdapter> = new Map();

register(new RideMerchantAdapter());
register(new CoffeeMerchantAdapter());
register(new InvoiceMerchantAdapter());
```

---

## RideCo Adapter

| Property | Value |
|:---------|:------|
| Merchant ID | `rideco` |
| Category | transport |
| Supported Chains | Base, Polygon |
| Quote Range | $35.00 -- $60.00 (randomized) |
| Quote Expiry | 5 minutes |

### Pricing

The adapter generates a random price between $35 and $60:

```typescript
const basePrice = 35 + Math.random() * 25;
const amount = Math.round(basePrice * 100) / 100;
```

### Quote Format

```
Description: "Ride to {destination} via RideCo"
```

The destination is extracted from the intent's `params.destination` field, defaulting to "downtown" if not specified.

---

## BrewHaus Coffee Adapter

| Property | Value |
|:---------|:------|
| Merchant ID | `brewhaus` |
| Category | food_beverage |
| Supported Chains | Base |
| Quote Expiry | 10 minutes |

### Menu

| Item | Price |
|:-----|:------|
| Coffee | $5.50 |
| Latte | $6.50 |
| Espresso | $4.00 |
| Cappuccino | $6.00 |
| Mocha | $7.00 |
| Tea | $4.50 |
| Default | $5.50 |

### Quote Format

```
Description: "{Item} from BrewHaus Coffee"
```

The item is extracted from the intent's `params.item` field. If the item doesn't match a menu entry, the default price ($5.50) is used.

---

## InvoiceCo Adapter

| Property | Value |
|:---------|:------|
| Merchant ID | `invoice_co` |
| Category | invoice |
| Supported Chains | Base, Polygon, Ethereum |
| Default Amount | $100.00 |
| Quote Expiry | 30 minutes |

### Pricing

Uses the amount specified in the intent. If no amount is provided, defaults to $100.00.

### Quote Format

```
Description: "Invoice payment {reference} to InvoiceCo"
```

The reference is generated as `INV-{timestamp}` if not provided in the intent parameters.

---

## Adding a New Merchant

### Step 1: Create the Adapter

Create a new file in `src/lib/merchants/`:

```typescript
import { QuoteRequest, QuoteResponse } from "@/lib/types";
import { MerchantAdapter, CreateOrderRequest, ... } from "./types";
import { store } from "@/lib/store";

export class NewMerchantAdapter implements MerchantAdapter {
  merchantId = "new_merchant";

  async getQuote(input: QuoteRequest): Promise<QuoteResponse> {
    const merchant = store.getMerchant(this.merchantId)!;
    return {
      quote_id: `q_new_${Date.now()}`,
      merchant_id: this.merchantId,
      merchant_name: merchant.name,
      amount_usd: 10.00,
      recipient_wallet: merchant.wallets.base || "",
      supported_chains: Object.keys(merchant.wallets) as Chain[],
      description: "New service description",
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
  }

  async createOrder(input: CreateOrderRequest) { /* ... */ }
  async confirmPayment(input: ConfirmPaymentRequest) { /* ... */ }
}
```

### Step 2: Register the Adapter

In `src/lib/merchants/registry.ts`:

```typescript
import { NewMerchantAdapter } from "./new-adapter";

register(new NewMerchantAdapter());

// Add category mapping
const categoryMap: Record<string, string> = {
  // ... existing mappings
  new_category: "new_merchant",
};
```

### Step 3: Add Seed Data

In `src/lib/store/index.ts`, add the merchant to the merchants map:

```typescript
["new_merchant", {
  merchant_id: "new_merchant",
  name: "New Merchant",
  category: "new_category",
  wallets: { base: "0xNewMerchantWallet" },
  allowlisted: true,
}],
```

### Step 4: Add to User Allowlist

Add the merchant ID to the user's `allowlisted_merchants` array in the seed data.

### Step 5: Add Intent Pattern (Optional)

If the new merchant needs specific natural language patterns, add them to `src/lib/agent/intent-parser.ts`.
