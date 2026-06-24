import { z } from "zod";

import { paymentMethodValues } from "./sales";

export const expenseCategoryValues = ["MARMITA", "GASOLINA", "MANUTENCAO", "OUTRO"] as const;

const nonNegativeAmountCentsSchema = z.number().int().min(0);
const isoDatetimeStringSchema = z.string().datetime({ offset: true });
const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const createExpenseInputSchema = z.object({
  description: z.string().trim().min(2).max(200),
  amountCents: nonNegativeAmountCentsSchema,
  category: z.enum(expenseCategoryValues),
  paymentMethod: z.enum(paymentMethodValues),
  date: dateStringSchema,
});

export const updateExpenseInputSchema = z.object({
  description: z.string().trim().min(2).max(200).optional(),
  amountCents: nonNegativeAmountCentsSchema.optional(),
  category: z.enum(expenseCategoryValues).optional(),
  paymentMethod: z.enum(paymentMethodValues).optional(),
  date: dateStringSchema.optional(),
});

export const expenseResponseSchema = z.object({
  id: z.string().uuid(),
  description: z.string(),
  amountCents: nonNegativeAmountCentsSchema,
  category: z.enum(expenseCategoryValues).nullable(),
  paymentMethod: z.enum(paymentMethodValues).nullable(),
  date: isoDatetimeStringSchema,
  createdBy: z.string().uuid(),
  isDeleted: z.boolean(),
  createdAt: isoDatetimeStringSchema,
  updatedAt: isoDatetimeStringSchema,
});

export const expenseListResponseSchema = z.array(expenseResponseSchema);

const paymentMethodTotalSchema = z.object({
  method: z.enum(paymentMethodValues),
  salesCount: z.number().int().min(0),
  amountCents: nonNegativeAmountCentsSchema,
});

const lowStockProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  stockQuantity: z.number().int(),
  minimumStock: z.number().int(),
});

const recentSaleSchema = z.object({
  id: z.string(),
  customerName: z.string().nullable(),
  totalAmountCents: nonNegativeAmountCentsSchema,
  paymentMethod: z.enum(paymentMethodValues),
  status: z.enum(["COMPLETED", "CANCELED", "PENDING_DELIVERY"]),
  createdAt: isoDatetimeStringSchema,
});

export const dashboardResponseSchema = z.object({
  todayRevenueCents: nonNegativeAmountCentsSchema,
  todaySalesCount: z.number().int().min(0),
  totalsByPaymentMethod: z.array(paymentMethodTotalSchema),
  lowStockProducts: z.array(lowStockProductSchema),
  recentSales: z.array(recentSaleSchema),
});

export const cashRegisterCountsSchema = z.object({
  expected: z.number().int(),
  counted: nonNegativeAmountCentsSchema,
  difference: z.number().int(),
});

export const cashRegisterResponseSchema = z.object({
  id: z.string(),
  date: dateStringSchema,
  openingBalanceCents: nonNegativeAmountCentsSchema,
  openedAt: isoDatetimeStringSchema,
  openedByUserId: z.string(),
  closedAt: isoDatetimeStringSchema.nullable(),
  closedByUserId: z.string().uuid().nullable(),
  counts: z.record(z.string(), cashRegisterCountsSchema),
});

export const cashRegisterSaleItemSchema = z.object({
  id: z.string().uuid(),
  customerName: z.string().nullable(),
  totalAmountCents: nonNegativeAmountCentsSchema,
  paymentMethod: z.enum(paymentMethodValues),
  createdAt: isoDatetimeStringSchema,
});

export const cashRegisterExpenseItemSchema = z.object({
  id: z.string().uuid(),
  description: z.string(),
  amountCents: nonNegativeAmountCentsSchema,
  paymentMethod: z.enum(paymentMethodValues).nullable(),
  category: z.enum(expenseCategoryValues).nullable(),
});

export const cashRegisterDetailsResponseSchema = z.object({
  cashRegister: cashRegisterResponseSchema.nullable(),
  todaySales: z.array(cashRegisterSaleItemSchema),
  todayExpenses: z.array(cashRegisterExpenseItemSchema),
  totalsByPaymentMethod: z.array(
    z.object({
      method: z.enum(paymentMethodValues),
      salesCents: nonNegativeAmountCentsSchema,
      expensesCents: nonNegativeAmountCentsSchema,
    }),
  ),
  totalSalesCents: nonNegativeAmountCentsSchema,
  totalExpensesCents: nonNegativeAmountCentsSchema,
  expectedCashCents: z.number().int(),
});

export const updateOpeningBalanceInputSchema = z.object({
  openingBalanceCents: nonNegativeAmountCentsSchema,
});

export const closeCashRegisterInputSchema = z.object({
  counts: z.record(
    z.enum(paymentMethodValues),
    z.object({ counted: nonNegativeAmountCentsSchema }),
  ),
});

const paymentMethodSummarySchema = z.object({
  method: z.enum(paymentMethodValues),
  revenueCents: nonNegativeAmountCentsSchema,
  expensesCents: nonNegativeAmountCentsSchema,
  balanceCents: z.number().int(),
});

export const financeSummaryResponseSchema = z.object({
  totalRevenueCents: nonNegativeAmountCentsSchema,
  totalExpensesCents: nonNegativeAmountCentsSchema,
  balanceCents: z.number().int(),
  totalsByPaymentMethod: z.array(paymentMethodSummarySchema),
});

export type CreateExpenseInput = z.infer<typeof createExpenseInputSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseInputSchema>;
export type ExpenseResponse = z.infer<typeof expenseResponseSchema>;
export type ExpenseListResponse = z.infer<typeof expenseListResponseSchema>;
export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;
export type CashRegisterResponse = z.infer<typeof cashRegisterResponseSchema>;
export type CashRegisterCounts = z.infer<typeof cashRegisterCountsSchema>;
export type UpdateOpeningBalanceInput = z.infer<typeof updateOpeningBalanceInputSchema>;
export type CloseCashRegisterInput = z.infer<typeof closeCashRegisterInputSchema>;
export type FinanceSummaryResponse = z.infer<typeof financeSummaryResponseSchema>;
export type CashRegisterDetailsResponse = z.infer<typeof cashRegisterDetailsResponseSchema>;
export type CashRegisterSaleItem = z.infer<typeof cashRegisterSaleItemSchema>;
export type CashRegisterExpenseItem = z.infer<typeof cashRegisterExpenseItemSchema>;
