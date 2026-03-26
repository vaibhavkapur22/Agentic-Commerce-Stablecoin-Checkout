// ── Session Policy ──
// Evaluates temporary delegated permissions (session approvals).

import { PolicyEvaluation } from "@/lib/types";
import { PolicyContext } from "./engine";

export function evaluateSessionPolicy(ctx: PolicyContext): PolicyEvaluation {
  const { session, purchase, merchant } = ctx;
  const reasons: string[] = [];

  // No active session — cannot auto-approve via session
  if (!session) {
    reasons.push("no_active_session");
    // Don't deny, just don't contribute an ALLOW
    return { decision: "ALLOW", reasons };
  }

  // Check session expiry
  if (new Date(session.expires_at) < new Date()) {
    reasons.push("session_expired");
    return { decision: "REQUIRE_APPROVAL", reasons };
  }

  // Check merchant scope
  const inScope =
    session.merchant_scope.includes(merchant.merchant_id) ||
    session.merchant_scope.includes(merchant.category);
  if (!inScope) {
    reasons.push("merchant_outside_session_scope");
    return { decision: "REQUIRE_APPROVAL", reasons };
  }

  // Check single transaction limit
  if (purchase.amount_usd > session.single_txn_limit_usd) {
    reasons.push(
      `amount_exceeds_session_txn_limit ($${purchase.amount_usd} > $${session.single_txn_limit_usd})`
    );
    return { decision: "REQUIRE_APPROVAL", reasons };
  }

  // Check session total spend
  if (session.spent_usd + purchase.amount_usd > session.max_spend_usd) {
    reasons.push("session_spend_limit_would_be_exceeded");
    return { decision: "REQUIRE_APPROVAL", reasons };
  }

  reasons.push("session_policy_allows_auto_approve");
  return { decision: "ALLOW", reasons };
}
