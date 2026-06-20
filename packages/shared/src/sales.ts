import { z } from "zod";

export const paymentMethodValues = ["CASH", "PIX", "DEBIT_CARD", "CREDIT_CARD", "OTHER"] as const;
export const saleStatusValues = ["COMPLETED", "CANCELED", "PENDING_DELIVERY"] as const;
export const saleHistoryStatusFilterValues = ["COMPLETED", "CANCELED", "PENDING_DELIVERY"] as const;

const isoDatetimeStringSchema = z.string().datetime({ offset: true });
const nonNegativeAmountCentsSchema = z.number().int().min(0);
const positiveQuantitySchema = z.number().int().min(1);
const cancellationReasonSchema = z.string().trim().min(3).max(160);

const saleItemInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: positiveQuantitySchema,
  finalUnitPriceCents: nonNegativeAmountCentsSchema.optional(),
  discountCents: nonNegativeAmountCentsSchema.optional(),
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
  deliveryPending: z.boolean().default(false),
});

export const cancelSaleInputSchema = z.object({
  reason: cancellationReasonSchema,
});

export const quickCustomerInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(20).nullable().optional(),
  code: z.string().trim().max(40).nullable().optional(),
  address: z.string().trim().max(200).nullable().optional(),
});

export const saleCustomerResponseSchema = quickCustomerInputSchema.extend({
  id: z.string().uuid(),
  phone: z.string().trim().min(8).max(20).nullable(),
  code: z.string().trim().max(40).nullable(),
  address: z.string().trim().max(200).nullable(),
  previousBottle: customerBottleRecordSchema,
});

export const saleCustomersResponseSchema = z.array(saleCustomerResponseSchema);

function validateCancellationState(
  value: { status: (typeof saleStatusValues)[number]; canceledAt: string | null; cancellationReason: string | null },
  ctx: z.core.$RefinementCtx,
) {
  const canHaveCancellation = value.status === "CANCELED";

  if (!canHaveCancellation && (value.canceledAt !== null || value.cancellationReason !== null)) {
    ctx.addIssue({
      code: "custom",
      message: "Only canceled sales can include cancellation data.",
      path: ["status"],
    });
  }

  if (canHaveCancellation && (value.canceledAt === null || value.cancellationReason === null)) {
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
    deliveredAt: isoDatetimeStringSchema.nullable(),
    deliveredByUserId: z.string().uuid().nullable(),
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
  discountCents: nonNegativeAmountCentsSchema.nullable(),
  finalUnitPriceCents: nonNegativeAmountCentsSchema.nullable(),
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
      deliveredAt: isoDatetimeStringSchema.nullable(),
      deliveredByUserId: z.string().uuid().nullable(),
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

export const confirmDeliveryInputSchema = z.object({}).default({});

export const saleHistoryFilterSchema = z.object({
  status: z.enum(saleHistoryStatusFilterValues).optional(),
});

export type SaleCustomerResponse = z.infer<typeof saleCustomerResponseSchema>;
export type SaleCustomersResponse = z.infer<typeof saleCustomersResponseSchema>;

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
