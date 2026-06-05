import { z } from "zod";

export const expenseFormSchema = z.object({
  description: z.string().min(3),
  amountCents: z.number().int().positive(),
  category: z.string().optional(),
  paymentMethod: z.enum(["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD", "OTHER"]).optional(),
  date: z.coerce.date(),
});

export type ExpenseFormInput = z.infer<typeof expenseFormSchema>;
