import { describe, expect, it } from "vitest";

import { getStockMovementTypeLabel, stockAdjustmentSchema, stockEntrySchema, stockPageResponseSchema } from "./stock";

describe("stock shared contracts", () => {
  it("accepts a valid stock entry", () => {
    expect(
      stockEntrySchema.parse({
        productId: "11111111-1111-4111-8111-111111111111",
        quantity: "5",
        reason: "Compra semanal",
      }),
    ).toEqual({
      productId: "11111111-1111-4111-8111-111111111111",
      quantity: 5,
      reason: "Compra semanal",
    });
  });

  it("rejects entry with zero quantity or blank reason", () => {
    expect(() =>
      stockEntrySchema.parse({
        productId: "11111111-1111-4111-8111-111111111111",
        quantity: 0,
        reason: "",
      }),
    ).toThrow();
  });

  it("accepts an absolute adjustment to zero", () => {
    expect(
      stockAdjustmentSchema.parse({
        productId: "11111111-1111-4111-8111-111111111111",
        newQuantity: "0",
        reason: "Conferencia fisica",
      }),
    ).toEqual({
      productId: "11111111-1111-4111-8111-111111111111",
      newQuantity: 0,
      reason: "Conferencia fisica",
    });
  });

  it("rejects adjustment with negative final quantity", () => {
    expect(() =>
      stockAdjustmentSchema.parse({
        productId: "11111111-1111-4111-8111-111111111111",
        newQuantity: -1,
        reason: "Conferencia fisica",
      }),
    ).toThrow();
  });

  it("parses stock page responses", () => {
    const result = stockPageResponseSchema.parse({
      products: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Galao 20L",
          stockQuantity: 2,
          minimumStock: 3,
          isActive: true,
          isLowStock: true,
        },
      ],
      movements: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          productId: "11111111-1111-4111-8111-111111111111",
          productName: "Galao 20L",
          userId: "33333333-3333-4333-8333-333333333333",
          userName: "Administrador",
          type: "IN",
          quantity: 5,
          reason: "Compra semanal",
          createdAt: "2026-06-17T00:00:00.000Z",
        },
      ],
      summary: { totalProducts: 1, lowStockProducts: 1, totalUnits: 2 },
    });

    expect(result.products[0]?.isLowStock).toBe(true);
    expect(result.summary.totalUnits).toBe(2);
  });

  it("returns stock movement labels", () => {
    expect(getStockMovementTypeLabel("IN")).toBe("Entrada");
    expect(getStockMovementTypeLabel("ADJUSTMENT")).toBe("Ajuste");
    expect(getStockMovementTypeLabel("SALE")).toBe("Venda");
    expect(getStockMovementTypeLabel("CANCELED_SALE")).toBe("Venda cancelada");
    expect(getStockMovementTypeLabel("OUT")).toBe("Saida");
  });
});
