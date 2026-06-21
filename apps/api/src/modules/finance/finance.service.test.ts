import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { FinanceRepositoryError } from "./finance.errors";
import { FinanceService } from "./finance.service";

const operatorUser = {
  id: "11111111-1111-4111-8111-111111111111",
  role: "OPERATOR" as const,
};

const adminUser = {
  id: "22222222-2222-4222-8222-222222222222",
  role: "ADMIN" as const,
};

const today = new Date().toISOString().slice(0, 10);

function createRepository() {
  return {
    getDashboardData: vi.fn(),
    getCashRegisterForDate: vi.fn(),
    createCashRegister: vi.fn(),
    updateOpeningBalance: vi.fn(),
    closeCashRegister: vi.fn(),
    listExpenses: vi.fn(),
    createExpense: vi.fn(),
    updateExpense: vi.fn(),
    softDeleteExpense: vi.fn(),
    getFinanceSummary: vi.fn(),
    getExpectedCashTotals: vi.fn(),
  };
}

const cashRegisterRow = {
  id: "33333333-3333-4333-8333-333333333333",
  date: today,
  openingBalanceCents: 500,
  openedAt: new Date("2026-06-21T08:00:00.000Z"),
  openedByUserId: operatorUser.id,
  closedAt: null as Date | null,
  closedByUserId: null as string | null,
  counts: {} as Record<string, { expected: number; counted: number; difference: number }>,
  createdAt: new Date("2026-06-21T08:00:00.000Z"),
  updatedAt: new Date("2026-06-21T08:00:00.000Z"),
};

const expenseRow = {
  id: "44444444-4444-4444-8444-444444444444",
  description: "Gasolina",
  amountCents: 5000,
  category: "GASOLINA" as const,
  paymentMethod: "CASH" as const,
  date: new Date("2026-06-21T00:00:00.000Z"),
  createdBy: adminUser.id,
  isDeleted: false,
  deletedAt: null as Date | null,
  deletedBy: null as string | null,
  createdAt: new Date("2026-06-21T10:00:00.000Z"),
  updatedAt: new Date("2026-06-21T10:00:00.000Z"),
};

const fullCountsInput = (overrides: Partial<Record<string, number>> = {}) => ({
  CASH: { counted: overrides.CASH ?? 0 },
  PIX: { counted: overrides.PIX ?? 0 },
  DEBIT_CARD: { counted: overrides.DEBIT_CARD ?? 0 },
  CREDIT_CARD: { counted: overrides.CREDIT_CARD ?? 0 },
  OTHER: { counted: overrides.OTHER ?? 0 },
});

describe("FinanceService", () => {
  it("getDashboardData delegates to repository with today's date", async () => {
    const repository = createRepository();
    const service = new FinanceService(repository as never);
    const dashboard = {
      todayRevenueCents: 10000,
      todaySalesCount: 3,
      totalsByPaymentMethod: [],
      lowStockProducts: [],
      recentSales: [],
    };
    repository.getDashboardData.mockResolvedValueOnce(dashboard);

    await expect(service.getDashboardData()).resolves.toEqual(dashboard);
    expect(repository.getDashboardData).toHaveBeenCalledWith(expect.any(Date));
  });

  it("getCashRegisterForToday returns null when no cash register exists", async () => {
    const repository = createRepository();
    const service = new FinanceService(repository as never);

    repository.getCashRegisterForDate.mockResolvedValueOnce(undefined);

    await expect(service.getCashRegisterForToday()).resolves.toBeNull();
    expect(repository.getCashRegisterForDate).toHaveBeenCalledWith(today);
  });

  it("getCashRegisterForToday returns mapped response when cash register exists", async () => {
    const repository = createRepository();
    const service = new FinanceService(repository as never);

    repository.getCashRegisterForDate.mockResolvedValueOnce(cashRegisterRow);

    await expect(service.getCashRegisterForToday()).resolves.toEqual({
      id: cashRegisterRow.id,
      date: today,
      openingBalanceCents: 500,
      openedAt: "2026-06-21T08:00:00.000Z",
      openedByUserId: operatorUser.id,
      closedAt: null,
      closedByUserId: null,
      counts: {},
    });
  });

  it("ensureCashRegisterForToday creates a cash register with zero balance when none exists", async () => {
    const repository = createRepository();
    const service = new FinanceService(repository as never);

    repository.getCashRegisterForDate.mockResolvedValueOnce(undefined);
    repository.createCashRegister.mockResolvedValueOnce(cashRegisterRow);

    await service.ensureCashRegisterForToday(adminUser.id);

    expect(repository.createCashRegister).toHaveBeenCalledWith({
      date: today,
      openingBalanceCents: 0,
      userId: adminUser.id,
    });
  });

  it("ensureCashRegisterForToday returns existing cash register without creating a new one", async () => {
    const repository = createRepository();
    const service = new FinanceService(repository as never);

    repository.getCashRegisterForDate.mockResolvedValueOnce(cashRegisterRow);

    await service.ensureCashRegisterForToday(adminUser.id);

    expect(repository.createCashRegister).not.toHaveBeenCalled();
  });

  it("updateOpeningBalance rejects invalid input", async () => {
    const repository = createRepository();
    const service = new FinanceService(repository as never);

    await expect(service.updateOpeningBalance(adminUser, { openingBalanceCents: -100 })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.updateOpeningBalance).not.toHaveBeenCalled();
  });

  it("updateOpeningBalance throws NotFoundException when today's cash register does not exist", async () => {
    const repository = createRepository();
    const service = new FinanceService(repository as never);

    repository.getCashRegisterForDate.mockResolvedValueOnce(undefined);

    await expect(service.updateOpeningBalance(adminUser, { openingBalanceCents: 1000 })).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.updateOpeningBalance).not.toHaveBeenCalled();
  });

  it("updateOpeningBalance maps CASH_REGISTER_CLOSED to BadRequestException", async () => {
    const repository = createRepository();
    const service = new FinanceService(repository as never);

    repository.getCashRegisterForDate.mockResolvedValueOnce(cashRegisterRow);
    repository.updateOpeningBalance.mockRejectedValueOnce(
      new FinanceRepositoryError("CASH_REGISTER_CLOSED", "Caixa fechado nao pode ter fundo alterado."),
    );

    await expect(service.updateOpeningBalance(adminUser, { openingBalanceCents: 1000 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("updateOpeningBalance updates the balance and returns mapped response", async () => {
    const repository = createRepository();
    const service = new FinanceService(repository as never);

    const updatedRow = { ...cashRegisterRow, openingBalanceCents: 1000 };
    repository.getCashRegisterForDate.mockResolvedValueOnce(cashRegisterRow);
    repository.updateOpeningBalance.mockResolvedValueOnce(updatedRow);

    await expect(service.updateOpeningBalance(adminUser, { openingBalanceCents: 1000 })).resolves.toMatchObject({
      id: cashRegisterRow.id,
      openingBalanceCents: 1000,
    });
    expect(repository.updateOpeningBalance).toHaveBeenCalledWith(cashRegisterRow.id, 1000);
  });

  it("closeCashRegister rejects invalid input", async () => {
    const repository = createRepository();
    const service = new FinanceService(repository as never);

    await expect(service.closeCashRegister(adminUser, { counts: {} })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.closeCashRegister).not.toHaveBeenCalled();
  });

  it("closeCashRegister throws NotFoundException when today's cash register does not exist", async () => {
    const repository = createRepository();
    const service = new FinanceService(repository as never);

    repository.getCashRegisterForDate.mockResolvedValueOnce(undefined);

    await expect(
      service.closeCashRegister(adminUser, { counts: fullCountsInput({ CASH: 0 }) }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.closeCashRegister).not.toHaveBeenCalled();
  });

  it("closeCashRegister computes expected totals and differences and closes the register", async () => {
    const repository = createRepository();
    const service = new FinanceService(repository as never);

    repository.getCashRegisterForDate.mockResolvedValueOnce(cashRegisterRow);
    repository.getExpectedCashTotals.mockResolvedValueOnce([
      { method: "CASH", expected: 800, salesCents: 300, expensesCents: 0 },
      { method: "PIX", expected: 500, salesCents: 500, expensesCents: 0 },
      { method: "DEBIT_CARD", expected: 0, salesCents: 0, expensesCents: 0 },
      { method: "CREDIT_CARD", expected: 0, salesCents: 0, expensesCents: 0 },
      { method: "OTHER", expected: 0, salesCents: 0, expensesCents: 0 },
    ]);
    const closedRow = {
      ...cashRegisterRow,
      closedAt: new Date("2026-06-21T18:00:00.000Z"),
      closedByUserId: adminUser.id,
      counts: {
        CASH: { expected: 800, counted: 1000, difference: 200 },
        PIX: { expected: 500, counted: 500, difference: 0 },
        DEBIT_CARD: { expected: 0, counted: 0, difference: 0 },
        CREDIT_CARD: { expected: 0, counted: 0, difference: 0 },
        OTHER: { expected: 0, counted: 0, difference: 0 },
      },
    };
    repository.closeCashRegister.mockResolvedValueOnce(closedRow);

    await expect(
      service.closeCashRegister(adminUser, { counts: fullCountsInput({ CASH: 1000, PIX: 500 }) }),
    ).resolves.toEqual({
      id: cashRegisterRow.id,
      date: today,
      openingBalanceCents: 500,
      openedAt: "2026-06-21T08:00:00.000Z",
      openedByUserId: operatorUser.id,
      closedAt: "2026-06-21T18:00:00.000Z",
      closedByUserId: adminUser.id,
      counts: {
        CASH: { expected: 800, counted: 1000, difference: 200 },
        PIX: { expected: 500, counted: 500, difference: 0 },
        DEBIT_CARD: { expected: 0, counted: 0, difference: 0 },
        CREDIT_CARD: { expected: 0, counted: 0, difference: 0 },
        OTHER: { expected: 0, counted: 0, difference: 0 },
      },
    });

    expect(repository.getExpectedCashTotals).toHaveBeenCalledWith(today, 500);
    expect(repository.closeCashRegister).toHaveBeenCalledWith({
      id: cashRegisterRow.id,
      userId: adminUser.id,
      counts: {
        CASH: { expected: 800, counted: 1000, difference: 200 },
        PIX: { expected: 500, counted: 500, difference: 0 },
        DEBIT_CARD: { expected: 0, counted: 0, difference: 0 },
        CREDIT_CARD: { expected: 0, counted: 0, difference: 0 },
        OTHER: { expected: 0, counted: 0, difference: 0 },
      },
    });
  });

  it("closeCashRegister maps CASH_REGISTER_ALREADY_CLOSED to BadRequestException", async () => {
    const repository = createRepository();
    const service = new FinanceService(repository as never);

    repository.getCashRegisterForDate.mockResolvedValueOnce(cashRegisterRow);
    repository.getExpectedCashTotals.mockResolvedValueOnce([
      { method: "CASH", expected: 0, salesCents: 0, expensesCents: 0 },
      { method: "PIX", expected: 0, salesCents: 0, expensesCents: 0 },
      { method: "DEBIT_CARD", expected: 0, salesCents: 0, expensesCents: 0 },
      { method: "CREDIT_CARD", expected: 0, salesCents: 0, expensesCents: 0 },
      { method: "OTHER", expected: 0, salesCents: 0, expensesCents: 0 },
    ]);
    repository.closeCashRegister.mockRejectedValueOnce(
      new FinanceRepositoryError("CASH_REGISTER_ALREADY_CLOSED", "Caixa ja fechado."),
    );

    await expect(
      service.closeCashRegister(adminUser, { counts: fullCountsInput() }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("listExpenses delegates to repository and maps rows to response", async () => {
    const repository = createRepository();
    const service = new FinanceService(repository as never);

    repository.listExpenses.mockResolvedValueOnce([expenseRow]);

    await expect(service.listExpenses({})).resolves.toEqual([
      {
        id: expenseRow.id,
        description: "Gasolina",
        amountCents: 5000,
        category: "GASOLINA",
        paymentMethod: "CASH",
        date: "2026-06-21T00:00:00.000Z",
        createdBy: adminUser.id,
        isDeleted: false,
        createdAt: "2026-06-21T10:00:00.000Z",
        updatedAt: "2026-06-21T10:00:00.000Z",
      },
    ]);
  });

  it("createExpense rejects invalid input", async () => {
    const repository = createRepository();
    const service = new FinanceService(repository as never);

    await expect(service.createExpense(adminUser, { description: "A" })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createExpense).not.toHaveBeenCalled();
  });

  it("createExpense converts date string to Date and creates the expense", async () => {
    const repository = createRepository();
    const service = new FinanceService(repository as never);

    repository.createExpense.mockResolvedValueOnce(expenseRow);

    await expect(
      service.createExpense(adminUser, {
        description: "Gasolina",
        amountCents: 5000,
        category: "GASOLINA",
        paymentMethod: "CASH",
        date: "2026-06-21",
      }),
    ).resolves.toMatchObject({
      id: expenseRow.id,
      description: "Gasolina",
      amountCents: 5000,
    });

    expect(repository.createExpense).toHaveBeenCalledWith({
      description: "Gasolina",
      amountCents: 5000,
      category: "GASOLINA",
      paymentMethod: "CASH",
      date: new Date("2026-06-21T00:00:00.000Z"),
      createdBy: adminUser.id,
    });
  });

  it("updateExpense rejects invalid input", async () => {
    const repository = createRepository();
    const service = new FinanceService(repository as never);

    await expect(service.updateExpense(adminUser, expenseRow.id, { description: "A" })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.updateExpense).not.toHaveBeenCalled();
  });

  it("updateExpense maps EXPENSE_NOT_FOUND to NotFoundException", async () => {
    const repository = createRepository();
    const service = new FinanceService(repository as never);

    repository.updateExpense.mockRejectedValueOnce(
      new FinanceRepositoryError("EXPENSE_NOT_FOUND", "Despesa nao encontrada."),
    );

    await expect(
      service.updateExpense(adminUser, expenseRow.id, { description: "Gasolina atualizada" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("updateExpense converts date string and updates only provided fields", async () => {
    const repository = createRepository();
    const service = new FinanceService(repository as never);

    const updatedRow = { ...expenseRow, description: "Gasolina atualizada" };
    repository.updateExpense.mockResolvedValueOnce(updatedRow);

    await expect(
      service.updateExpense(adminUser, expenseRow.id, { description: "Gasolina atualizada", date: "2026-06-22" }),
    ).resolves.toMatchObject({ description: "Gasolina atualizada" });

    expect(repository.updateExpense).toHaveBeenCalledWith(expenseRow.id, {
      description: "Gasolina atualizada",
      date: new Date("2026-06-22T00:00:00.000Z"),
    });
  });

  it("softDeleteExpense maps EXPENSE_NOT_FOUND to NotFoundException", async () => {
    const repository = createRepository();
    const service = new FinanceService(repository as never);

    repository.softDeleteExpense.mockRejectedValueOnce(
      new FinanceRepositoryError("EXPENSE_NOT_FOUND", "Despesa nao encontrada."),
    );

    await expect(service.softDeleteExpense(adminUser, expenseRow.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("softDeleteExpense maps EXPENSE_ALREADY_DELETED to BadRequestException", async () => {
    const repository = createRepository();
    const service = new FinanceService(repository as never);

    repository.softDeleteExpense.mockRejectedValueOnce(
      new FinanceRepositoryError("EXPENSE_ALREADY_DELETED", "Despesa ja excluida."),
    );

    await expect(service.softDeleteExpense(adminUser, expenseRow.id)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("softDeleteExpense calls repository with id and userId", async () => {
    const repository = createRepository();
    const service = new FinanceService(repository as never);

    const deletedRow = { ...expenseRow, isDeleted: true };
    repository.softDeleteExpense.mockResolvedValueOnce(deletedRow);

    await service.softDeleteExpense(adminUser, expenseRow.id);

    expect(repository.softDeleteExpense).toHaveBeenCalledWith(expenseRow.id, adminUser.id);
  });

  it("getFinanceSummary delegates to repository with start and end dates", async () => {
    const repository = createRepository();
    const service = new FinanceService(repository as never);

    const summary = {
      totalRevenueCents: 20000,
      totalExpensesCents: 5000,
      balanceCents: 15000,
      totalsByPaymentMethod: [],
    };
    repository.getFinanceSummary.mockResolvedValueOnce(summary);

    const start = new Date("2026-06-01T00:00:00.000Z");
    const end = new Date("2026-06-30T23:59:59.999Z");

    await expect(service.getFinanceSummary(start, end)).resolves.toEqual(summary);
    expect(repository.getFinanceSummary).toHaveBeenCalledWith(start, end);
  });
});
