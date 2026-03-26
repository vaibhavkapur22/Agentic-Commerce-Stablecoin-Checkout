import { QuoteRequest, QuoteResponse } from "@/lib/types";

export interface CreateOrderRequest {
  quote_id: string;
  merchant_id: string;
  user_id: string;
}

export interface CreateOrderResponse {
  order_id: string;
  merchant_id: string;
  amount_usd: number;
  status: "created" | "pending_payment";
}

export interface ConfirmPaymentRequest {
  order_id: string;
  tx_hash: string;
  chain: string;
}

export interface ConfirmPaymentResponse {
  order_id: string;
  status: "acknowledged" | "pending_confirmation";
}

export interface MerchantAdapter {
  merchantId: string;
  getQuote(input: QuoteRequest): Promise<QuoteResponse>;
  createOrder(input: CreateOrderRequest): Promise<CreateOrderResponse>;
  confirmPayment(input: ConfirmPaymentRequest): Promise<ConfirmPaymentResponse>;
}
