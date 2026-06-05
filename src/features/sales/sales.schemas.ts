import { z } from "zod";

export const createSaleItemSchema = z.object({
  productId: z.uuid(),
  quantity: z.number().int().positive(),
});

export const createSaleSchema = z.object({
  customerId: z.uuid().optional(),
  paymentMethod: z.enum(["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD", "OTHER"]),
  items: z.array(createSaleItemSchema).min(1),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
