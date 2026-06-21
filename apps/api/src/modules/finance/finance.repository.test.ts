import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { closeDb, db } from "../../db";
import { cashRegisters, expenses, products, sales, saleItems, sessions, stockMovements, users } from "../../db/schema";
import { FinanceRepository } from "./finance.repository";

describe("FinanceRepository", () => {
  const repository = new FinanceRepository();

  beforeEach(async () => {
    await db.delete(sessions);
    await db.delete(stockMovements);
    await db.delete(saleItems);
    await db.delete(sales);
    await db.delete(expenses);
    await db.delete(cashRegisters);
    await db.delete(products);
    await db.delete(users);
  });

  afterAll(async () => {
    await closeDb();
  });

  it("creates and retrieves a cash register for today", async () => {
    const [user] = await db.insert(users).values({ name: "Op", email: "op@p.local", passwordHash: "h", role: "OPERATOR" }).returning();
    const created = await repository.createCashRegister({ date: "2026-06-20", openingBalanceCents: 5000, userId: user.id });
    const found = await repository.getCashRegisterForDate("2026-06-20");

    expect(found?.id).toBe(created.id);
    expect(found?.openingBalanceCents).toBe(5000);
  });

  it("updates opening balance on an open cash register", async () => {
    const [user] = await db.insert(users).values({ name: "Op", email: "op2@p.local", passwordHash: "h", role: "OPERATOR" }).returning();
    const created = await repository.createCashRegister({ date: "2026-06-21", openingBalanceCents: 0, userId: user.id });
    const updated = await repository.updateOpeningBalance(created.id, 3000);

    expect(updated.openingBalanceCents).toBe(3000);
  });

  it("rejects opening balance update on a closed cash register", async () => {
    const [user] = await db.insert(users).values({ name: "Op", email: "op3@p.local", passwordHash: "h", role: "OPERATOR" }).returning();
    const created = await repository.createCashRegister({ date: "2026-06-22", openingBalanceCents: 0, userId: user.id });
    await repository.closeCashRegister({
      id: created.id,
      userId: user.id,
      counts: { CASH: { expected: 0, counted: 0, difference: 0 }, PIX: { expected: 0, counted: 0, difference: 0 }, DEBIT_CARD: { expected: 0, counted: 0, difference: 0 }, CREDIT_CARD: { expected: 0, counted: 0, difference: 0 }, OTHER: { expected: 0, counted: 0, difference: 0 } },
    });

    await expect(repository.updateOpeningBalance(created.id, 5000)).rejects.toMatchObject({ code: "CASH_REGISTER_CLOSED" });
  });

  it("closes a cash register with counts and computes difference", async () => {
    const [user] = await db.insert(users).values({ name: "Op", email: "op4@p.local", passwordHash: "h", role: "OPERATOR" }).returning();
    const created = await repository.createCashRegister({ date: "2026-06-23", openingBalanceCents: 1000, userId: user.id });
    const closed = await repository.closeCashRegister({
      id: created.id,
      userId: user.id,
      counts: { CASH: { expected: 1000, counted: 900, difference: -100 }, PIX: { expected: 0, counted: 0, difference: 0 }, DEBIT_CARD: { expected: 0, counted: 0, difference: 0 }, CREDIT_CARD: { expected: 0, counted: 0, difference: 0 }, OTHER: { expected: 0, counted: 0, difference: 0 } },
    });

    expect(closed.closedAt).not.toBeNull();
    expect(closed.counts.CASH.difference).toBe(-100);
  });

  it("rejects closing an already closed cash register", async () => {
    const [user] = await db.insert(users).values({ name: "Op", email: "op5@p.local", passwordHash: "h", role: "OPERATOR" }).returning();
    const created = await repository.createCashRegister({ date: "2026-06-24", openingBalanceCents: 0, userId: user.id });
    const counts = { CASH: { expected: 0, counted: 0, difference: 0 }, PIX: { expected: 0, counted: 0, difference: 0 }, DEBIT_CARD: { expected: 0, counted: 0, difference: 0 }, CREDIT_CARD: { expected: 0, counted: 0, difference: 0 }, OTHER: { expected: 0, counted: 0, difference: 0 } };
    await repository.closeCashRegister({ id: created.id, userId: user.id, counts });

    await expect(repository.closeCashRegister({ id: created.id, userId: user.id, counts })).rejects.toMatchObject({ code: "CASH_REGISTER_ALREADY_CLOSED" });
  });

  it("creates, lists, updates, and soft-deletes expenses", async () => {
    const [user] = await db.insert(users).values({ name: "Op", email: "op6@p.local", passwordHash: "h", role: "OPERATOR" }).returning();

    const created = await repository.createExpense({
      description: "Marmita",
      amountCents: 2000,
      category: "MARMITA",
      paymentMethod: "CASH",
      date: new Date("2026-06-20T00:00:00Z"),
      createdBy: user.id,
    });

    const listed = await repository.listExpenses({});
    expect(listed).toHaveLength(1);

    const updated = await repository.updateExpense(created.id, { description: "Marmita e agua" });
    expect(updated.description).toBe("Marmita e agua");

    const deleted = await repository.softDeleteExpense(created.id, user.id);
    expect(deleted.isDeleted).toBe(true);

    const activeOnly = await repository.listExpenses({ includeDeleted: false });
    expect(activeOnly).toHaveLength(0);
  });

  it("rejects soft-deleting an already deleted expense", async () => {
    const [user] = await db.insert(users).values({ name: "Op", email: "op7@p.local", passwordHash: "h", role: "OPERATOR" }).returning();
    const created = await repository.createExpense({ description: "x", amountCents: 100, category: "OUTRO", paymentMethod: "CASH", date: new Date("2026-06-20T00:00:00Z"), createdBy: user.id });
    await repository.softDeleteExpense(created.id, user.id);

    await expect(repository.softDeleteExpense(created.id, user.id)).rejects.toMatchObject({ code: "EXPENSE_ALREADY_DELETED" });
  });

  it("returns dashboard data with revenue, counts, low stock and recent sales", async () => {
    const [user] = await db.insert(users).values({ name: "Op", email: "op8@p.local", passwordHash: "h", role: "OPERATOR" }).returning();
    const [product] = await db.insert(products).values({ name: "Galao 20L", salePriceCents: 1800, stockQuantity: 1, minimumStock: 5 }).returning();
    const [sale] = await db.insert(sales).values({ userId: user.id, totalAmountCents: 1800, paymentMethod: "PIX", status: "COMPLETED", createdAt: new Date("2026-06-20T12:00:00Z") }).returning();
    await db.insert(saleItems).values({ saleId: sale.id, productId: product.id, productNameSnapshot: "Galao 20L", quantity: 1, unitPriceCents: 1800, totalPriceCents: 1800 });

    const data = await repository.getDashboardData(new Date("2026-06-20T00:00:00Z"));

    expect(data.todayRevenueCents).toBe(1800);
    expect(data.todaySalesCount).toBe(1);
    expect(data.lowStockProducts).toHaveLength(1);
    expect(data.recentSales).toHaveLength(1);
  });

  it("returns finance summary for a period", async () => {
    const [user] = await db.insert(users).values({ name: "Op", email: "op9@p.local", passwordHash: "h", role: "OPERATOR" }).returning();
    await db.insert(sales).values({ userId: user.id, totalAmountCents: 5000, paymentMethod: "CASH", status: "COMPLETED" });
    await db.insert(expenses).values({ description: "Gas", amountCents: 1000, category: "GASOLINA", paymentMethod: "CASH", date: new Date(), createdBy: user.id });

    const summary = await repository.getFinanceSummary(new Date("2026-01-01T00:00:00Z"), new Date("2026-12-31T23:59:59Z"));

    expect(summary.totalRevenueCents).toBe(5000);
    expect(summary.totalExpensesCents).toBe(1000);
    expect(summary.balanceCents).toBe(4000);
  });
});
