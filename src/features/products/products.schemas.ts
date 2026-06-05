import { z } from "zod";

export const productFormSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  salePriceCents: z.number().int().nonnegative(),
  stockQuantity: z.number().int().nonnegative(),
  minimumStock: z.number().int().nonnegative(),
  isActive: z.boolean().default(true),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;
