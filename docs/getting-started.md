---
layout: default
title: Getting Started
nav_order: 2
---

# Getting Started
{: .no_toc }

Get the agentic commerce checkout running locally in under 5 minutes.
{: .fs-6 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Prerequisites

| Tool | Version | Purpose |
|:-----|:--------|:--------|
| Node.js | 18+ | JavaScript runtime |
| npm | 9+ | Package manager |
| Git | 2.x | Version control |

---

## Installation

```bash
# Clone the repository
git clone https://github.com/vaibhavkapur22/Agentic-Commerce-Stablecoin-Checkout.git
cd Agentic-Commerce-Stablecoin-Checkout

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Your First Payment

The application starts with a seeded user **Alice** (`usr_1`) with the following configuration:

| Setting | Value |
|:--------|:------|
| Wallet balance | $500.00 USDC |
| Auto-approve limit | $25.00 |
| Daily spend limit | $200.00 |
| Allowed chains | Base, Polygon |
| Allowed merchants | RideCo, BrewHaus, InvoiceCo |

### Step 1: Auto-Approved Payment

Type a small purchase that falls under the $25 auto-approve threshold:

```
Buy me a latte
```

The agent will:
1. Parse the intent as `purchase_coffee` for category `food_beverage`
2. Resolve the merchant to **BrewHaus Coffee**
3. Get a quote for $6.50 (latte price)
4. Evaluate policy --- auto-approved (under $25 threshold)
5. Select **Base** chain ($0.01 fee, 2s latency)
6. Simulate and execute the transaction
7. Generate a receipt with tx hash

### Step 2: Approval-Required Payment

Try a purchase above the auto-approve limit:

```
Book me a $50 ride to JFK
```

The agent will:
1. Parse the intent as `purchase_ride` for category `transport`
2. Resolve the merchant to **RideCo**
3. Get a quote (randomized between $35-$60)
4. Evaluate policy --- **REQUIRE_APPROVAL** (above $25 threshold)
5. Display an approval prompt with merchant, amount, and reason
6. Wait for your **Approve** or **Deny** click
7. On approval: select the optimal chain, execute, and generate receipt

### Step 3: Create an Approval Session

Delegate temporary auto-approval permissions:

```
For the next 1 hour, allow rides under $60
```

This creates a session that auto-approves subsequent ride payments within the defined limits without requiring manual approval each time.

### Step 4: Check Your Balance

```
What's my balance?
```

The agent displays your current wallet balance, daily spend, chain, and wallet address.

### Step 5: View Transaction History

```
Show my transaction history
```

Lists all completed transactions with amounts, merchants, chains, and tx hashes.

---

## Quick Examples

```
You:   "Buy me a latte from BrewHaus"
Agent: BrewHaus quotes $6.50 for a Latte
       Policy: auto-approved (under $25 threshold)
       Chain:  Base selected ($0.01 fee, 2s latency)
       Tx:    0xabc...def confirmed
       Receipt generated
```

```
You:   "Book me a $50 ride to JFK"
Agent: RideCo quotes $47.30
       Policy: requires approval (above auto-approve limit)
       → "Approve $47.30 for RideCo ride?" [Approve] [Deny]
You:   [Approve]
Agent: Chain:  Base selected
       Tx:    0x123...789 confirmed
```

```
You:   "Pay this invoice for $100"
Agent: InvoiceCo quotes $100.00
       Policy: requires approval
       → "Approve $100.00 for InvoiceCo?" [Approve] [Deny]
You:   [Approve]
Agent: Chain:  Base selected
       Tx:    0xdef...456 confirmed
```

---

## Available Commands

| Command | Example |
|:--------|:--------|
| Book a ride | "Book me a $50 ride to JFK" |
| Order coffee | "Buy me a latte" / "Get me an espresso" |
| Pay invoice | "Pay this invoice for $100" |
| Send payment | "Send $20 USDC to Alice" |
| Top up transit | "Top up my transit card with $25" |
| Check balance | "What's my balance?" |
| View history | "Show my transaction history" |
| Create session | "For the next 1 hour, allow rides under $60" |
