import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import type { SessionUser } from "shared";
import { describe, expect, it, vi } from "vitest";

import { SESSION_COOKIE_NAME } from "../auth/session";
import { FinanceController } from "./finance.controller";

const request = { cookies: { [SESSION_COOKIE_NAME]: "token" } };

function createController() {
  const defaultUser: SessionUser = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Operador",
    email: "operador@planetaagua.local",
    role: "OPERATOR",
  };
  const authService = {
    getUserByToken: vi.fn(async (): Promise<SessionUser> => defaultUser),
  };
  const financeService = {
    getDashboardData: vi.fn(),
    getCashRegisterForToday: vi.fn(),
    updateOpeningBalance: vi.fn(),
    closeCashRegister: vi.fn(),
    listExpenses: vi.fn(),
    createExpense: vi.fn(),
    updateExpense: vi.fn(),
    softDeleteExpense: vi.fn(),
    getFinanceSummary: vi.fn(),
  };

  return {
    controller: new FinanceController(authService as never, financeService as never),
    authService,
    financeService,
  };
}

const fullCountsBody = {
  counts: {
    CASH: { counted: 100 },
    PIX: { counted: 0 },
    DEBIT_CARD: { counted: 0 },
    CREDIT_CARD: { counted: 0 },
    OTHER: { counted: 0 },
  },
};

describe("FinanceController", () => {
  it("GET /finance/dashboard requires authentication", async () => {
    const { controller } = createController();

    await expect(controller.dashboard({ cookies: {} } as never)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("GET /finance/dashboard delegates to service for authenticated requests", async () => {
    const { controller, financeService } = createController();
    const dashboard = { todayRevenueCents: 10000, todaySalesCount: 3, totalsByPaymentMethod: [], lowStockProducts: [], recentSales: [] };
    financeService.getDashboardData.mockResolvedValueOnce(dashboard);

    await expect(controller.dashboard(request as never)).resolves.toEqual(dashboard);
    expect(financeService.getDashboardData).toHaveBeenCalled();
  });

  it("GET /cash-register/today requires authentication", async () => {
    const { controller } = createController();

    await expect(controller.cashRegisterToday({ cookies: {} } as never)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("POST /cash-register/today/opening-balance delegates to service with authenticated user", async () => {
    const { controller, financeService } = createController();
    const body = { openingBalanceCents: 1000 };
    const result = { id: "33333333-3333-4333-8333-333333333333" };
    financeService.updateOpeningBalance.mockResolvedValueOnce(result);

    await expect(controller.updateOpeningBalance(request as never, body)).resolves.toEqual(result);
    expect(financeService.updateOpeningBalance).toHaveBeenCalledWith(
      expect.objectContaining({ id: "11111111-1111-4111-8111-111111111111", role: "OPERATOR" }),
      body,
    );
  });

  it("POST /cash-register/today/close requires authentication", async () => {
    const { controller } = createController();

    await expect(controller.closeCashRegister({ cookies: {} } as never, fullCountsBody)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("POST /cash-register/today/close delegates to service with authenticated user and body", async () => {
    const { controller, financeService } = createController();
    const result = { id: "33333333-3333-4333-8333-333333333333", closedAt: "2026-06-21T18:00:00.000Z" };
    financeService.closeCashRegister.mockResolvedValueOnce(result);

    await expect(controller.closeCashRegister(request as never, fullCountsBody)).resolves.toEqual(result);
    expect(financeService.closeCashRegister).toHaveBeenCalledWith(
      expect.objectContaining({ id: "11111111-1111-4111-8111-111111111111", role: "OPERATOR" }),
      fullCountsBody,
    );
  });

  it("GET /expenses requires authentication", async () => {
    const { controller } = createController();

    await expect(controller.listExpenses({ cookies: {} } as never)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("GET /expenses delegates to service with date filters", async () => {
    const { controller, financeService } = createController();
    financeService.listExpenses.mockResolvedValueOnce([]);

    await controller.listExpenses(request as never, "2026-06-01", "2026-06-30");

    expect(financeService.listExpenses).toHaveBeenCalledWith({
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-06-30"),
    });
  });

  it("GET /expenses delegates to service without date filters", async () => {
    const { controller, financeService } = createController();
    financeService.listExpenses.mockResolvedValueOnce([]);

    await controller.listExpenses(request as never);

    expect(financeService.listExpenses).toHaveBeenCalledWith({ startDate: undefined, endDate: undefined });
  });

  it("POST /expenses requires authentication", async () => {
    const { controller } = createController();

    await expect(controller.createExpense({ cookies: {} } as never, {})).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("POST /expenses delegates to service with authenticated user and body", async () => {
    const { controller, financeService } = createController();
    const body = { description: "Gasolina", amountCents: 5000, category: "GASOLINA", paymentMethod: "CASH", date: "2026-06-21" };
    const result = { id: "44444444-4444-4444-8444-444444444444" };
    financeService.createExpense.mockResolvedValueOnce(result);

    await expect(controller.createExpense(request as never, body)).resolves.toEqual(result);
    expect(financeService.createExpense).toHaveBeenCalledWith(
      expect.objectContaining({ id: "11111111-1111-4111-8111-111111111111", role: "OPERATOR" }),
      body,
    );
  });

  it("PATCH /expenses/:id rejects invalid UUID", async () => {
    const { controller } = createController();

    await expect(controller.updateExpense("not-a-uuid", request as never, {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it("PATCH /expenses/:id delegates to service with parsed id and authenticated user", async () => {
    const { controller, financeService } = createController();
    const body = { description: "Gasolina atualizada" };
    const result = { id: "44444444-4444-4444-8444-444444444444" };
    financeService.updateExpense.mockResolvedValueOnce(result);

    await expect(controller.updateExpense("44444444-4444-4444-8444-444444444444", request as never, body)).resolves.toEqual(result);
    expect(financeService.updateExpense).toHaveBeenCalledWith(
      expect.objectContaining({ id: "11111111-1111-4111-8111-111111111111", role: "OPERATOR" }),
      "44444444-4444-4444-8444-444444444444",
      body,
    );
  });

  it("DELETE /expenses/:id rejects invalid UUID", async () => {
    const { controller } = createController();

    await expect(controller.deleteExpense("not-a-uuid", request as never)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("DELETE /expenses/:id delegates to service with parsed id and authenticated user", async () => {
    const { controller, financeService } = createController();
    const result = { id: "44444444-4444-4444-8444-444444444444", isDeleted: true };
    financeService.softDeleteExpense.mockResolvedValueOnce(result);

    await expect(controller.deleteExpense("44444444-4444-4444-8444-444444444444", request as never)).resolves.toEqual(result);
    expect(financeService.softDeleteExpense).toHaveBeenCalledWith(
      expect.objectContaining({ id: "11111111-1111-4111-8111-111111111111", role: "OPERATOR" }),
      "44444444-4444-4444-8444-444444444444",
    );
  });

  it("GET /finance/summary rejects OPERATOR with BadRequestException", async () => {
    const { controller } = createController();

    await expect(controller.summary(request as never)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("GET /finance/summary allows ADMIN and delegates to service", async () => {
    const { controller, authService, financeService } = createController();
    const admin: SessionUser = {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Admin",
      email: "admin@planetaagua.local",
      role: "ADMIN",
    };
    authService.getUserByToken.mockResolvedValueOnce(admin);
    const summary = {
      totalRevenueCents: 20000,
      totalExpensesCents: 5000,
      balanceCents: 15000,
      totalsByPaymentMethod: [],
    };
    financeService.getFinanceSummary.mockResolvedValueOnce(summary);

    await expect(controller.summary(request as never, "2026-06-01", "2026-06-30")).resolves.toEqual(summary);
    expect(financeService.getFinanceSummary).toHaveBeenCalledWith(new Date("2026-06-01"), new Date("2026-06-30"));
  });

  it("GET /finance/summary requires authentication", async () => {
    const { controller } = createController();

    await expect(controller.summary({ cookies: {} } as never)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
