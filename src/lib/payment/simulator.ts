// ── Transaction Simulator ──
// Simulates a USDC transfer before execution to verify it would succeed.

import { Chain, Wallet } from "@/lib/types";

export interface SimulationResult {
  success: boolean;
  estimated_gas_usd: number;
  total_cost_usd: number;
  warnings: string[];
}

export function simulatePayment(
  wallet: Wallet,
  chain: Chain,
  amount_usd: number,
  recipient: string
): SimulationResult {
  const warnings: string[] = [];

  // Check balance
  if (wallet.balance_usdc < amount_usd) {
    return {
      success: false,
      estimated_gas_usd: 0,
      total_cost_usd: amount_usd,
      warnings: ["Insufficient USDC balance"],
    };
  }

  // Estimate gas
  const gasEstimates: Record<Chain, number> = {
    base: 0.01,
    polygon: 0.02,
    solana: 0.005,
    ethereum: 2.50,
  };
  const gas = gasEstimates[chain];

  if (wallet.balance_usdc < amount_usd + gas) {
    warnings.push("Balance barely covers amount + gas");
  }

  // Verify recipient is not zero address
  if (!recipient || recipient === "0x0000000000000000000000000000000000000000") {
    return {
      success: false,
      estimated_gas_usd: gas,
      total_cost_usd: amount_usd + gas,
      warnings: ["Invalid recipient address"],
    };
  }

  return {
    success: true,
    estimated_gas_usd: gas,
    total_cost_usd: amount_usd + gas,
    warnings,
  };
}
