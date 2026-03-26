---
layout: default
title: Chain Selection
nav_order: 7
---

# Chain Selection
{: .no_toc }

Weighted scoring algorithm for optimal blockchain routing.
{: .fs-6 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Overview

The chain selector picks the optimal blockchain for each payment using a weighted composite score. Lower scores are better. The selector considers fees, latency, and reliability, filtered by both merchant support and user preferences.

```
Merchant Supported Chains ──┐
                             ├──→ Candidates ──→ Score ──→ Best Chain
User Allowed Chains ─────────┘
```

---

## Chain Statistics

| Chain | Avg Fee (USD) | Avg Latency (sec) | Reliability |
|:------|:-------------|:-------------------|:-----------|
| **Base** | $0.01 | 2s | 99.0% |
| **Polygon** | $0.02 | 3s | 98.0% |
| **Solana** | $0.005 | 1s | 97.0% |
| **Ethereum** | $2.50 | 15s | 99.9% |

---

## Scoring Algorithm

Each chain receives a composite score using three weighted factors:

```
score = (fee × 0.4) + (latency × 0.03) + ((1 - reliability) × 100 × 0.3)
```

| Factor | Weight | Formula | Rationale |
|:-------|:-------|:--------|:----------|
| **Fee** | 40% | `fee_usd × 0.4` | Direct cost to user |
| **Latency** | 30% | `latency_sec × 0.03` | User experience |
| **Reliability** | 30% | `(1 - reliability) × 100 × 0.3` | Failure risk |

### Computed Scores

| Chain | Fee Component | Latency Component | Reliability Component | **Total Score** |
|:------|:-------------|:-----------------|:---------------------|:---------------|
| **Solana** | 0.005 × 0.4 = 0.002 | 1 × 0.03 = 0.030 | 3.0 × 0.3 = 0.900 | **0.932** |
| **Base** | 0.01 × 0.4 = 0.004 | 2 × 0.03 = 0.060 | 1.0 × 0.3 = 0.300 | **0.364** |
| **Polygon** | 0.02 × 0.4 = 0.008 | 3 × 0.03 = 0.090 | 2.0 × 0.3 = 0.600 | **0.698** |
| **Ethereum** | 2.50 × 0.4 = 1.000 | 15 × 0.03 = 0.450 | 0.1 × 0.3 = 0.030 | **1.480** |

### Ranking (Best to Worst)

1. **Base** --- 0.364
2. **Polygon** --- 0.698
3. **Solana** --- 0.932
4. **Ethereum** --- 1.480

{: .note }
Base wins over Solana despite Solana having lower fees and latency, because Base has higher reliability (99% vs 97%). The 30% reliability weight penalizes Solana's 3% failure rate more than it rewards its fee/latency advantages.

---

## Selection Process

### Step 1: Filter Candidates

Intersect merchant-supported chains with user-allowed chains:

```
Candidates = merchant.supported_chains ∩ user.allowed_chains
```

If the intersection is empty, the payment fails with "No compatible chain found."

### Step 2: Verify Funding

Filter candidates to chains where the user's wallet balance covers the payment amount. In the MVP, the wallet is assumed to cover all chains (single custodial wallet).

### Step 3: Score and Sort

Score each candidate chain and sort ascending (lowest score = best).

### Step 4: Return Best

Return the top-scored chain with its fee estimate and selection reason.

---

## Worked Examples

### Example 1: Coffee from BrewHaus

**Input:**
- Merchant chains: [Base]
- User chains: [Base, Polygon]
- Amount: $6.50

**Candidates:** [Base] (only overlap)

**Result:** Base selected (only option), fee = $0.01

### Example 2: Ride from RideCo

**Input:**
- Merchant chains: [Base, Polygon]
- User chains: [Base, Polygon]
- Amount: $47.30

**Candidates:** [Base, Polygon]

**Scores:**
- Base: 0.364
- Polygon: 0.698

**Result:** Base selected (lowest composite score: fee=$0.01, latency=2s)

### Example 3: Invoice from InvoiceCo

**Input:**
- Merchant chains: [Base, Polygon, Ethereum]
- User chains: [Base, Polygon]
- Amount: $100.00

**Candidates:** [Base, Polygon] (Ethereum excluded by user preference)

**Scores:**
- Base: 0.364
- Polygon: 0.698

**Result:** Base selected (lowest composite score: fee=$0.01, latency=2s)

---

## Gas Estimation

After chain selection, the simulator estimates gas costs per chain:

| Chain | Gas Estimate |
|:------|:------------|
| Base | $0.01 |
| Polygon | $0.02 |
| Solana | $0.005 |
| Ethereum | $2.50 |

If the wallet balance is less than `amount + gas`, a warning is logged but the payment still proceeds (the gas is not deducted in the MVP simulation).
