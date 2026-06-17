import { stockAdjustmentSchema, stockEntrySchema, stockPageResponseSchema, type StockPageResponse } from "shared";

import { getServerApiUrl } from "./api";

const emptyStockPageResponse: StockPageResponse = {
  products: [],
  movements: [],
  summary: { totalProducts: 0, lowStockProducts: 0, totalUnits: 0 },
};

export function stockEntryFormToPayload(formData: FormData) {
  return stockEntrySchema.parse({
    productId: String(formData.get("productId") ?? ""),
    quantity: String(formData.get("quantity") ?? ""),
    reason: String(formData.get("reason") ?? ""),
  });
}

export function stockAdjustmentFormToPayload(formData: FormData) {
  return stockAdjustmentSchema.parse({
    productId: String(formData.get("productId") ?? ""),
    newQuantity: String(formData.get("newQuantity") ?? ""),
    reason: String(formData.get("reason") ?? ""),
  });
}

export async function fetchStockPage(cookieHeader: string): Promise<StockPageResponse> {
  const response = await fetch(`${getServerApiUrl()}/stock`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!response.ok) {
    return emptyStockPageResponse;
  }

  return stockPageResponseSchema.parse(await response.json());
}
