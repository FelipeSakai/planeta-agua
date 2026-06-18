import type { ProductResponse } from "shared";

export type ProductStatusFilter = "ALL" | "ACTIVE" | "LOW" | "INACTIVE";

type FilterableProduct = Pick<ProductResponse, "description" | "isActive" | "isLowStock" | "name">;

export function filterProducts<T extends FilterableProduct>(products: T[], options: { search: string; status: ProductStatusFilter }) {
  const normalizedSearch = normalizeSearchText(options.search);

  return products
    .filter((product) => normalizeSearchText(product.name).includes(normalizedSearch) || normalizeSearchText(product.description ?? "").includes(normalizedSearch))
    .filter((product) => {
      if (options.status === "ACTIVE") return product.isActive;
      if (options.status === "LOW") return product.isLowStock;
      if (options.status === "INACTIVE") return !product.isActive;
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function normalizeSearchText(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
