// ── Core Types for Agentic Commerce + Stablecoin Checkout ──

export type Chain = "base" | "ethereum" | "polygon" | "solana";
export type Token = "USDC";
export type PolicyDecision = "ALLOW" | "ALLOW_WITH_LOG" | "REQUIRE_APPROVAL" | "DENY";

// ── User ──
export interface User {
  user_id: string;
  name: string;
  default_wallet_id: string;
  allowed_chains: Chain[];
  auto_approve_limit_usd: number;
  daily_limit_usd: number;
  allowlisted_merchants: string[];
}

// ── Wallet ──
export interface Wallet {
  wallet_id: string;
  type: "custodial" | "smart_contract" | "external";
  address: string;
  supported_tokens: Token[];
  chain: Chain;
  balance_usdc: number;
}

// ── Merchant ──
export interface Merchant {
  merchant_id: string;
  name: string;
  category: string;
  wallets: Partial<Record<Chain, string>>;
  allowlisted: boolean;
}

// ── Session Approval ──
export interface SessionApproval {
  session_id: string;
  user_id: string;
  merchant_scope: string[];       // merchant IDs or categories
  max_spend_usd: number;
  single_txn_limit_usd: number;
  spent_usd: number;              // amount already spent in this session
  expires_at: string;             // ISO timestamp
  created_at: string;
}

// ── Quote ──
export interface QuoteRequest {
  merchant_id: string;
  service_type: string;
  params: Record<string, unknown>;
}

export interface QuoteResponse {
  quote_id: string;
  merchant_id: string;
  merchant_name: string;
  amount_usd: number;
  recipient_wallet: string;
  supported_chains: Chain[];
  description: string;
  expires_at: string;
}

// ── Purchase Request (from orchestrator) ──
export interface PurchaseRequest {
  purchase_id: string;
  user_id: string;
  merchant_id: string;
  quote_id: string;
  amount_usd: number;
  max_amount_usd: number;
  merchant_wallet: string;
  chain_options: Chain[];
  description: string;
}

// ── Policy Evaluation ──
export interface PolicyEvaluation {
  decision: PolicyDecision;
  reasons: string[];
  allowed_max?: number;
  approval_method?: string;
}

// ── Payment Request ──
export interface PaymentRequest {
  payment_id: string;
  user_id: string;
  merchant_id: string;
  purchase_id: string;
  amount_usd: number;
  token: Token;
  chain: Chain;
  from_wallet: string;
  to_wallet: string;
  status: "pending" | "simulated" | "submitted" | "confirmed" | "failed";
  tx_hash?: string;
  created_at: string;
  confirmed_at?: string;
}

// ── Receipt ──
export interface Receipt {
  receipt_id: string;
  payment_id: string;
  purchase_id: string;
  merchant_id: string;
  merchant_name: string;
  amount_usd: number;
  token: Token;
  chain: Chain;
  tx_hash: string;
  status: "confirmed" | "failed";
  policy_decision: PolicyDecision;
  policy_reasons: string[];
  user_approved: boolean;
  created_at: string;
}

// ── Intent (parsed from natural language) ──
export interface ParsedIntent {
  intent: string;
  merchant_category?: string;
  merchant_name?: string;
  amount_usd?: number;
  max_amount_usd?: number;
  recipient?: string;
  destination?: string;
  description: string;
  confidence: number;
}

// ── Audit Log Entry ──
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  event: string;
  user_id: string;
  details: Record<string, unknown>;
}

// ── Chat Messages ──
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  metadata?: {
    type?: "text" | "intent" | "quote" | "policy" | "approval_request" | "payment" | "receipt" | "error";
    data?: unknown;
  };
}

// ── API types ──
export interface ChatRequest {
  message: string;
  user_id: string;
  session_id?: string;
  approval_response?: "approve" | "deny";
  pending_purchase_id?: string;
}

export interface ChatResponse {
  messages: ChatMessage[];
  requires_approval?: boolean;
  pending_purchase?: PurchaseRequest;
  receipt?: Receipt;
}
