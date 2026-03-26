---
layout: default
title: Home
nav_order: 1
---

# Agentic Commerce + Stablecoin Checkout

An AI-powered commerce agent that converts natural-language payment requests into policy-controlled USDC payments across multiple blockchains. The agent speaks to merchant adapters, evaluates a three-layer policy engine, routes to the cheapest chain, and executes --- all behind a single chat interface.
{: .fs-6 .fw-300 }

[Get Started]({{ site.baseurl }}/getting-started.html){: .btn .btn-primary .fs-5 .mb-4 .mb-md-0 .mr-2 }
[View on GitHub](https://github.com/vaibhavkapur22/Agentic-Commerce-Stablecoin-Checkout){: .btn .fs-5 .mb-4 .mb-md-0 }

---

## Key Features

| Feature | Description |
|:--------|:------------|
| **Natural-Language Payments** | Parse commands like "Book me a $50 ride to JFK" into structured payment intents |
| **3-Layer Policy Engine** | Static rules, session delegation, and dynamic risk scoring evaluated in sequence |
| **Multi-Chain Routing** | Automatic chain selection across Base, Polygon, Solana, and Ethereum based on fees, latency, and reliability |
| **Merchant Adapters** | Pluggable adapter pattern for RideCo, BrewHaus Coffee, InvoiceCo, and custom merchants |
| **Session Delegation** | Temporary auto-approval windows with merchant scope, spend limits, and expiry |
| **Transaction Simulation** | Pre-flight checks for balance sufficiency, gas estimation, and recipient validation |
| **Audit Trail** | Every policy evaluation, payment execution, and receipt generation is logged |
| **Conversational UI** | Dark-themed chat interface with color-coded message types and approval prompts |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Chat Interface (Next.js)                │
│              User sends natural-language request            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Layer 1: Intent Parser                     │
│        Rule-based NLP → ParsedIntent                        │
│   Intents: ride, coffee, invoice, send, transit top-up      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Layer 2: Commerce Orchestrator                 │
│   Merchant resolution → Quote retrieval → Purchase request  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│           Layer 3: Policy Engine (3-Tier)                   │
│                                                             │
│  ┌─────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │   Static     │  │   Session     │  │   Risk           │  │
│  │   Policy     │→ │   Policy      │→ │   Policy         │  │
│  │             │  │               │  │                  │  │
│  │ • Allowlist  │  │ • Expiry      │  │ • Velocity       │  │
│  │ • Chain      │  │ • Scope       │  │ • Anomaly        │  │
│  │ • Limits     │  │ • Txn limit   │  │ • Round numbers  │  │
│  │ • Balance    │  │ • Spend cap   │  │ • Risk score     │  │
│  └─────────────┘  └───────────────┘  └──────────────────┘  │
│                                                             │
│           Most restrictive decision wins                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┼───────────────┐
              │            │               │
           ALLOW    REQUIRE_APPROVAL     DENY
              │            │               │
              ▼            ▼               ▼
         ┌─────────┐  ┌─────────┐     ┌────────┐
         │ Execute │  │ Prompt  │     │ Reject │
         │         │  │ User    │     │        │
         └────┬────┘  └────┬────┘     └────────┘
              │            │
              ▼            ▼
┌─────────────────────────────────────────────────────────────┐
│              Layer 4: Payment Execution                     │
│                                                             │
│   Chain Selection → Simulation → Mock Execution → Receipt   │
│                                                             │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│   │   Base   │  │ Polygon  │  │  Solana   │  │ Ethereum │   │
│   │ $0.01    │  │ $0.02    │  │  $0.005   │  │ $2.50    │   │
│   │ 2s       │  │ 3s       │  │  1s       │  │ 15s      │   │
│   │ 99%      │  │ 98%      │  │  97%      │  │ 99.9%    │   │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               Layer 5: Receipt & Audit                      │
│      Receipt generation → Audit log → Balance update        │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Component | Technology |
|:----------|:-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| UI | React 18, Tailwind CSS 3.4 |
| Token | USDC (simulated) |
| Chains | Base, Polygon, Solana, Ethereum |
| State | In-memory store (MVP) |

---

## Project Structure

```
src/
├── app/                           # Next.js App Router
│   ├── api/chat/route.ts         # POST /api/chat endpoint
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
│
├── components/                    # React UI components
│   ├── Chat.tsx                  # Main chat interface
│   ├── MessageBubble.tsx         # Message rendering with formatting
│   └── ApprovalPrompt.tsx        # Approve/Deny buttons
│
└── lib/                           # Core business logic
    ├── types.ts                  # All TypeScript interfaces
    ├── store/index.ts            # In-memory data store + seed data
    │
    ├── agent/                     # Agent orchestration
    │   ├── orchestrator.ts       # Central coordinator
    │   └── intent-parser.ts      # Natural language → ParsedIntent
    │
    ├── merchants/                 # Merchant adapters
    │   ├── types.ts              # MerchantAdapter interface
    │   ├── registry.ts           # Adapter lookup + category mapping
    │   ├── ride-adapter.ts       # RideCo (transport)
    │   ├── coffee-adapter.ts     # BrewHaus (food/beverage)
    │   └── invoice-adapter.ts    # InvoiceCo (invoices)
    │
    ├── policy/                    # 3-layer policy engine
    │   ├── engine.ts             # Composite evaluator
    │   ├── static-policy.ts      # Layer 1: Hard rules
    │   ├── session-policy.ts     # Layer 2: Delegated permissions
    │   └── risk-policy.ts        # Layer 3: Risk heuristics
    │
    ├── payment/                   # Payment execution
    │   ├── executor.ts           # Mock payment orchestration
    │   ├── chain-selector.ts     # Weighted chain scoring
    │   └── simulator.ts          # Pre-flight simulation
    │
    └── receipt/                   # Post-payment
        └── generator.ts          # Receipt creation + audit
```
