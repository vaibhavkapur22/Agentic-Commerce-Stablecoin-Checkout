// ── Receipt Generator ──
// Creates receipts and audit trail entries after payment execution.

import {
  Receipt,
  PaymentRequest,
  PolicyDecision,
  PurchaseRequest,
} from "@/lib/types";
import { store } from "@/lib/store";

export interface GenerateReceiptInput {
  payment: PaymentRequest;
  purchase: PurchaseRequest;
  merchantName: string;
  policyDecision: PolicyDecision;
  policyReasons: string[];
  userApproved: boolean;
}

export function generateReceipt(input: GenerateReceiptInput): Receipt {
  const receipt: Receipt = {
    receipt_id: `rcpt_${Date.now()}`,
    payment_id: input.payment.payment_id,
    purchase_id: input.purchase.purchase_id,
    merchant_id: input.payment.merchant_id,
    merchant_name: input.merchantName,
    amount_usd: input.payment.amount_usd,
    token: input.payment.token,
    chain: input.payment.chain,
    tx_hash: input.payment.tx_hash || "pending",
    status: input.payment.status === "confirmed" ? "confirmed" : "failed",
    policy_decision: input.policyDecision,
    policy_reasons: input.policyReasons,
    user_approved: input.userApproved,
    created_at: new Date().toISOString(),
  };

  store.saveReceipt(receipt);

  store.addAuditEntry({
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    event: "receipt_created",
    user_id: input.payment.user_id,
    details: {
      receipt_id: receipt.receipt_id,
      payment_id: receipt.payment_id,
      amount_usd: receipt.amount_usd,
      chain: receipt.chain,
      tx_hash: receipt.tx_hash,
      status: receipt.status,
    },
  });

  return receipt;
}
