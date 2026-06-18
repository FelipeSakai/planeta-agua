import type { StockPageResponse } from "shared";

export type StockProduct = StockPageResponse["products"][number];
export type StockMovement = StockPageResponse["movements"][number];
export type StockStatusFilter = "ALL" | "LOW" | "OK" | "INACTIVE";
export type StockSort = "NAME" | "LOWEST_STOCK" | "HIGHEST_STOCK" | "RECENT_MOVEMENT";
export type StockProductRow = StockProduct & { difference: number; lastMovement: StockMovement | null };

export function getStockDifference(product: StockProduct) {
  return product.stockQuantity - product.minimumStock;
}

export function filterAndSortStockProducts(
  products: StockProduct[],
  movements: StockMovement[],
  options: { search: string; status: StockStatusFilter; sort: StockSort },
): StockProductRow[] {
  const lastMovementByProduct = new Map<string, StockMovement>();

  for (const movement of movements) {
    const current = lastMovementByProduct.get(movement.productId);

    if (!current || new Date(movement.createdAt).getTime() > new Date(current.createdAt).getTime()) {
      lastMovementByProduct.set(movement.productId, movement);
    }
  }

  const normalizedSearch = normalizeSearchText(options.search);

  return products
    .map((product) => ({
      ...product,
      difference: getStockDifference(product),
      lastMovement: lastMovementByProduct.get(product.id) ?? null,
    }))
    .filter((product) => normalizeSearchText(product.name).includes(normalizedSearch))
    .filter((product) => {
      if (options.status === "LOW") return product.isLowStock;
      if (options.status === "OK") return product.isActive && !product.isLowStock;
      if (options.status === "INACTIVE") return !product.isActive;
      return true;
    })
    .sort((a, b) => {
      if (options.sort === "LOWEST_STOCK") return a.stockQuantity - b.stockQuantity || a.name.localeCompare(b.name, "pt-BR");
      if (options.sort === "HIGHEST_STOCK") return b.stockQuantity - a.stockQuantity || a.name.localeCompare(b.name, "pt-BR");
      if (options.sort === "RECENT_MOVEMENT") {
        return (b.lastMovement ? new Date(b.lastMovement.createdAt).getTime() : 0) - (a.lastMovement ? new Date(a.lastMovement.createdAt).getTime() : 0);
      }

      return a.name.localeCompare(b.name, "pt-BR");
    });
}

export function getRecentStockMovements(movements: StockMovement[]) {
  return [...movements].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function normalizeSearchText(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
