import { z } from "zod";

const requiredNonNegativeIntegerSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? Number(trimmed) : Number.NaN;
  }

  if (typeof value === "number") {
    return value;
  }

  return Number.NaN;
}, z.number().int().min(0));

const requiredPositiveIntegerSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? Number(trimmed) : Number.NaN;
  }

  if (typeof value === "number") {
    return value;
  }

  return Number.NaN;
}, z.number().int().min(1));

const requiredReasonSchema = z.string().trim().min(1);

export const stockMovementTypeSchema = z.enum(["IN", "OUT", "ADJUSTMENT", "SALE", "CANCELED_SALE"]);

export const stockEntrySchema = z.object({
  productId: z.string().uuid(),
  quantity: requiredPositiveIntegerSchema,
  reason: requiredReasonSchema,
});

export const stockAdjustmentSchema = z.object({
  productId: z.string().uuid(),
  newQuantity: requiredNonNegativeIntegerSchema,
  reason: requiredReasonSchema,
});

export const stockProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  stockQuantity: z.number().int().min(0),
  minimumStock: z.number().int().min(0),
  isActive: z.boolean(),
  isLowStock: z.boolean(),
});

export const stockMovementSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  userId: z.string().uuid(),
  userName: z.string(),
  type: stockMovementTypeSchema,
  quantity: z.number().int(),
  reason: z.string().nullable(),
  createdAt: z.string(),
});

export const stockPageResponseSchema = z.object({
  products: z.array(stockProductSchema),
  movements: z.array(stockMovementSchema),
  summary: z.object({
    totalProducts: z.number().int().min(0),
    lowStockProducts: z.number().int().min(0),
    totalUnits: z.number().int().min(0),
  }),
});

export const stockMutationResponseSchema = z.object({
  product: stockProductSchema,
  movement: stockMovementSchema,
});

export type StockMovementType = z.infer<typeof stockMovementTypeSchema>;
export type StockEntryInput = z.infer<typeof stockEntrySchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
export type StockProductResponse = z.infer<typeof stockProductSchema>;
export type StockMovementResponse = z.infer<typeof stockMovementSchema>;
export type StockPageResponse = z.infer<typeof stockPageResponseSchema>;
export type StockMutationResponse = z.infer<typeof stockMutationResponseSchema>;

export function getStockMovementTypeLabel(type: StockMovementType) {
  const labels: Record<StockMovementType, string> = {
    IN: "Entrada",
    OUT: "Saida",
    ADJUSTMENT: "Ajuste",
    SALE: "Venda",
    CANCELED_SALE: "Venda cancelada",
  };

  return labels[type];
}
