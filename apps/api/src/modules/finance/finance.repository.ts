import { Injectable } from "@nestjs/common";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "../../db";
import { cashRegisters, expenses, products, sales } from "../../db/schema";
import { paymentMethodValues } from "shared";
import { FinanceRepositoryError } from "./finance.errors";
import type {
  CashRegisterRow,
  CloseCashRegisterRepositoryInput,
  CreateCashRegisterInput,
  CreateExpenseRepositoryInput,
  ListExpensesFilter,
  UpdateExpenseRepositoryInput,
} from "./finance.types";

const completedStatus = "COMPLETED" as const;
const pendingDeliveryStatus = "PENDING_DELIVERY" as const;

@Injectable()
export class FinanceRepository {
  async getDashboardData(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const todaySales = await db.query.sales.findMany({
      where: and(gte(sales.createdAt, startOfDay), lte(sales.createdAt, endOfDay), eq(sales.status, completedStatus)),
    });

    const todayRevenueCents = todaySales.reduce((sum, s) => sum + s.totalAmountCents, 0);
    const totalsByPaymentMethod = paymentMethodValues.map((method) => {
      const methodSales = todaySales.filter((s) => s.paymentMethod === method);
      return { method, salesCount: methodSales.length, amountCents: methodSales.reduce((sum, s) => sum + s.totalAmountCents, 0) };
    });

    const lowStockProducts = await db.query.products.findMany({
      where: sql`${products.stockQuantity} <= ${products.minimumStock}`,
      limit: 10,
    });

    const recentSales = await db.query.sales.findMany({
      where: and(gte(sales.createdAt, startOfDay), lte(sales.createdAt, endOfDay), eq(sales.status, completedStatus)),
      orderBy: [desc(sales.createdAt)],
      limit: 10,
      with: { customer: { columns: { name: true } } },
    });

    return {
      todayRevenueCents,
      todaySalesCount: todaySales.length,
      totalsByPaymentMethod,
      lowStockProducts: lowStockProducts.map((p) => ({ id: p.id, name: p.name, stockQuantity: p.stockQuantity, minimumStock: p.minimumStock })),
      recentSales: recentSales.map((s) => ({
        id: s.id,
        customerName: s.customer?.name ?? null,
        totalAmountCents: s.totalAmountCents,
        paymentMethod: s.paymentMethod,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
      })),
    };
  }

  async getPendingDeliveries() {
    const [totalRow] = await db.select({ total: sql<number>`count(*)::int` }).from(sales).where(eq(sales.status, pendingDeliveryStatus));
    const items = await db.query.sales.findMany({
      where: eq(sales.status, pendingDeliveryStatus),
      orderBy: [desc(sales.createdAt)],
      limit: 10,
      with: {
        customer: { columns: { id: true, name: true, phone: true, address: true } },
        driver: { columns: { id: true, name: true } },
      },
    });

    return { items, total: totalRow?.total ?? 0 };
  }

  async getCashRegisterForDate(date: string): Promise<CashRegisterRow | undefined> {
    const [row] = await db.select().from(cashRegisters).where(eq(cashRegisters.date, date)).limit(1);
    return row;
  }

  async createCashRegister(input: CreateCashRegisterInput): Promise<CashRegisterRow> {
    const [row] = await db.insert(cashRegisters).values({
      date: input.date,
      openingBalanceCents: input.openingBalanceCents,
      openedByUserId: input.userId,
    }).returning();
    return row;
  }

  async updateOpeningBalance(id: string, openingBalanceCents: number): Promise<CashRegisterRow> {
    const [existing] = await db.select().from(cashRegisters).where(eq(cashRegisters.id, id)).for("update");
    if (!existing) throw new FinanceRepositoryError("CASH_REGISTER_NOT_FOUND", "Caixa nao encontrado.");
    if (existing.closedAt) throw new FinanceRepositoryError("CASH_REGISTER_CLOSED", "Caixa fechado nao pode ter fundo alterado.");

    const [updated] = await db.update(cashRegisters).set({ openingBalanceCents, updatedAt: new Date() }).where(eq(cashRegisters.id, id)).returning();
    return updated;
  }

  async closeCashRegister(input: CloseCashRegisterRepositoryInput): Promise<CashRegisterRow> {
    const [existing] = await db.select().from(cashRegisters).where(eq(cashRegisters.id, input.id)).for("update");
    if (!existing) throw new FinanceRepositoryError("CASH_REGISTER_NOT_FOUND", "Caixa nao encontrado.");
    if (existing.closedAt) throw new FinanceRepositoryError("CASH_REGISTER_ALREADY_CLOSED", "Caixa ja fechado.");

    const [updated] = await db.update(cashRegisters).set({
      closedAt: new Date(),
      closedByUserId: input.userId,
      counts: input.counts,
      updatedAt: new Date(),
    }).where(eq(cashRegisters.id, input.id)).returning();
    return updated;
  }

  async listExpenses(filter: ListExpensesFilter = {}) {
    const conditions = [];
    if (!filter.includeDeleted) conditions.push(eq(expenses.isDeleted, false));
    if (filter.startDate) conditions.push(gte(expenses.date, filter.startDate));
    if (filter.endDate) conditions.push(lte(expenses.date, filter.endDate));

    return db.query.expenses.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(expenses.date)],
    });
  }

  async createExpense(input: CreateExpenseRepositoryInput) {
    const [row] = await db.insert(expenses).values(input).returning();
    return row;
  }

  async updateExpense(id: string, input: UpdateExpenseRepositoryInput) {
    const [existing] = await db.select().from(expenses).where(eq(expenses.id, id)).for("update");
    if (!existing) throw new FinanceRepositoryError("EXPENSE_NOT_FOUND", "Despesa nao encontrada.");
    const [updated] = await db.update(expenses).set({ ...input, updatedAt: new Date() }).where(eq(expenses.id, id)).returning();
    return updated;
  }

  async softDeleteExpense(id: string, userId: string) {
    const [existing] = await db.select().from(expenses).where(eq(expenses.id, id)).for("update");
    if (!existing) throw new FinanceRepositoryError("EXPENSE_NOT_FOUND", "Despesa nao encontrada.");
    if (existing.isDeleted) throw new FinanceRepositoryError("EXPENSE_ALREADY_DELETED", "Despesa ja excluida.");
    const [updated] = await db.update(expenses).set({ isDeleted: true, deletedAt: new Date(), deletedBy: userId, updatedAt: new Date() }).where(eq(expenses.id, id)).returning();
    return updated;
  }

  async getFinanceSummary(startDate: Date, endDate: Date) {
    const periodSales = await db.query.sales.findMany({
      where: and(gte(sales.createdAt, startDate), lte(sales.createdAt, endDate), eq(sales.status, completedStatus)),
    });
    const periodExpenses = await db.query.expenses.findMany({
      where: and(gte(expenses.date, startDate), lte(expenses.date, endDate), eq(expenses.isDeleted, false)),
    });

    const totalRevenueCents = periodSales.reduce((sum, s) => sum + s.totalAmountCents, 0);
    const totalExpensesCents = periodExpenses.reduce((sum, e) => sum + e.amountCents, 0);

    const totalsByPaymentMethod = paymentMethodValues.map((method) => {
      const revenueCents = periodSales.filter((s) => s.paymentMethod === method).reduce((sum, s) => sum + s.totalAmountCents, 0);
      const expensesCents = periodExpenses.filter((e) => e.paymentMethod === method).reduce((sum, e) => sum + e.amountCents, 0);
      return { method, revenueCents, expensesCents, balanceCents: revenueCents - expensesCents };
    });

    return { totalRevenueCents, totalExpensesCents, balanceCents: totalRevenueCents - totalExpensesCents, totalsByPaymentMethod };
  }

  async getExpectedCashTotals(date: string, openingBalanceCents: number) {
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const daySales = await db.query.sales.findMany({
      where: and(gte(sales.createdAt, startOfDay), lte(sales.createdAt, endOfDay), eq(sales.status, completedStatus)),
    });
    const dayExpenses = await db.query.expenses.findMany({
      where: and(gte(expenses.date, startOfDay), lte(expenses.date, endOfDay), eq(expenses.isDeleted, false)),
    });

    return paymentMethodValues.map((method) => {
      const salesCents = daySales.filter((s) => s.paymentMethod === method).reduce((sum, s) => sum + s.totalAmountCents, 0);
      const expensesCents = dayExpenses.filter((e) => e.paymentMethod === method).reduce((sum, e) => sum + e.amountCents, 0);
      const expected = method === "CASH" ? openingBalanceCents + salesCents - expensesCents : salesCents - expensesCents;
      return { method, expected, salesCents, expensesCents };
    });
  }

  async getTodaySalesDetailed(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return db.query.sales.findMany({
      where: and(
        gte(sales.createdAt, startOfDay),
        lte(sales.createdAt, endOfDay),
        eq(sales.status, completedStatus),
      ),
      orderBy: [desc(sales.createdAt)],
      with: { customer: { columns: { name: true } } },
    });
  }

  async getTodayExpensesDetailed(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return db.query.expenses.findMany({
      where: and(
        gte(expenses.date, startOfDay),
        lte(expenses.date, endOfDay),
        eq(expenses.isDeleted, false),
      ),
      orderBy: [desc(expenses.date)],
    });
  }
}
