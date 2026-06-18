import { describe, expect, it } from "vitest";

import { filterAndSortStockProducts, getStockDifference } from "./stock-view-model";

const products = [
  { id: "1", name: "Galao 20L", stockQuantity: 2, minimumStock: 3, isActive: true, isLowStock: true },
  { id: "2", name: "Agua 500ml", stockQuantity: 30, minimumStock: 10, isActive: true, isLowStock: false },
  { id: "3", name: "Copo 200ml", stockQuantity: 0, minimumStock: 5, isActive: false, isLowStock: true },
];

const movements = [
  {
    id: "m1",
    productId: "2",
    productName: "Agua 500ml",
    userId: "u1",
    userName: "Admin",
    type: "IN" as const,
    quantity: 5,
    reason: "Compra",
    createdAt: "2026-06-17T12:00:00.000Z",
  },
  {
    id: "m2",
    productId: "1",
    productName: "Galao 20L",
    userId: "u1",
    userName: "Admin",
    type: "ADJUSTMENT" as const,
    quantity: -1,
    reason: "Conferencia",
    createdAt: "2026-06-17T10:00:00.000Z",
  },
];

describe("stock view model", () => {
  it("calculates stock difference against minimum", () => {
    expect(getStockDifference(products[0])).toBe(-1);
    expect(getStockDifference(products[1])).toBe(20);
  });

  it("filters by search and low stock", () => {
    const rows = filterAndSortStockProducts(products, movements, { search: "galao", status: "LOW", sort: "NAME" });

    expect(rows.map((row) => row.name)).toEqual(["Galao 20L"]);
    expect(rows[0].lastMovement?.reason).toBe("Conferencia");
  });

  it("sorts by lowest stock and movement recency", () => {
    expect(
      filterAndSortStockProducts(products, movements, { search: "", status: "ALL", sort: "LOWEST_STOCK" }).map((row) => row.name),
    ).toEqual(["Copo 200ml", "Galao 20L", "Agua 500ml"]);
    expect(filterAndSortStockProducts(products, movements, { search: "", status: "ALL", sort: "RECENT_MOVEMENT" }).map((row) => row.name)[0]).toBe(
      "Agua 500ml",
    );
  });
});
