// ── Mock Payment Executor ──
// Simulates executing a USDC transfer on-chain.
// In Phase 2 this would use ethers.js / viem for real testnet transfers.

import { Chain, PaymentRequest } from "@/lib/types";
import { store } from "@/lib/store";
import { simulatePayment } from "./simulator";
import { selectChain } from "./chain-selector";

function generateTxHash(_chain: Chain): string {
  const hex = Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
  return `0x${hex}`;
}

export interface ExecutePaymentInput {
  user_id: string;
  merchant_id: string;
  purchase_id: string;
  amount_usd: number;
  merchant_wallet: string;
  chain_options: Chain[];
}

export interface ExecutePaymentResult {
  success: boolean;
  payment: PaymentRequest;
  chain_selection_reason: string;
  simulation_warnings: string[];
  error?: string;
}

export async function executePayment(
  input: ExecutePaymentInput
): Promise<ExecutePaymentResult> {
  const user = store.getUser(input.user_id);
  const wallet = store.getUserWallet(input.user_id);

  if (!user || !wallet) {
    const payment = createPaymentRecord(input, "base", wallet?.address || "", "failed");
    return { success: false, payment, chain_selection_reason: "", simulation_warnings: [], error: "User or wallet not found" };
  }

  // Step 1: Select chain
  let chainResult;
  try {
    chainResult = selectChain({
      supported_chains: input.chain_options,
      user,
      wallet,
      amount_usd: input.amount_usd,
    });
  } catch (err: unknown) {
    const payment = createPaymentRecord(input, "base", wallet.address, "failed");
    store.savePayment(payment);
    return {
      success: false,
      payment,
      chain_selection_reason: "",
      simulation_warnings: [],
      error: err instanceof Error ? err.message : "Chain selection failed",
    };
  }

  // Step 2: Simulate
  const sim = simulatePayment(
    wallet,
    chainResult.chain,
    input.amount_usd,
    input.merchant_wallet
  );

  const payment = createPaymentRecord(
    input,
    chainResult.chain,
    wallet.address,
    sim.success ? "simulated" : "failed"
  );
  store.savePayment(payment);

  if (!sim.success) {
    return {
      success: false,
      payment,
      chain_selection_reason: chainResult.reason,
      simulation_warnings: sim.warnings,
      error: `Simulation failed: ${sim.warnings.join(", ")}`,
    };
  }

  // Step 3: Execute (mock — generates fake tx hash)
  store.updatePaymentStatus(payment.payment_id, "submitted");

  // Simulate brief processing delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  const txHash = generateTxHash(chainResult.chain);
  store.updatePaymentStatus(payment.payment_id, "confirmed", txHash);

  // Deduct balance
  store.deductBalance(wallet.wallet_id, input.amount_usd);
  store.addDailySpend(user.user_id, input.amount_usd);

  // Update session spend if applicable
  const session = store.getActiveSessionForUser(user.user_id);
  if (session) {
    store.updateSessionSpend(session.session_id, input.amount_usd);
  }

  payment.tx_hash = txHash;
  payment.status = "confirmed";
  payment.confirmed_at = new Date().toISOString();

  // Audit
  store.addAuditEntry({
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    event: "payment_executed",
    user_id: input.user_id,
    details: {
      payment_id: payment.payment_id,
      amount_usd: input.amount_usd,
      chain: chainResult.chain,
      tx_hash: txHash,
    },
  });

  return {
    success: true,
    payment,
    chain_selection_reason: chainResult.reason,
    simulation_warnings: sim.warnings,
  };
}

function createPaymentRecord(
  input: ExecutePaymentInput,
  chain: Chain,
  fromWallet: string,
  status: PaymentRequest["status"]
): PaymentRequest {
  return {
    payment_id: `pay_${Date.now()}`,
    user_id: input.user_id,
    merchant_id: input.merchant_id,
    purchase_id: input.purchase_id,
    amount_usd: input.amount_usd,
    token: "USDC",
    chain,
    from_wallet: fromWallet,
    to_wallet: input.merchant_wallet,
    status,
    created_at: new Date().toISOString(),
  };
}
