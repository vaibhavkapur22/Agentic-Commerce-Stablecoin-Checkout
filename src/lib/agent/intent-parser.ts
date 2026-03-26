// ── Intent Parser ──
// Parses natural language into structured intents.
// In production this would use an LLM with tool calling.
// For MVP, we use rule-based parsing.

import { ParsedIntent } from "@/lib/types";

const INTENT_PATTERNS: Array<{
  patterns: RegExp[];
  intent: string;
  category: string;
}> = [
  {
    patterns: [
      /(?:book|get|call|order)\s+(?:me\s+)?(?:a\s+)?(?:\$?([\d.]+)\s+)?(?:ride|taxi|uber|lyft|car)/i,
      /ride\s+to\s+(.+?)(?:\s+for\s+\$?([\d.]+))?$/i,
    ],
    intent: "purchase_ride",
    category: "transport",
  },
  {
    patterns: [
      /(?:buy|get|order)\s+(?:me\s+)?(?:a\s+)?(?:\$?([\d.]+)\s+)?(coffee|latte|espresso|cappuccino|mocha|tea)/i,
      /(?:buy|get|order)\s+(?:me\s+)?(?:a\s+)?(coffee|latte|espresso|cappuccino|mocha|tea)/i,
    ],
    intent: "purchase_coffee",
    category: "food_beverage",
  },
  {
    patterns: [
      /(?:pay|settle)\s+(?:this\s+)?(?:the\s+)?invoice(?:\s+(?:for\s+)?\$?([\d.]+))?/i,
      /(?:pay|send)\s+\$?([\d.]+)\s+(?:to|for)\s+(?:the\s+)?invoice/i,
    ],
    intent: "pay_invoice",
    category: "invoice",
  },
  {
    patterns: [
      /(?:send|transfer|pay)\s+\$?([\d.]+)\s+(?:USDC\s+)?(?:to)\s+(.+)/i,
    ],
    intent: "send_payment",
    category: "payment",
  },
  {
    patterns: [
      /(?:top\s*up|add|load)\s+(?:my\s+)?(?:transit|metro|bus)\s+(?:card|pass)(?:\s+(?:with\s+)?\$?([\d.]+))?/i,
    ],
    intent: "topup_transit",
    category: "transport",
  },
];

export function parseIntent(message: string): ParsedIntent {
  const trimmed = message.trim();

  for (const { patterns, intent, category } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        return buildIntent(intent, category, match, trimmed);
      }
    }
  }

  // Fallback: try to detect amount and merchant references
  const amountMatch = trimmed.match(/\$?([\d.]+)/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : undefined;

  return {
    intent: "unknown",
    description: trimmed,
    amount_usd: amount,
    confidence: 0.3,
  };
}

function buildIntent(
  intent: string,
  category: string,
  match: RegExpMatchArray,
  original: string
): ParsedIntent {
  // Extract amount from various capture group positions
  let amount: number | undefined;
  for (let i = 1; i < match.length; i++) {
    const val = parseFloat(match[i]);
    if (!isNaN(val) && val > 0 && val < 10000) {
      amount = val;
      break;
    }
  }

  // Extract destination for ride intents
  let destination: string | undefined;
  if (intent === "purchase_ride") {
    const destMatch = original.match(/(?:to|towards|going to)\s+(.+?)(?:\s+for|\s*$)/i);
    if (destMatch) destination = destMatch[1].trim();
  }

  // Extract recipient for send intents
  let recipient: string | undefined;
  if (intent === "send_payment") {
    const recipMatch = original.match(/to\s+(.+)$/i);
    if (recipMatch) recipient = recipMatch[1].trim();
  }

  // Extract drink type for coffee
  let merchantName: string | undefined;
  if (intent === "purchase_coffee") {
    const drinkMatch = original.match(/(coffee|latte|espresso|cappuccino|mocha|tea)/i);
    if (drinkMatch) merchantName = drinkMatch[1];
  }

  return {
    intent,
    merchant_category: category,
    merchant_name: merchantName,
    amount_usd: amount,
    max_amount_usd: amount ? amount * 1.1 : undefined,
    recipient,
    destination,
    description: original,
    confidence: amount ? 0.92 : 0.75,
  };
}
