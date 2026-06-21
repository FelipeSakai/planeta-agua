import { describe, expect, it } from "vitest";

import {
  closeCashRegisterInputSchema,
  createExpenseInputSchema,
  cashRegisterResponseSchema,
  dashboardResponseSchema,
  expenseCategoryValues,
  expenseResponseSchema,
  financeSummaryResponseSchema,
  updateExpenseInputSchema,
  updateOpeningBalanceInputSchema,
} from "./finance";

describe("shared finance contracts", () => {
  it("exposes the four fixed expense categories", () => {
    expect(expenseCategoryValues).toEqual(["MARMITA", "GASOLINA", "MANUTENCAO", "OUTRO"]);
  });

  it("validates a create expense input with all fields", () => {
    const parsed = createExpenseInputSchema.parse({
      description: "Marmita entregador",
      amountCents: 2000,
      category: "MARMITA",
      paymentMethod: "CASH",
      date: "2026-06-20",
    });

    expect(parsed.amountCents).toBe(2000);
    expect(parsed.category).toBe("MARMITA");
  });

  it("rejects negative expense amount", () => {
    expect(createExpenseInputSchema.safeParse({ description: "x", amountCents: -1, category: "OUTRO", paymentMethod: "CASH", date: "2026-06-20" }).success).toBe(false);
  });

  it("rejects unknown category", () => {
    expect(createExpenseInputSchema.safeParse({ description: "x", amountCents: 100, category: "WEIRD", paymentMethod: "CASH", date: "2026-06-20" }).success).toBe(false);
  });

  it("allows partial update expense input", () => {
    const parsed = updateExpenseInputSchema.parse({ description: "Nova descricao" });
    expect(parsed.description).toBe("Nova descricao");
  });

  it("validates an expense response with id and metadata", () => {
    const parsed = expenseResponseSchema.parse({
      id: "99999999-9999-4999-8999-999999999999",
      description: "Gasolina",
      amountCents: 5000,
      category: "GASOLINA",
      paymentMethod: "CASH",
      date: "2026-06-20T00:00:00.000Z",
      createdBy: "11111111-1111-4111-8111-111111111111",
      isDeleted: false,
      createdAt: "2026-06-20T10:00:00.000Z",
      updatedAt: "2026-06-20T10:00:00.000Z",
    });

    expect(parsed.isDeleted).toBe(false);
  });

  it("validates a dashboard response with daily metrics", () => {
    const parsed = dashboardResponseSchema.parse({
      todayRevenueCents: 18000,
      todaySalesCount: 5,
      totalsByPaymentMethod: [
        { method: "CASH", salesCount: 2, amountCents: 6000 },
        { method: "PIX", salesCount: 3, amountCents: 12000 },
      ],
      lowStockProducts: [
        { id: "p1", name: "Galao 20L", stockQuantity: 1, minimumStock: 3 },
      ],
      recentSales: [
        { id: "s1", customerName: "Maria", totalAmountCents: 1800, paymentMethod: "PIX", status: "COMPLETED", createdAt: "2026-06-20T10:00:00.000Z" },
      ],
    });

    expect(parsed.todayRevenueCents).toBe(18000);
    expect(parsed.lowStockProducts).toHaveLength(1);
  });

  it("validates a cash register response", () => {
    const parsed = cashRegisterResponseSchema.parse({
      id: "c1",
      date: "2026-06-20",
      openingBalanceCents: 5000,
      openedAt: "2026-06-20T08:00:00.000Z",
      openedByUserId: "u1",
      closedAt: null,
      closedByUserId: null,
      counts: {},
    });

    expect(parsed.openingBalanceCents).toBe(5000);
    expect(parsed.closedAt).toBeNull();
  });

  it("validates opening balance update input", () => {
    const parsed = updateOpeningBalanceInputSchema.parse({ openingBalanceCents: 5000 });
    expect(parsed.openingBalanceCents).toBe(5000);
  });

  it("validates close cash register input with counts per method", () => {
    const parsed = closeCashRegisterInputSchema.parse({
      counts: {
        CASH: { counted: 11500 },
        PIX: { counted: 30000 },
        DEBIT_CARD: { counted: 0 },
        CREDIT_CARD: { counted: 0 },
        OTHER: { counted: 0 },
      },
    });

    expect(parsed.counts.CASH.counted).toBe(11500);
  });

  it("validates a finance summary response", () => {
    const parsed = financeSummaryResponseSchema.parse({
      totalRevenueCents: 18000,
      totalExpensesCents: 5000,
      balanceCents: 13000,
      totalsByPaymentMethod: [
        { method: "CASH", revenueCents: 6000, expensesCents: 2000, balanceCents: 4000 },
      ],
    });

    expect(parsed.balanceCents).toBe(13000);
  });
});
