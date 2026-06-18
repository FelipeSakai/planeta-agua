import type { ProductResponse } from "shared";

export type ProductStatusFilter = "ALL" | "ACTIVE" | "LOW" | "INACTIVE";

type FilterableProduct = Pick<ProductResponse, "description" | "isActive" | "isLowStock" | "name">;

export function filterProducts<T extends FilterableProduct>(products: T[], options: { search: string; status: ProductStatusFilter }) {
  const normalizedSearch = options.search.trim().toLowerCase();

  return products
    .filter((product) => product.name.toLowerCase().includes(normalizedSearch) || (product.description ?? "").toLowerCase().includes(normalizedSearch))
    .filter((product) => {
      if (options.status === "ACTIVE") return product.isActive;
      if (options.status === "LOW") return product.isLowStock;
      if (options.status === "INACTIVE") return !product.isActive;
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
