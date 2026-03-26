// ── Dynamic Risk Policy ──
// Heuristic-based risk checks: velocity, unusual amounts, etc.

import { PolicyEvaluation } from "@/lib/types";
import { store } from "@/lib/store";
import { PolicyContext } from "./engine";

export function evaluateRiskPolicy(ctx: PolicyContext): PolicyEvaluation {
  const { user, purchase } = ctx;
  const reasons: string[] = [];
  let riskScore = 0;

  // Velocity check: many transactions today
  const dailySpend = store.getDailySpend(user.user_id);
  if (dailySpend > user.daily_limit_usd * 0.7) {
    riskScore += 0.3;
    reasons.push("high_daily_spend_velocity");
  }

  // Large amount relative to auto-approve
  if (purchase.amount_usd > user.auto_approve_limit_usd * 3) {
    riskScore += 0.3;
    reasons.push("amount_significantly_above_normal");
  }

  // Round number check (common in social engineering)
  if (purchase.amount_usd >= 100 && purchase.amount_usd % 50 === 0) {
    riskScore += 0.1;
    reasons.push("round_number_amount");
  }

  // High risk score
  if (riskScore >= 0.8) {
    return {
      decision: "REQUIRE_APPROVAL",
      reasons: [`risk_score_high (${riskScore.toFixed(2)})`, ...reasons],
    };
  }

  if (riskScore >= 0.3) {
    return {
      decision: "ALLOW_WITH_LOG",
      reasons: [`risk_score_moderate (${riskScore.toFixed(2)})`, ...reasons],
    };
  }

  reasons.push("risk_check_passed");
  return { decision: "ALLOW", reasons };
}
