import { describe, expect, it } from "vitest";

import { filterProducts } from "./product-view-model";

const products = [
  { id: "1", name: "Galao 20L", description: "Retornavel", salePriceCents: 1200, stockQuantity: 2, minimumStock: 3, isActive: true, isLowStock: true },
  { id: "2", name: "Agua 500ml", description: null, salePriceCents: 250, stockQuantity: 30, minimumStock: 10, isActive: true, isLowStock: false },
  { id: "3", name: "Copo 200ml", description: null, salePriceCents: 100, stockQuantity: 0, minimumStock: 5, isActive: false, isLowStock: true },
];

describe("product view model", () => {
  it("filters by search", () => {
    expect(filterProducts(products, { search: "galao", status: "ALL" }).map((product) => product.name)).toEqual(["Galao 20L"]);
  });

  it("filters by status", () => {
    expect(filterProducts(products, { search: "", status: "ACTIVE" }).map((product) => product.name)).toEqual(["Agua 500ml", "Galao 20L"]);
    expect(filterProducts(products, { search: "", status: "LOW" }).map((product) => product.name)).toEqual(["Copo 200ml", "Galao 20L"]);
    expect(filterProducts(products, { search: "", status: "INACTIVE" }).map((product) => product.name)).toEqual(["Copo 200ml"]);
  });
});
