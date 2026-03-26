# Agentic Commerce + Stablecoin Checkout

An AI-powered commerce agent that turns natural-language requests into policy-controlled USDC payments across multiple blockchains. Speaks to merchant adapters, evaluates a three-layer policy engine (static rules, session delegation, risk scoring), routes to the cheapest chain, and executes -- all behind a single chat interface.

> **Built with Next.js 14, TypeScript, and Tailwind CSS. Supports Base, Polygon, Solana, and Ethereum.**

**[Read the full documentation](https://vaibhavkapur22.github.io/Agentic-Commerce-Stablecoin-Checkout/)**

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
