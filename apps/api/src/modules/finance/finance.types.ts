import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { cashRegisters, expenses } from "../../db/schema";
import type { paymentMethodValues, expenseCategoryValues } from "shared";

export type CashRegisterRow = InferSelectModel<typeof cashRegisters>;
export type NewCashRegisterRow = InferInsertModel<typeof cashRegisters>;
export type ExpenseRow = InferSelectModel<typeof expenses>;
export type NewExpenseRow = InferInsertModel<typeof expenses>;
export type PaymentMethod = (typeof paymentMethodValues)[number];
export type ExpenseCategory = (typeof expenseCategoryValues)[number];

export type CreateExpenseRepositoryInput = {
  description: string;
  amountCents: number;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  date: Date;
  createdBy: string;
};

export type UpdateExpenseRepositoryInput = Partial<Omit<CreateExpenseRepositoryInput, "createdBy">>;

export type ListExpensesFilter = {
  startDate?: Date;
  endDate?: Date;
  includeDeleted?: boolean;
};

export type CloseCashRegisterRepositoryInput = {
  id: string;
  userId: string;
  counts: Record<string, { expected: number; counted: number; difference: number }>;
};

export type CreateCashRegisterInput = {
  date: string;
  openingBalanceCents: number;
  userId: string;
};
