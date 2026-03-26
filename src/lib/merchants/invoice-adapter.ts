import { QuoteRequest, QuoteResponse } from "@/lib/types";
import {
  MerchantAdapter,
  CreateOrderRequest,
  CreateOrderResponse,
  ConfirmPaymentRequest,
  ConfirmPaymentResponse,
} from "./types";
import { store } from "@/lib/store";

let orderCounter = 0;

export class InvoiceMerchantAdapter implements MerchantAdapter {
  merchantId = "invoice_co";

  async getQuote(input: QuoteRequest): Promise<QuoteResponse> {
    const merchant = store.getMerchant(this.merchantId)!;
    const amount = (input.params.amount as number) || 100.0;
    const invoiceRef = (input.params.reference as string) || `INV-${Date.now()}`;

    return {
      quote_id: `q_inv_${Date.now()}`,
      merchant_id: this.merchantId,
      merchant_name: merchant.name,
      amount_usd: amount,
      recipient_wallet: merchant.wallets.base || "",
      supported_chains: Object.keys(merchant.wallets) as QuoteResponse["supported_chains"],
      description: `Invoice payment ${invoiceRef} to ${merchant.name}`,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  async createOrder(_input: CreateOrderRequest): Promise<CreateOrderResponse> {
    orderCounter++;
    return {
      order_id: `ord_inv_${orderCounter}`,
      merchant_id: this.merchantId,
      amount_usd: 0,
      status: "pending_payment",
    };
  }

  async confirmPayment(input: ConfirmPaymentRequest): Promise<ConfirmPaymentResponse> {
    return {
      order_id: input.order_id,
      status: "acknowledged",
    };
  }
}
