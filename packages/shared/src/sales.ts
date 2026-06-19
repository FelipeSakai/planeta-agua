import { z } from "zod";

export const paymentMethodValues = ["CASH", "PIX", "DEBIT_CARD", "CREDIT_CARD", "OTHER"] as const;
export const saleStatusValues = ["COMPLETED", "CANCELED"] as const;

const isoDatetimeStringSchema = z.string().datetime({ offset: true });
const nonNegativeAmountCentsSchema = z.number().int().min(0);
const positiveQuantitySchema = z.number().int().min(1);
const cancellationReasonSchema = z.string().trim().min(3).max(160);

const saleItemInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: positiveQuantitySchema,
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
  reason: cancellationReasonSchema,
});

export const quickCustomerInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(20).nullable().optional(),
});

function validateCancellationState(
  value: { status: (typeof saleStatusValues)[number]; canceledAt: string | null; cancellationReason: string | null },
  ctx: z.core.$RefinementCtx,
) {
  if (value.status === "COMPLETED" && (value.canceledAt !== null || value.cancellationReason !== null)) {
    ctx.addIssue({
      code: "custom",
      message: "Completed sales cannot include cancellation data.",
      path: ["status"],
    });
  }

  if (value.status === "CANCELED" && (value.canceledAt === null || value.cancellationReason === null)) {
    ctx.addIssue({
      code: "custom",
      message: "Canceled sales must include cancellation data.",
      path: ["status"],
    });
  }
}

const saleHistoryEntrySchema = z
  .object({
    id: z.string().uuid(),
    customerId: z.string().uuid().nullable(),
    customerName: z.string().nullable(),
    userId: z.string().uuid(),
    userName: z.string(),
    totalAmountCents: nonNegativeAmountCentsSchema,
    paymentMethod: z.enum(paymentMethodValues),
    status: z.enum(saleStatusValues),
    createdAt: isoDatetimeStringSchema,
    canceledAt: isoDatetimeStringSchema.nullable(),
    cancellationReason: cancellationReasonSchema.nullable(),
  })
  .superRefine(validateCancellationState);

export const saleHistoryResponseSchema = z.array(saleHistoryEntrySchema);

const saleDetailItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  productNameSnapshot: z.string(),
  quantity: positiveQuantitySchema,
  unitPriceCents: nonNegativeAmountCentsSchema,
  totalPriceCents: nonNegativeAmountCentsSchema,
});

export const saleDetailResponseSchema = z.object({
  sale: z
    .object({
      id: z.string().uuid(),
      customerId: z.string().uuid().nullable(),
      customerName: z.string().nullable(),
      userId: z.string().uuid(),
      userName: z.string(),
      totalAmountCents: nonNegativeAmountCentsSchema,
      paymentMethod: z.enum(paymentMethodValues),
      status: z.enum(saleStatusValues),
      createdAt: isoDatetimeStringSchema,
      canceledAt: isoDatetimeStringSchema.nullable(),
      cancellationReason: cancellationReasonSchema.nullable(),
      bottle: customerBottleRecordSchema,
      previousBottle: customerBottleRecordSchema,
    })
    .superRefine(validateCancellationState),
  items: z.array(saleDetailItemSchema).min(1),
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
