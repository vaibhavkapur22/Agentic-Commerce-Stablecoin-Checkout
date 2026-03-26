// ── Composite Policy Engine ──
// Evaluates static, session, and risk policies in order.

import {
  User,
  Merchant,
  SessionApproval,
  PolicyEvaluation,
  PolicyDecision,
  PurchaseRequest,
} from "@/lib/types";
import { store } from "@/lib/store";
import { evaluateStaticPolicy } from "./static-policy";
import { evaluateSessionPolicy } from "./session-policy";
import { evaluateRiskPolicy } from "./risk-policy";

export interface PolicyContext {
  user: User;
  merchant: Merchant;
  purchase: PurchaseRequest;
  session?: SessionApproval;
}

export function evaluatePolicy(ctx: PolicyContext): PolicyEvaluation {
  const reasons: string[] = [];

  // Layer 1: Static policy (hard rules)
  const staticResult = evaluateStaticPolicy(ctx);
  if (staticResult.decision === "DENY") {
    return staticResult;
  }
  reasons.push(...staticResult.reasons);

  // Layer 2: Session policy (delegated permissions)
  const sessionResult = evaluateSessionPolicy(ctx);
  reasons.push(...sessionResult.reasons);

  // Layer 3: Risk policy (heuristics)
  const riskResult = evaluateRiskPolicy(ctx);
  reasons.push(...riskResult.reasons);

  // Compose final decision (most restrictive wins)
  const decisions: PolicyDecision[] = [
    staticResult.decision,
    sessionResult.decision,
    riskResult.decision,
  ];

  let finalDecision: PolicyDecision = "ALLOW";

  if (decisions.includes("DENY")) {
    finalDecision = "DENY";
  } else if (decisions.includes("REQUIRE_APPROVAL")) {
    finalDecision = "REQUIRE_APPROVAL";
  } else if (decisions.includes("ALLOW_WITH_LOG")) {
    finalDecision = "ALLOW_WITH_LOG";
  }

  // Log audit entry
  store.addAuditEntry({
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    event: "policy_evaluation",
    user_id: ctx.user.user_id,
    details: {
      purchase_id: ctx.purchase.purchase_id,
      merchant_id: ctx.merchant.merchant_id,
      amount_usd: ctx.purchase.amount_usd,
      decision: finalDecision,
      reasons,
    },
  });

  return {
    decision: finalDecision,
    reasons,
    allowed_max: ctx.user.auto_approve_limit_usd,
    approval_method:
      finalDecision === "REQUIRE_APPROVAL"
        ? "user_confirm_in_chat"
        : undefined,
  };
}
