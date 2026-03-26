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

export class RideMerchantAdapter implements MerchantAdapter {
  merchantId = "rideco";

  async getQuote(input: QuoteRequest): Promise<QuoteResponse> {
    const merchant = store.getMerchant(this.merchantId)!;
    const destination = (input.params.destination as string) || "downtown";
    const basePrice = 35 + Math.random() * 25; // $35-$60
    const amount = Math.round(basePrice * 100) / 100;

    return {
      quote_id: `q_ride_${Date.now()}`,
      merchant_id: this.merchantId,
      merchant_name: merchant.name,
      amount_usd: amount,
      recipient_wallet: merchant.wallets.base || "",
      supported_chains: Object.keys(merchant.wallets) as QuoteResponse["supported_chains"],
      description: `Ride to ${destination} via ${merchant.name}`,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  }

  async createOrder(_input: CreateOrderRequest): Promise<CreateOrderResponse> {
    orderCounter++;
    return {
      order_id: `ord_ride_${orderCounter}`,
      merchant_id: this.merchantId,
      amount_usd: 0, // filled from quote
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
