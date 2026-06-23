import { describe, expect, it } from "vitest";

import { createProductSchema, formatCentsToBRL, parseBRLToCents, productResponseSchema, updateProductSchema } from "./products";

describe("product shared contracts", () => {
  it("accepts a valid product payload", () => {
    expect(
      createProductSchema.parse({
        name: "Galao 20L",
        description: "Agua mineral",
        salePriceCents: 1200,
        stockQuantity: 10,
        minimumStock: 3,
      }),
    ).toEqual({
      name: "Galao 20L",
      description: "Agua mineral",
      salePriceCents: 1200,
      stockQuantity: 10,
      minimumStock: 3,
      bottleType: "NONE",
    });
  });

  it("normalizes blank descriptions to null", () => {
    expect(
      createProductSchema.parse({
        name: "Galao 20L",
        description: "   ",
        salePriceCents: 1200,
        stockQuantity: 10,
        minimumStock: 3,
      }).description,
    ).toBeNull();
  });

  it("rejects empty names and negative numbers", () => {
    expect(() =>
      createProductSchema.parse({
        name: " ",
        salePriceCents: -1,
        stockQuantity: -1,
        minimumStock: -1,
      }),
    ).toThrow();
  });

  it("rejects blank, null and boolean numeric fields", () => {
    for (const invalidValue of ["", "   ", null, false]) {
      expect(() =>
        createProductSchema.parse({
          name: "Galao 20L",
          salePriceCents: invalidValue,
          stockQuantity: 10,
          minimumStock: 3,
        }),
      ).toThrow();
    }
  });

  it("accepts numeric strings in product payloads", () => {
    expect(
      createProductSchema.parse({
        name: "Galao 20L",
        salePriceCents: "1200",
        stockQuantity: "10",
        minimumStock: "3",
      }),
    ).toMatchObject({ salePriceCents: 1200, stockQuantity: 10, minimumStock: 3 });
  });

  it("allows partial product updates but rejects stock quantity changes", () => {
    expect(updateProductSchema.parse({ name: "Produto editado" })).toEqual({ name: "Produto editado" });
    expect(() => updateProductSchema.parse({ stockQuantity: 10 })).toThrow();
    expect(() => updateProductSchema.parse({ name: "Produto editado", stockQuantity: 10 })).toThrow();
    expect(() => updateProductSchema.parse({})).toThrow();
  });

  it("describes product responses with low-stock flag", () => {
    expect(
      productResponseSchema.parse({
        id: "11111111-1111-4111-8111-111111111111",
        name: "Galao 20L",
        description: null,
        salePriceCents: 1200,
        stockQuantity: 3,
        minimumStock: 3,
        isActive: true,
        isLowStock: true,
        bottleType: "NONE",
        createdAt: "2026-06-15T00:00:00.000Z",
        updatedAt: "2026-06-15T00:00:00.000Z",
      }).isLowStock,
    ).toBe(true);
  });

  it("formats and parses BRL values", () => {
    expect(formatCentsToBRL(1250)).toBe("R$ 12,50");
    expect(parseBRLToCents("12,50")).toBe(1250);
    expect(parseBRLToCents("12.50")).toBe(1250);
    expect(parseBRLToCents("R$ 1.234,56")).toBe(123456);
    expect(parseBRLToCents("1,23,4")).toBeNull();
    expect(parseBRLToCents("12abc,34")).toBeNull();
    expect(parseBRLToCents("abc12,34xyz")).toBeNull();
    expect(parseBRLToCents("")).toBeNull();
    expect(parseBRLToCents("-1,00")).toBeNull();
  });
});
