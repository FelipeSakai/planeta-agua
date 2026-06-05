import { z } from "zod";

export const stockAdjustmentSchema = z.object({
  productId: z.uuid(),
  quantity: z.number().int(),
  reason: z.string().min(3),
});

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
