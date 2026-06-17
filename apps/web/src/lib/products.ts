import { createProductSchema, parseBRLToCents, productsListResponseSchema, type ProductsListResponse } from "shared";

import { getServerApiUrl } from "./api";

const emptyProductsResponse: ProductsListResponse = {
  products: [],
  summary: { total: 0, active: 0, lowStock: 0 },
};

export function productFormToPayload(formData: FormData) {
  return createProductSchema.parse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    salePriceCents: parseBRLToCents(String(formData.get("salePrice") ?? "")),
    stockQuantity: String(formData.get("stockQuantity") ?? ""),
    minimumStock: String(formData.get("minimumStock") ?? ""),
  });
}

export function getProductStatusLabel(isActive: boolean) {
  return isActive ? "Ativo" : "Inativo";
}

export async function fetchProducts(cookieHeader: string): Promise<ProductsListResponse> {
  const response = await fetch(`${getServerApiUrl()}/products`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!response.ok) {
    return emptyProductsResponse;
  }

  return productsListResponseSchema.parse(await response.json());
}
