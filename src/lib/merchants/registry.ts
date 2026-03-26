import { MerchantAdapter } from "./types";
import { RideMerchantAdapter } from "./ride-adapter";
import { CoffeeMerchantAdapter } from "./coffee-adapter";
import { InvoiceMerchantAdapter } from "./invoice-adapter";

const adapters: Map<string, MerchantAdapter> = new Map();

function register(adapter: MerchantAdapter) {
  adapters.set(adapter.merchantId, adapter);
}

// Register all adapters
register(new RideMerchantAdapter());
register(new CoffeeMerchantAdapter());
register(new InvoiceMerchantAdapter());

export function getAdapter(merchantId: string): MerchantAdapter | undefined {
  return adapters.get(merchantId);
}

// Map categories to merchant IDs for intent resolution
const categoryMap: Record<string, string> = {
  ride: "rideco",
  transport: "rideco",
  taxi: "rideco",
  uber: "rideco",
  lyft: "rideco",
  coffee: "brewhaus",
  cafe: "brewhaus",
  food: "brewhaus",
  beverage: "brewhaus",
  invoice: "invoice_co",
  bill: "invoice_co",
  payment: "invoice_co",
};

export function resolveMerchantFromCategory(category: string): string | undefined {
  return categoryMap[category.toLowerCase()];
}
