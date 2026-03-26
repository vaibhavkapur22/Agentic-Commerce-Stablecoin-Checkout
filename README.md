# Agentic Commerce + Stablecoin Checkout

An AI-powered commerce agent that turns natural-language requests into policy-controlled USDC payments across multiple blockchains. Users speak ("Book me a $50 ride to JFK"), the agent resolves the merchant, evaluates a three-layer policy engine, routes to the cheapest chain, and executes -- all behind a single chat interface.

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start chatting.

## Quick Example

```
You:   "Buy me a latte from BrewHaus"
Agent: BrewHaus quotes $4.50 for a Latte
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
Agent: Chain:  Polygon selected
       Tx:    0x123...789 confirmed
```

## Architecture

```
User Input
    |
Intent Parser ── regex-based extraction of merchant, amount, destination
    |
Merchant Resolution ── registry maps category → adapter (RideCo, BrewHaus, InvoiceCo)
    |
Get Quote ── adapter returns price, supported chains, expiry
    |
Policy Engine ── three layers evaluated in sequence:
    |   ├─ Static Policy ── merchant allowlist, chain allowlist, daily spend limit
    |   ├─ Session Policy ── temporary delegated permissions ("allow rides < $60 for 2h")
    |   └─ Risk Policy ── velocity checks, unusual amount detection, round-number flags
    |
    ├─ DENY → block
    ├─ REQUIRE_APPROVAL → pause, ask user
    └─ ALLOW → execute
    |
Chain Selector ── deterministic scoring: fee (40%) + latency (30%) + reliability (30%)
    |
Simulate → Execute → Receipt + Audit Log
```

### Chain routing stats

| Chain    | Avg Fee | Latency | Reliability |
|----------|---------|---------|-------------|
| Base     | $0.01   | 2 s     | 99.0 %      |
| Polygon  | $0.02   | 3 s     | 98.0 %      |
| Solana   | $0.005  | 1 s     | 97.0 %      |
| Ethereum | $2.50   | 15 s    | 99.9 %      |

## Project Structure

```
src/
├── app/
│   ├── api/chat/route.ts          POST /api/chat -- single conversation endpoint
│   └── page.tsx                   Main page
├── components/
│   ├── Chat.tsx                   Chat UI with approval prompts
│   ├── MessageBubble.tsx          Rich message rendering (quotes, receipts, policy)
│   └── ApprovalPrompt.tsx         Approve / Deny buttons for gated purchases
├── lib/
│   ├── agent/
│   │   ├── orchestrator.ts        Central coordinator -- intent → policy → pay → receipt
│   │   └── intent-parser.ts       Regex intent extraction (ride, coffee, invoice, send, topup)
│   ├── merchants/
│   │   ├── registry.ts            Category → adapter lookup
│   │   ├── types.ts               MerchantAdapter interface
│   │   ├── ride-adapter.ts        RideCo -- $35-60 random pricing
│   │   ├── coffee-adapter.ts      BrewHaus -- menu-based pricing ($4-7)
│   │   └── invoice-adapter.ts     InvoiceCo -- arbitrary amount
│   ├── payment/
│   │   ├── executor.ts            Simulates, executes, updates balances
│   │   ├── chain-selector.ts      Weighted scoring across chains
│   │   └── simulator.ts           Pre-execution balance & gas checks
│   ├── policy/
│   │   ├── engine.ts              Composite evaluator (static → session → risk)
│   │   ├── static-policy.ts       Hard rules -- allowlists, daily limits, auto-approve
│   │   ├── session-policy.ts      Time-boxed delegated spend permissions
│   │   └── risk-policy.ts         Heuristic scoring -- velocity, outlier, round-number
│   ├── receipt/
│   │   └── generator.ts           Immutable receipt with policy trace + audit trail
│   ├── store/
│   │   └── index.ts               In-memory seed data (Alice, $500 USDC, 3 merchants)
│   └── types.ts                   Core type definitions
```

## Key Design Decisions

**Policy-first execution.** The agent never moves funds without passing through all three policy layers. AI decides *what* to buy; deterministic policy decides *whether* it's allowed.

**Session-scoped delegation.** Users can say "For the next 2 hours, allow rides under $60" to create temporary auto-approve windows -- reducing friction without removing guardrails.

**Deterministic chain routing.** Chain selection uses weighted scoring (fee, latency, reliability), not LLM output. The agent picks the cheapest viable chain for each transaction.

**Separation of concerns.** AI intent parsing is isolated from cryptographic authority. The orchestrator coordinates but never holds keys.

## Tech Stack

- **Next.js 14** -- app router, API routes, React Server Components
- **TypeScript** -- end-to-end type safety
- **Tailwind CSS** -- chat UI styling
- **USDC** -- stablecoin payments across Base, Polygon, Solana, Ethereum

## Current State

This is a Phase 1 MVP with mocked blockchain interactions. The full agent flow (intent → policy → chain selection → execution → receipt) works end-to-end with simulated transactions.

**Phase 2** targets: real testnet USDC transfers via ethers.js/viem, smart contract wallet with delegated permissions, LLM-based intent parsing, database persistence, and multi-user support.
