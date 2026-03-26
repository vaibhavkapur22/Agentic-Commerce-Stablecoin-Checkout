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

const MENU: Record<string, number> = {
  coffee: 5.50,
  latte: 6.50,
  espresso: 4.00,
  cappuccino: 6.00,
  mocha: 7.00,
  tea: 4.50,
  default: 5.50,
};

export class CoffeeMerchantAdapter implements MerchantAdapter {
  merchantId = "brewhaus";

  async getQuote(input: QuoteRequest): Promise<QuoteResponse> {
    const merchant = store.getMerchant(this.merchantId)!;
    const item = ((input.params.item as string) || "coffee").toLowerCase();
    const amount = MENU[item] ?? MENU.default;

    return {
      quote_id: `q_coffee_${Date.now()}`,
      merchant_id: this.merchantId,
      merchant_name: merchant.name,
      amount_usd: amount,
      recipient_wallet: merchant.wallets.base || "",
      supported_chains: Object.keys(merchant.wallets) as QuoteResponse["supported_chains"],
      description: `${item.charAt(0).toUpperCase() + item.slice(1)} from ${merchant.name}`,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
  }

  async createOrder(_input: CreateOrderRequest): Promise<CreateOrderResponse> {
    orderCounter++;
    return {
      order_id: `ord_coffee_${orderCounter}`,
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
