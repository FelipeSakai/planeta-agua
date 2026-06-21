import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  closeCashRegisterInputSchema,
  createExpenseInputSchema,
  updateExpenseInputSchema,
  updateOpeningBalanceInputSchema,
  type SessionUser,
} from "shared";

import { FinanceRepository } from "./finance.repository";
import { FinanceRepositoryError } from "./finance.errors";
import type {
  CashRegisterRow,
  CreateExpenseRepositoryInput,
  ExpenseRow,
  PaymentMethod,
  UpdateExpenseRepositoryInput,
} from "./finance.types";

type PermissionUser = Pick<SessionUser, "id" | "role">;
type ExpenseListRow = Awaited<ReturnType<FinanceRepository["listExpenses"]>>[number];

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class FinanceService {
  constructor(private readonly financeRepository: FinanceRepository) {}

  async getDashboardData() {
    return this.financeRepository.getDashboardData(new Date());
  }

  async getCashRegisterForToday() {
    const row = await this.financeRepository.getCashRegisterForDate(todayDateString());
    return row ? this.toCashRegisterResponse(row) : null;
  }

  async ensureCashRegisterForToday(userId: string) {
    const today = todayDateString();
    const existing = await this.financeRepository.getCashRegisterForDate(today);

    if (existing) {
      return this.toCashRegisterResponse(existing);
    }

    const created = await this.financeRepository.createCashRegister({
      date: today,
      openingBalanceCents: 0,
      userId,
    });

    return this.toCashRegisterResponse(created);
  }

  async updateOpeningBalance(user: PermissionUser, input: unknown) {
    const parsed = updateOpeningBalanceInputSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException("Fundo de caixa invalido.");
    }

    const today = todayDateString();
    const cashRegister = await this.financeRepository.getCashRegisterForDate(today);

    if (!cashRegister) {
      throw new NotFoundException("Caixa de hoje nao encontrado.");
    }

    try {
      const updated = await this.financeRepository.updateOpeningBalance(cashRegister.id, parsed.data.openingBalanceCents);
      return this.toCashRegisterResponse(updated);
    } catch (error) {
      throw this.mapCashRegisterError(error);
    }
  }

  async closeCashRegister(user: PermissionUser, input: unknown) {
    const parsed = closeCashRegisterInputSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException("Fechamento de caixa invalido.");
    }

    const today = todayDateString();
    const cashRegister = await this.financeRepository.getCashRegisterForDate(today);

    if (!cashRegister) {
      throw new NotFoundException("Caixa de hoje nao encontrado.");
    }

    const expectedTotals = await this.financeRepository.getExpectedCashTotals(today, cashRegister.openingBalanceCents);
    const expectedByMethod = new Map(expectedTotals.map((total) => [total.method, total.expected]));

    const counts: Record<string, { expected: number; counted: number; difference: number }> = {};
    for (const [method, entry] of Object.entries(parsed.data.counts)) {
      const expected = expectedByMethod.get(method as PaymentMethod) ?? 0;
      counts[method] = {
        expected,
        counted: entry.counted,
        difference: entry.counted - expected,
      };
    }

    try {
      const closed = await this.financeRepository.closeCashRegister({
        id: cashRegister.id,
        userId: user.id,
        counts,
      });
      return this.toCashRegisterResponse(closed);
    } catch (error) {
      throw this.mapCashRegisterError(error);
    }
  }

  async listExpenses(filter: { startDate?: Date; endDate?: Date; includeDeleted?: boolean } = {}) {
    const rows = await this.financeRepository.listExpenses(filter);
    return rows.map((row) => this.toExpenseResponse(row));
  }

  async createExpense(user: PermissionUser, input: unknown) {
    const parsed = createExpenseInputSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException("Dados da despesa invalidos.");
    }

    const repositoryInput: CreateExpenseRepositoryInput = {
      description: parsed.data.description,
      amountCents: parsed.data.amountCents,
      category: parsed.data.category,
      paymentMethod: parsed.data.paymentMethod,
      date: new Date(parsed.data.date + "T00:00:00.000Z"),
      createdBy: user.id,
    };

    const created = await this.financeRepository.createExpense(repositoryInput);
    return this.toExpenseResponse(created);
  }

  async updateExpense(user: PermissionUser, id: string, input: unknown) {
    const parsed = updateExpenseInputSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException("Dados da despesa invalidos.");
    }

    const updateData: UpdateExpenseRepositoryInput = {};
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.amountCents !== undefined) updateData.amountCents = parsed.data.amountCents;
    if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
    if (parsed.data.paymentMethod !== undefined) updateData.paymentMethod = parsed.data.paymentMethod;
    if (parsed.data.date !== undefined) updateData.date = new Date(parsed.data.date + "T00:00:00.000Z");

    try {
      const updated = await this.financeRepository.updateExpense(id, updateData);
      return this.toExpenseResponse(updated);
    } catch (error) {
      throw this.mapExpenseError(error);
    }
  }

  async softDeleteExpense(user: PermissionUser, id: string) {
    try {
      const deleted = await this.financeRepository.softDeleteExpense(id, user.id);
      return this.toExpenseResponse(deleted);
    } catch (error) {
      throw this.mapExpenseError(error);
    }
  }

  async getFinanceSummary(startDate: Date, endDate: Date) {
    return this.financeRepository.getFinanceSummary(startDate, endDate);
  }

  private mapCashRegisterError(error: unknown) {
    if (error instanceof FinanceRepositoryError) {
      if (error.code === "CASH_REGISTER_NOT_FOUND") {
        return new NotFoundException("Caixa nao encontrado.");
      }

      if (error.code === "CASH_REGISTER_CLOSED") {
        return new BadRequestException("Caixa fechado nao pode ter fundo alterado.");
      }

      if (error.code === "CASH_REGISTER_ALREADY_CLOSED") {
        return new BadRequestException("Caixa ja fechado.");
      }

      return new BadRequestException(error.message);
    }

    return new BadRequestException("Nao foi possivel atualizar o caixa.");
  }

  private mapExpenseError(error: unknown) {
    if (error instanceof FinanceRepositoryError) {
      if (error.code === "EXPENSE_NOT_FOUND") {
        return new NotFoundException("Despesa nao encontrada.");
      }

      if (error.code === "EXPENSE_ALREADY_DELETED") {
        return new BadRequestException("Despesa ja excluida.");
      }

      return new BadRequestException(error.message);
    }

    return new BadRequestException("Nao foi possivel atualizar a despesa.");
  }

  private toCashRegisterResponse(row: CashRegisterRow) {
    return {
      id: row.id,
      date: row.date,
      openingBalanceCents: row.openingBalanceCents,
      openedAt: row.openedAt.toISOString(),
      openedByUserId: row.openedByUserId,
      closedAt: row.closedAt?.toISOString() ?? null,
      closedByUserId: row.closedByUserId ?? null,
      counts: row.counts,
    };
  }

  private toExpenseResponse(row: ExpenseListRow) {
    return {
      id: row.id,
      description: row.description,
      amountCents: row.amountCents,
      category: (row.category ?? null) as ExpenseRow["category"],
      paymentMethod: (row.paymentMethod ?? null) as ExpenseRow["paymentMethod"],
      date: row.date.toISOString(),
      createdBy: row.createdBy,
      isDeleted: row.isDeleted,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
