// ── Chain Selection Logic ──
// Deterministic chain selection based on merchant support, user preferences, fees, etc.

import { Chain, User, Wallet } from "@/lib/types";

interface ChainSelectionInput {
  supported_chains: Chain[];
  user: User;
  wallet: Wallet;
  amount_usd: number;
}

// Simulated fee and latency data per chain
const CHAIN_STATS: Record<Chain, { avg_fee_usd: number; avg_latency_sec: number; reliability: number }> = {
  base: { avg_fee_usd: 0.01, avg_latency_sec: 2, reliability: 0.99 },
  polygon: { avg_fee_usd: 0.02, avg_latency_sec: 3, reliability: 0.98 },
  solana: { avg_fee_usd: 0.005, avg_latency_sec: 1, reliability: 0.97 },
  ethereum: { avg_fee_usd: 2.50, avg_latency_sec: 15, reliability: 0.999 },
};

function scoreChain(chain: Chain): number {
  const stats = CHAIN_STATS[chain];
  // Lower score = better. Weighted: fee(40%), latency(30%), reliability(30%)
  return (
    stats.avg_fee_usd * 0.4 +
    stats.avg_latency_sec * 0.03 +
    (1 - stats.reliability) * 100 * 0.3
  );
}

export function selectChain(input: ChainSelectionInput): { chain: Chain; fee_estimate_usd: number; reason: string } {
  // Filter to chains supported by both merchant and user
  const candidates = input.supported_chains.filter((c) =>
    input.user.allowed_chains.includes(c)
  );

  if (candidates.length === 0) {
    throw new Error("No compatible chain found between merchant and user preferences");
  }

  // Filter to chains where wallet has enough balance (simplified: we assume wallet covers all chains)
  const funded = candidates.filter(() => input.wallet.balance_usdc >= input.amount_usd);

  if (funded.length === 0) {
    throw new Error("Insufficient balance on any compatible chain");
  }

  // Score and sort
  const scored = funded
    .map((chain) => ({
      chain,
      score: scoreChain(chain),
      fee_estimate_usd: CHAIN_STATS[chain].avg_fee_usd,
    }))
    .sort((a, b) => a.score - b.score);

  const best = scored[0];
  return {
    chain: best.chain,
    fee_estimate_usd: best.fee_estimate_usd,
    reason: `Selected ${best.chain} (lowest composite score: fee=$${best.fee_estimate_usd}, latency=${CHAIN_STATS[best.chain].avg_latency_sec}s)`,
  };
}
