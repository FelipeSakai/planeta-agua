import { describe, expect, it } from "vitest";

import {
  createSaleInputSchema,
  hasBottleMismatch,
  isBottleExpired,
  quickCustomerInputSchema,
} from "./sales";

describe("sales contracts", () => {
  it("accepts a sale with optional customer and bottle data", () => {
    const parsed = createSaleInputSchema.parse({
      customerId: null,
      paymentMethod: "PIX",
      items: [{ productId: "11111111-1111-4111-8111-111111111111", quantity: 2 }],
      bottle: null,
    });

    expect(parsed.customerId).toBeNull();
    expect(parsed.items).toHaveLength(1);
  });

  it("rejects an empty sale", () => {
    expect(() =>
      createSaleInputSchema.parse({ customerId: null, paymentMethod: "PIX", items: [], bottle: null }),
    ).toThrow();
  });

  it("allows quick customer creation with minimal fields", () => {
    const parsed = quickCustomerInputSchema.parse({ name: "Maria", phone: "11999999999" });

    expect(parsed.name).toBe("Maria");
    expect(parsed.phone).toBe("11999999999");
  });

  it("flags expired bottles after 3 years", () => {
    expect(isBottleExpired({ month: 6, year: 2021 }, new Date("2026-07-01T00:00:00.000Z"))).toBe(true);
    expect(isBottleExpired({ month: 6, year: 2024 }, new Date("2026-07-01T00:00:00.000Z"))).toBe(false);
  });

  it("flags mismatch when bottle month or year changes", () => {
    expect(hasBottleMismatch({ month: 6, year: 2024 }, { month: 7, year: 2024 })).toBe(true);
    expect(hasBottleMismatch({ month: 6, year: 2024 }, { month: 6, year: 2024 })).toBe(false);
    expect(hasBottleMismatch(null, { month: 6, year: 2024 })).toBe(false);
  });
});
