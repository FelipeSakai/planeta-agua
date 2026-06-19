import { z } from "zod";

export const paymentMethodValues = ["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD", "OTHER"] as const;
export const saleStatusValues = ["COMPLETED", "CANCELED"] as const;

const saleItemInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

const bottleFieldsSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  notes: z.string().trim().max(120).nullable().optional(),
});

export const customerBottleRecordSchema = bottleFieldsSchema.nullable();

export const createSaleInputSchema = z.object({
  customerId: z.string().uuid().nullable(),
  paymentMethod: z.enum(paymentMethodValues),
  items: z.array(saleItemInputSchema).min(1),
  bottle: customerBottleRecordSchema,
});

export const cancelSaleInputSchema = z.object({
  reason: z.string().trim().min(3).max(160),
});

export const quickCustomerInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(20).nullable().optional(),
});

export const saleHistoryResponseSchema = z.array(
  z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid().nullable(),
    customerName: z.string().nullable(),
    userId: z.string().uuid(),
    userName: z.string(),
    totalAmountCents: z.number().int(),
    paymentMethod: z.enum(paymentMethodValues),
    status: z.enum(saleStatusValues),
    createdAt: z.string(),
    canceledAt: z.string().nullable(),
    cancellationReason: z.string().nullable(),
  }),
);

export const saleDetailResponseSchema = z.object({
  sale: z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid().nullable(),
    customerName: z.string().nullable(),
    userId: z.string().uuid(),
    userName: z.string(),
    totalAmountCents: z.number().int(),
    paymentMethod: z.enum(paymentMethodValues),
    status: z.enum(saleStatusValues),
    createdAt: z.string(),
    canceledAt: z.string().nullable(),
    cancellationReason: z.string().nullable(),
    bottle: customerBottleRecordSchema,
    previousBottle: customerBottleRecordSchema,
  }),
  items: z.array(
    z.object({
      id: z.string().uuid(),
      productId: z.string().uuid(),
      productNameSnapshot: z.string(),
      quantity: z.number().int(),
      unitPriceCents: z.number().int(),
      totalPriceCents: z.number().int(),
    }),
  ),
  bottleAlerts: z.object({
    expired: z.boolean(),
    mismatch: z.boolean(),
  }),
});

type BottleRecord = z.infer<typeof bottleFieldsSchema>;

export function getBottleAgeInMonths(bottle: Pick<BottleRecord, "month" | "year">, now: Date) {
  return (now.getUTCFullYear() - bottle.year) * 12 + (now.getUTCMonth() + 1 - bottle.month);
}

export function isBottleExpired(bottle: Pick<BottleRecord, "month" | "year"> | null, now: Date) {
  if (!bottle) {
    return false;
  }

  return getBottleAgeInMonths(bottle, now) > 36;
}

export function hasBottleMismatch(
  previousBottle: Pick<BottleRecord, "month" | "year"> | null,
  currentBottle: Pick<BottleRecord, "month" | "year"> | null,
) {
  if (!previousBottle || !currentBottle) {
    return false;
  }

  return previousBottle.month !== currentBottle.month || previousBottle.year !== currentBottle.year;
}
