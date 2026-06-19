import { describe, expect, it } from "vitest";

import {
  createSaleInputSchema,
  hasBottleMismatch,
  isBottleExpired,
  paymentMethodValues,
  quickCustomerInputSchema,
  saleCustomerResponseSchema,
  saleDetailResponseSchema,
  saleHistoryResponseSchema,
} from "./sales";

const validSaleHistoryEntry = {
  id: "11111111-1111-4111-8111-111111111111",
  customerId: null,
  customerName: null,
  userId: "22222222-2222-4222-8222-222222222222",
  userName: "Operador",
  totalAmountCents: 2400,
  paymentMethod: "PIX" as const,
  status: "COMPLETED" as const,
  createdAt: "2026-06-15T10:00:00.000Z",
  canceledAt: null,
  cancellationReason: null,
};

const validSaleDetailResponse = {
  sale: {
    id: "11111111-1111-4111-8111-111111111111",
    customerId: null,
    customerName: null,
    userId: "22222222-2222-4222-8222-222222222222",
    userName: "Operador",
    totalAmountCents: 2400,
    paymentMethod: "PIX" as const,
    status: "COMPLETED" as const,
    createdAt: "2026-06-15T10:00:00.000Z",
    canceledAt: null,
    cancellationReason: null,
    bottle: null,
    previousBottle: null,
  },
  items: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      productId: "44444444-4444-4444-8444-444444444444",
      productNameSnapshot: "Galao 20L",
      quantity: 2,
      unitPriceCents: 1200,
      totalPriceCents: 2400,
    },
  ],
  bottleAlerts: {
    expired: false,
    mismatch: false,
  },
};

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

  it("accepts the minimized sales customer payload with previous bottle history", () => {
    const parsed = saleCustomerResponseSchema.parse({
      id: "55555555-5555-4555-8555-555555555555",
      name: "Maria",
      phone: "11999999999",
      previousBottle: { month: 6, year: 2024, notes: "Azul" },
    });

    expect(parsed.previousBottle).toEqual({ month: 6, year: 2024, notes: "Azul" });
  });

  it("exports payment methods in the expected operational order", () => {
    expect(paymentMethodValues).toEqual(["CASH", "PIX", "DEBIT_CARD", "CREDIT_CARD", "OTHER"]);
  });

  it("rejects negative totals in sale history responses", () => {
    expect(() =>
      saleHistoryResponseSchema.parse([
        {
          ...validSaleHistoryEntry,
          totalAmountCents: -1,
        },
      ]),
    ).toThrow();
  });

  it("rejects completed sale details with cancellation metadata", () => {
    expect(() =>
      saleDetailResponseSchema.parse({
        ...validSaleDetailResponse,
        sale: {
          ...validSaleDetailResponse.sale,
          canceledAt: "2026-06-15T12:00:00.000Z",
          cancellationReason: "Cancelada por engano",
        },
      }),
    ).toThrow();
  });

  it("rejects detail items with impossible quantities or negative amounts", () => {
    expect(() =>
      saleDetailResponseSchema.parse({
        ...validSaleDetailResponse,
        items: [
          {
            ...validSaleDetailResponse.items[0],
            quantity: 0,
            unitPriceCents: -1,
            totalPriceCents: -1,
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects malformed sale timestamps", () => {
    expect(() =>
      saleHistoryResponseSchema.parse([
        {
          ...validSaleHistoryEntry,
          createdAt: "not-a-date",
        },
      ]),
    ).toThrow();

    expect(() =>
      saleDetailResponseSchema.parse({
        ...validSaleDetailResponse,
        sale: {
          ...validSaleDetailResponse.sale,
          createdAt: "2026-99-99",
        },
      }),
    ).toThrow();
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
