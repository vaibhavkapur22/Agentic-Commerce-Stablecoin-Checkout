---
layout: default
title: Intent Parser
nav_order: 5
---

# Intent Parser
{: .no_toc }

Natural language parsing into structured payment intents.
{: .fs-6 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Overview

The intent parser converts free-form user messages into structured `ParsedIntent` objects. In the MVP, this uses rule-based regex pattern matching. In production, this would be replaced by an LLM with tool calling.

```
"Book me a $50 ride to JFK"
         │
         ▼
┌────────────────────────┐
│    Intent Parser       │
│                        │
│  Pattern matching      │
│  Amount extraction     │
│  Destination parsing   │
│  Confidence scoring    │
└────────────────────────┘
         │
         ▼
{
  intent: "purchase_ride",
  merchant_category: "transport",
  amount_usd: 50,
  destination: "JFK",
  confidence: 0.92
}
```

---

## Supported Intents

| Intent | Category | Example Phrases |
|:-------|:---------|:----------------|
| `purchase_ride` | `transport` | "Book me a $50 ride to JFK", "Get a taxi", "Call me an uber" |
| `purchase_coffee` | `food_beverage` | "Buy me a latte", "Order a cappuccino", "Get me an espresso" |
| `pay_invoice` | `invoice` | "Pay this invoice for $100", "Settle the invoice", "Pay $50 for the invoice" |
| `send_payment` | `payment` | "Send $20 USDC to Alice", "Transfer $50 to Bob" |
| `topup_transit` | `transport` | "Top up my transit card with $25", "Add $10 to my metro pass" |
| `unknown` | --- | Any unrecognized message |

---

## Pattern Matching

Each intent is defined by one or more regex patterns. The parser iterates through all patterns until a match is found.

### Ride Patterns

```
/(?:book|get|call|order)\s+(?:me\s+)?(?:a\s+)?(?:\$?(\d+)\s+)?(?:ride|taxi|uber|lyft|car)/i
/ride\s+to\s+(.+?)(?:\s+for\s+\$?(\d+))?$/i
```

**Matches:** "Book me a $50 ride", "Get a taxi", "Call me an uber", "Ride to JFK for $40"

### Coffee Patterns

```
/(?:buy|get|order)\s+(?:me\s+)?(?:a\s+)?(?:\$?(\d+)\s+)?(coffee|latte|espresso|cappuccino|mocha|tea)/i
/(?:buy|get|order)\s+(?:me\s+)?(?:a\s+)?(coffee|latte|espresso|cappuccino|mocha|tea)/i
```

**Matches:** "Buy me a latte", "Order a cappuccino", "Get me an espresso"

### Invoice Patterns

```
/(?:pay|settle)\s+(?:this\s+)?(?:the\s+)?invoice(?:\s+(?:for\s+)?\$?(\d+))?/i
/(?:pay|send)\s+\$?(\d+)\s+(?:to|for)\s+(?:the\s+)?invoice/i
```

**Matches:** "Pay this invoice for $100", "Settle the invoice", "Pay $50 for the invoice"

### Send Payment Patterns

```
/(?:send|transfer|pay)\s+\$?(\d+)\s+(?:USDC\s+)?(?:to)\s+(.+)/i
```

**Matches:** "Send $20 USDC to Alice", "Transfer $50 to Bob"

### Transit Top-Up Patterns

```
/(?:top\s*up|add|load)\s+(?:my\s+)?(?:transit|metro|bus)\s+(?:card|pass)(?:\s+(?:with\s+)?\$?(\d+))?/i
```

**Matches:** "Top up my transit card with $25", "Add $10 to my metro pass"

---

## ParsedIntent Structure

```typescript
interface ParsedIntent {
  intent: string;              // Intent type identifier
  merchant_category?: string;  // Category for merchant resolution
  merchant_name?: string;      // Specific item (e.g., "latte")
  amount_usd?: number;         // Extracted dollar amount
  max_amount_usd?: number;     // amount * 1.1 (10% slippage buffer)
  recipient?: string;          // For send_payment intents
  destination?: string;        // For purchase_ride intents
  description: string;         // Original user message
  confidence: number;          // 0.0 - 1.0 confidence score
}
```

---

## Confidence Scoring

| Condition | Confidence |
|:----------|:-----------|
| Pattern matched + amount extracted | 0.92 |
| Pattern matched, no amount | 0.75 |
| No pattern matched (unknown) | 0.30 |

---

## Field Extraction

### Amount Extraction

The parser scans regex capture groups for numeric values between 0 and 10,000. The first valid number found is used as `amount_usd`. A 10% slippage buffer is applied as `max_amount_usd`.

### Destination Extraction (Rides)

For ride intents, the parser looks for a destination phrase:

```
/(?:to|towards|going to)\s+(.+?)(?:\s+for|\s*$)/i
```

Example: "Book me a ride **to JFK**" → `destination: "JFK"`

### Recipient Extraction (Payments)

For send intents, the parser extracts the recipient:

```
/to\s+(.+)$/i
```

Example: "Send $20 USDC **to Alice**" → `recipient: "Alice"`

### Item Extraction (Coffee)

For coffee intents, the parser identifies the drink type:

```
/(coffee|latte|espresso|cappuccino|mocha|tea)/i
```

Example: "Buy me a **latte**" → `merchant_name: "latte"`

---

## Fallback Behavior

If no pattern matches, the parser returns an `unknown` intent with the original message as the description. It still attempts to extract a dollar amount from the message for potential use.

```typescript
{
  intent: "unknown",
  description: "the original message",
  amount_usd: 42,      // if found in message
  confidence: 0.3
}
```

The orchestrator responds with a help message listing available commands when it receives an unknown intent.
