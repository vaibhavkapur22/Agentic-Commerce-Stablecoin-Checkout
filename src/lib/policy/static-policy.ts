// ── Static Policy ──
// User-configured hard rules: merchant allowlist, chain allowlist, spend limits.

import { PolicyEvaluation } from "@/lib/types";
import { store } from "@/lib/store";
import { PolicyContext } from "./engine";

export function evaluateStaticPolicy(ctx: PolicyContext): PolicyEvaluation {
  const { user, merchant, purchase } = ctx;
  const reasons: string[] = [];

  // Check merchant allowlist
  if (!user.allowlisted_merchants.includes(merchant.merchant_id)) {
    return {
      decision: "DENY",
      reasons: ["merchant_not_allowlisted"],
    };
  }

  // Check chain allowlist
  const hasAllowedChain = purchase.chain_options.some((c) =>
    user.allowed_chains.includes(c)
  );
  if (!hasAllowedChain) {
    return {
      decision: "DENY",
      reasons: ["no_allowed_chain_available"],
    };
  }

  // Check daily limit
  const dailySpend = store.getDailySpend(user.user_id);
  if (dailySpend + purchase.amount_usd > user.daily_limit_usd) {
    return {
      decision: "DENY",
      reasons: [
        `daily_limit_exceeded (spent: $${dailySpend.toFixed(2)}, limit: $${user.daily_limit_usd})`,
      ],
    };
  }

  // Check auto-approve threshold
  if (purchase.amount_usd > user.auto_approve_limit_usd) {
    reasons.push(
      `amount_above_auto_approve_limit ($${purchase.amount_usd} > $${user.auto_approve_limit_usd})`
    );
    return {
      decision: "REQUIRE_APPROVAL",
      reasons,
    };
  }

  // Check wallet balance
  const wallet = store.getUserWallet(user.user_id);
  if (!wallet || wallet.balance_usdc < purchase.amount_usd) {
    return {
      decision: "DENY",
      reasons: ["insufficient_wallet_balance"],
    };
  }

  reasons.push("static_policy_passed");
  return { decision: "ALLOW", reasons };
}
