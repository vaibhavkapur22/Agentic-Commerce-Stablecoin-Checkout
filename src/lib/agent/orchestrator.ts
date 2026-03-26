// ── Agent Orchestrator ──
// Central coordination: intent → merchant → policy → payment → receipt.
// This is the "brain" that ties all layers together.

import {
  ChatMessage,
  ChatResponse,
  PurchaseRequest,
  PolicyEvaluation,
  QuoteResponse,
  Receipt,
} from "@/lib/types";
import { store } from "@/lib/store";
import { parseIntent } from "./intent-parser";
import { getAdapter, resolveMerchantFromCategory } from "@/lib/merchants/registry";
import { evaluatePolicy } from "@/lib/policy/engine";
import { executePayment } from "@/lib/payment/executor";
import { generateReceipt } from "@/lib/receipt/generator";

// In-memory pending purchases awaiting user approval
const pendingPurchases: Map<string, {
  purchase: PurchaseRequest;
  quote: QuoteResponse;
  policy: PolicyEvaluation;
}> = new Map();

function msg(role: "assistant" | "system", content: string, type?: NonNullable<ChatMessage["metadata"]>["type"], data?: unknown): ChatMessage {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    role,
    content,
    timestamp: new Date().toISOString(),
    metadata: { type: type || "text", data },
  };
}

export async function handleUserMessage(
  message: string,
  userId: string,
  approvalResponse?: "approve" | "deny",
  pendingPurchaseId?: string
): Promise<ChatResponse> {
  const messages: ChatMessage[] = [];

  // Handle approval responses
  if (approvalResponse && pendingPurchaseId) {
    return handleApproval(pendingPurchaseId, approvalResponse, userId);
  }

  // Check for session creation commands
  const sessionMatch = message.match(
    /(?:for the next|allow|let the agent)\s+(?:(\d+)\s*(?:hour|hr|min|minute)s?)?.*(?:spend|pay|rides?|coffee|transport|food).*?(?:under\s+)?\$?([\d.]+)/i
  );
  if (sessionMatch) {
    return handleSessionCreation(message, userId, sessionMatch);
  }

  // Check for history/balance queries
  if (/(?:history|transactions|receipts|balance|how much)/i.test(message)) {
    return handleInfoQuery(message, userId);
  }

  // Step 1: Parse intent
  const intent = parseIntent(message);
  messages.push(
    msg("assistant", `Understood: **${intent.description}**`, "intent", intent)
  );

  if (intent.intent === "unknown") {
    messages.push(
      msg(
        "assistant",
        "I couldn't understand that request. I can help with:\n- Booking rides (\"Book me a $50 ride to JFK\")\n- Ordering coffee (\"Buy me a latte\")\n- Paying invoices (\"Pay this invoice for $100\")\n- Sending USDC (\"Send $20 to Alice\")"
      )
    );
    return { messages };
  }

  // Step 2: Resolve merchant
  const merchantId =
    resolveMerchantFromCategory(intent.merchant_category || "") ||
    resolveMerchantFromCategory(intent.intent.replace("purchase_", "").replace("pay_", ""));

  const merchant = merchantId
    ? store.getMerchant(merchantId)
    : store.findMerchantByCategory(intent.merchant_category || "");

  if (!merchant) {
    messages.push(
      msg("assistant", `Could not find a suitable merchant for "${intent.merchant_category}".`, "error")
    );
    return { messages };
  }

  // Step 3: Get quote
  const adapter = getAdapter(merchant.merchant_id);
  if (!adapter) {
    messages.push(msg("assistant", `No adapter available for merchant ${merchant.name}.`, "error"));
    return { messages };
  }

  const quote = await adapter.getQuote({
    merchant_id: merchant.merchant_id,
    service_type: intent.intent,
    params: {
      destination: intent.destination,
      item: intent.merchant_name,
      amount: intent.amount_usd,
      reference: intent.recipient,
    },
  });

  messages.push(
    msg(
      "assistant",
      `Got quote from **${quote.merchant_name}**: **$${quote.amount_usd.toFixed(2)} USDC** — ${quote.description}`,
      "quote",
      quote
    )
  );

  // Step 4: Build purchase request
  const purchase: PurchaseRequest = {
    purchase_id: `pur_${Date.now()}`,
    user_id: userId,
    merchant_id: merchant.merchant_id,
    quote_id: quote.quote_id,
    amount_usd: quote.amount_usd,
    max_amount_usd: intent.max_amount_usd || quote.amount_usd,
    merchant_wallet: quote.recipient_wallet,
    chain_options: quote.supported_chains,
    description: quote.description,
  };

  // Step 5: Evaluate policy
  const user = store.getUser(userId);
  if (!user) {
    messages.push(msg("assistant", "User not found.", "error"));
    return { messages };
  }

  const session = store.getActiveSessionForUser(userId);
  const policyResult = evaluatePolicy({
    user,
    merchant,
    purchase,
    session,
  });

  messages.push(
    msg(
      "assistant",
      `Policy: **${policyResult.decision}** — ${policyResult.reasons.join(", ")}`,
      "policy",
      policyResult
    )
  );

  // Step 6: Act on policy decision
  switch (policyResult.decision) {
    case "DENY":
      messages.push(
        msg("assistant", `Payment denied: ${policyResult.reasons.join(", ")}. No funds were moved.`, "error")
      );
      return { messages };

    case "REQUIRE_APPROVAL":
      pendingPurchases.set(purchase.purchase_id, { purchase, quote, policy: policyResult });
      messages.push(
        msg(
          "assistant",
          `This purchase requires your approval:\n\n` +
            `- **Merchant**: ${quote.merchant_name}\n` +
            `- **Amount**: $${quote.amount_usd.toFixed(2)} USDC\n` +
            `- **Description**: ${quote.description}\n` +
            `- **Reason**: ${policyResult.reasons.join(", ")}\n\n` +
            `Do you approve this payment?`,
          "approval_request",
          { purchase, quote, policy: policyResult }
        )
      );
      return {
        messages,
        requires_approval: true,
        pending_purchase: purchase,
      };

    case "ALLOW":
    case "ALLOW_WITH_LOG":
      return executeAndReceipt(purchase, quote, policyResult, merchant.name, false, messages);
  }
}

async function handleApproval(
  purchaseId: string,
  response: "approve" | "deny",
  userId: string
): Promise<ChatResponse> {
  const messages: ChatMessage[] = [];
  const pending = pendingPurchases.get(purchaseId);

  if (!pending) {
    messages.push(msg("assistant", "No pending purchase found with that ID.", "error"));
    return { messages };
  }

  pendingPurchases.delete(purchaseId);

  if (response === "deny") {
    messages.push(msg("assistant", "Payment cancelled. No funds were moved."));
    store.addAuditEntry({
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      event: "payment_denied_by_user",
      user_id: userId,
      details: { purchase_id: purchaseId },
    });
    return { messages };
  }

  const merchant = store.getMerchant(pending.purchase.merchant_id);
  return executeAndReceipt(
    pending.purchase,
    pending.quote,
    pending.policy,
    merchant?.name || "Unknown",
    true,
    messages
  );
}

async function executeAndReceipt(
  purchase: PurchaseRequest,
  quote: QuoteResponse,
  policy: PolicyEvaluation,
  merchantName: string,
  userApproved: boolean,
  messages: ChatMessage[]
): Promise<ChatResponse> {
  // Execute payment
  messages.push(msg("assistant", "Executing payment...", "payment"));

  const result = await executePayment({
    user_id: purchase.user_id,
    merchant_id: purchase.merchant_id,
    purchase_id: purchase.purchase_id,
    amount_usd: purchase.amount_usd,
    merchant_wallet: purchase.merchant_wallet,
    chain_options: purchase.chain_options,
  });

  if (!result.success) {
    messages.push(
      msg("assistant", `Payment failed: ${result.error}`, "error")
    );
    return { messages };
  }

  messages.push(
    msg("assistant", `Chain: ${result.chain_selection_reason}`, "text")
  );

  // Generate receipt
  const receipt = generateReceipt({
    payment: result.payment,
    purchase,
    merchantName,
    policyDecision: policy.decision,
    policyReasons: policy.reasons,
    userApproved,
  });

  messages.push(
    msg(
      "assistant",
      formatReceipt(receipt),
      "receipt",
      receipt
    )
  );

  return { messages, receipt };
}

function handleSessionCreation(
  message: string,
  userId: string,
  match: RegExpMatchArray
): ChatResponse {
  const hours = parseInt(match[1]) || 1;
  const amount = parseFloat(match[2]) || 50;

  // Detect category from message
  let scope: string[] = [];
  if (/ride|transport|taxi|uber/i.test(message)) scope = ["rideco", "transport"];
  else if (/coffee|food|beverage/i.test(message)) scope = ["brewhaus", "food_beverage"];
  else scope = ["rideco", "brewhaus", "invoice_co"];

  const session = {
    session_id: `sess_${Date.now()}`,
    user_id: userId,
    merchant_scope: scope,
    max_spend_usd: amount,
    single_txn_limit_usd: amount,
    spent_usd: 0,
    expires_at: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  };

  store.createSession(session);

  store.addAuditEntry({
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    event: "session_created",
    user_id: userId,
    details: { session },
  });

  return {
    messages: [
      msg(
        "assistant",
        `Session created! For the next ${hours} hour(s), I can auto-approve payments:\n\n` +
          `- **Scope**: ${scope.join(", ")}\n` +
          `- **Max spend**: $${amount.toFixed(2)}\n` +
          `- **Per transaction limit**: $${amount.toFixed(2)}\n` +
          `- **Expires**: ${new Date(session.expires_at).toLocaleTimeString()}\n\n` +
          `Payments within these limits will execute without additional approval.`
      ),
    ],
  };
}

function handleInfoQuery(message: string, userId: string): ChatResponse {
  const messages: ChatMessage[] = [];

  if (/balance/i.test(message)) {
    const wallet = store.getUserWallet(userId);
    const dailySpend = store.getDailySpend(userId);
    const user = store.getUser(userId);
    messages.push(
      msg(
        "assistant",
        `**Wallet Balance**: $${wallet?.balance_usdc.toFixed(2) || "0.00"} USDC\n` +
          `**Today's Spend**: $${dailySpend.toFixed(2)} / $${user?.daily_limit_usd || 0} daily limit\n` +
          `**Chain**: ${wallet?.chain || "N/A"}\n` +
          `**Address**: \`${wallet?.address || "N/A"}\``
      )
    );
  }

  if (/history|transactions|receipts/i.test(message)) {
    const receipts = store.getUserReceipts(userId);
    if (receipts.length === 0) {
      messages.push(msg("assistant", "No transactions yet."));
    } else {
      const lines = receipts.map(
        (r) =>
          `- **$${r.amount_usd.toFixed(2)}** to ${r.merchant_name} on ${r.chain} — ${r.status} (\`${r.tx_hash.slice(0, 10)}...\`)`
      );
      messages.push(
        msg("assistant", `**Transaction History**:\n\n${lines.join("\n")}`)
      );
    }
  }

  if (messages.length === 0) {
    const wallet = store.getUserWallet(userId);
    messages.push(
      msg("assistant", `**Balance**: $${wallet?.balance_usdc.toFixed(2) || "0.00"} USDC`)
    );
  }

  return { messages };
}

function formatReceipt(receipt: Receipt): string {
  return (
    `**Payment Confirmed!**\n\n` +
    `| Field | Value |\n` +
    `|-------|-------|\n` +
    `| Receipt ID | \`${receipt.receipt_id}\` |\n` +
    `| Merchant | ${receipt.merchant_name} |\n` +
    `| Amount | $${receipt.amount_usd.toFixed(2)} USDC |\n` +
    `| Chain | ${receipt.chain} |\n` +
    `| Tx Hash | \`${receipt.tx_hash.slice(0, 18)}...\` |\n` +
    `| Status | ${receipt.status} |\n` +
    `| Policy | ${receipt.policy_decision} |\n` +
    `| Approved by user | ${receipt.user_approved ? "Yes" : "Auto-approved"} |`
  );
}
