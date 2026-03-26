// ── In-Memory Data Store with Seed Data ──

import {
  User,
  Wallet,
  Merchant,
  SessionApproval,
  PaymentRequest,
  Receipt,
  AuditLogEntry,
} from "@/lib/types";

// ── Seed Data ──

const users: Map<string, User> = new Map([
  [
    "usr_1",
    {
      user_id: "usr_1",
      name: "Alice",
      default_wallet_id: "w_1",
      allowed_chains: ["base", "polygon"],
      auto_approve_limit_usd: 25,
      daily_limit_usd: 200,
      allowlisted_merchants: ["rideco", "brewhaus", "invoice_co"],
    },
  ],
]);

const wallets: Map<string, Wallet> = new Map([
  [
    "w_1",
    {
      wallet_id: "w_1",
      type: "custodial",
      address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28",
      supported_tokens: ["USDC"],
      chain: "base",
      balance_usdc: 500.0,
    },
  ],
]);

const merchants: Map<string, Merchant> = new Map([
  [
    "rideco",
    {
      merchant_id: "rideco",
      name: "RideCo",
      category: "transport",
      wallets: {
        base: "0xMerchantRideCo_Base_001",
        polygon: "0xMerchantRideCo_Polygon_001",
      },
      allowlisted: true,
    },
  ],
  [
    "brewhaus",
    {
      merchant_id: "brewhaus",
      name: "BrewHaus Coffee",
      category: "food_beverage",
      wallets: {
        base: "0xMerchantBrewHaus_Base_001",
      },
      allowlisted: true,
    },
  ],
  [
    "invoice_co",
    {
      merchant_id: "invoice_co",
      name: "InvoiceCo",
      category: "invoice",
      wallets: {
        base: "0xMerchantInvoiceCo_Base_001",
        polygon: "0xMerchantInvoiceCo_Polygon_001",
        ethereum: "0xMerchantInvoiceCo_Eth_001",
      },
      allowlisted: true,
    },
  ],
]);

const sessions: Map<string, SessionApproval> = new Map();
const payments: Map<string, PaymentRequest> = new Map();
const receipts: Map<string, Receipt> = new Map();
const auditLog: AuditLogEntry[] = [];

// Track daily spend per user (resets conceptually per day)
const dailySpend: Map<string, number> = new Map();

// ── Store API ──

export const store = {
  // Users
  getUser(id: string): User | undefined {
    return users.get(id);
  },

  // Wallets
  getWallet(id: string): Wallet | undefined {
    return wallets.get(id);
  },

  getUserWallet(userId: string): Wallet | undefined {
    const user = users.get(userId);
    if (!user) return undefined;
    return wallets.get(user.default_wallet_id);
  },

  deductBalance(walletId: string, amount: number): boolean {
    const wallet = wallets.get(walletId);
    if (!wallet || wallet.balance_usdc < amount) return false;
    wallet.balance_usdc -= amount;
    return true;
  },

  // Merchants
  getMerchant(id: string): Merchant | undefined {
    return merchants.get(id);
  },

  findMerchantByName(name: string): Merchant | undefined {
    const lower = name.toLowerCase();
    const all = Array.from(merchants.values());
    return all.find(
      (m) => m.name.toLowerCase().includes(lower) || m.merchant_id.includes(lower)
    );
  },

  findMerchantByCategory(category: string): Merchant | undefined {
    const lower = category.toLowerCase();
    const all = Array.from(merchants.values());
    return all.find((m) => m.category.toLowerCase().includes(lower));
  },

  getAllMerchants(): Merchant[] {
    return Array.from(merchants.values());
  },

  // Sessions
  getSession(id: string): SessionApproval | undefined {
    return sessions.get(id);
  },

  getActiveSessionForUser(userId: string): SessionApproval | undefined {
    return Array.from(sessions.values()).find(
      (s) => s.user_id === userId && new Date(s.expires_at) > new Date()
    );
  },

  createSession(session: SessionApproval): void {
    sessions.set(session.session_id, session);
  },

  updateSessionSpend(sessionId: string, amount: number): void {
    const session = sessions.get(sessionId);
    if (session) {
      session.spent_usd += amount;
    }
  },

  // Payments
  getPayment(id: string): PaymentRequest | undefined {
    return payments.get(id);
  },

  savePayment(payment: PaymentRequest): void {
    payments.set(payment.payment_id, payment);
  },

  updatePaymentStatus(
    id: string,
    status: PaymentRequest["status"],
    txHash?: string
  ): void {
    const p = payments.get(id);
    if (p) {
      p.status = status;
      if (txHash) p.tx_hash = txHash;
      if (status === "confirmed") p.confirmed_at = new Date().toISOString();
    }
  },

  // Receipts
  getReceipt(id: string): Receipt | undefined {
    return receipts.get(id);
  },

  saveReceipt(receipt: Receipt): void {
    receipts.set(receipt.receipt_id, receipt);
  },

  getUserReceipts(userId: string): Receipt[] {
    const userPaymentIds = new Set(
      Array.from(payments.values())
        .filter((p) => p.user_id === userId)
        .map((p) => p.payment_id)
    );
    return Array.from(receipts.values()).filter((r) =>
      userPaymentIds.has(r.payment_id)
    );
  },

  // Daily spend tracking
  getDailySpend(userId: string): number {
    return dailySpend.get(userId) || 0;
  },

  addDailySpend(userId: string, amount: number): void {
    const current = dailySpend.get(userId) || 0;
    dailySpend.set(userId, current + amount);
  },

  // Audit log
  addAuditEntry(entry: AuditLogEntry): void {
    auditLog.push(entry);
  },

  getAuditLog(userId?: string): AuditLogEntry[] {
    if (userId) return auditLog.filter((e) => e.user_id === userId);
    return [...auditLog];
  },
};
