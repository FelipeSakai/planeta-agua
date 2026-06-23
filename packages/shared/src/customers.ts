import { z } from "zod";

const BOTTLE_VALIDITY_YEARS = 3;
const BOTTLE_EXPIRATION_ALERT_DAYS = 30;

export function calculateBottleExpiresAt(month: number, year: number): Date {
  const expiresYear = year + BOTTLE_VALIDITY_YEARS;
  const lastDay = new Date(Date.UTC(expiresYear, month, 0));
  lastDay.setUTCHours(23, 59, 59, 999);
  return lastDay;
}

export function isBottleNearExpiration(expiresAt: Date, now: Date): boolean {
  if (isBottleExpired(expiresAt, now)) {
    return false;
  }
  const diffMs = expiresAt.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= BOTTLE_EXPIRATION_ALERT_DAYS;
}

export function isBottleExpired(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() < now.getTime();
}

const phoneSchema = z
  .string()
  .trim()
  .min(8)
  .max(20)
  .nullable()
  .optional()
  .transform((value) => {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const notesSchema = z
  .string()
  .trim()
  .max(500)
  .nullable()
  .optional()
  .transform((value) => {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const addressSchema = z
  .string()
  .trim()
  .max(200)
  .nullable()
  .optional()
  .transform((value) => {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: phoneSchema,
  address: addressSchema,
  notes: notesSchema,
});

export const updateCustomerSchema = createCustomerSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0);

export const customerResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  notes: z.string().nullable(),
  isActive: z.boolean(),
  hasBottleAlert: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const customersListResponseSchema = z.object({
  customers: z.array(customerResponseSchema),
  summary: z.object({
    total: z.number().int().min(0),
    active: z.number().int().min(0),
    withAlert: z.number().int().min(0),
  }),
});

export const createCustomerBottleSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(new Date().getFullYear() + 1),
  notes: notesSchema,
});

export const updateCustomerBottleSchema = createCustomerBottleSchema.partial().strict().refine((value) => Object.keys(value).length > 0);

export const customerBottleResponseSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  saleId: z.string().uuid().nullable(),
  month: z.number().int().min(1).max(12),
  year: z.number().int(),
  notes: z.string().nullable(),
  isActive: z.boolean(),
  expiresAt: z.string(),
  isNearExpiration: z.boolean(),
  isExpired: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const customerBottleSchema = z.array(customerBottleResponseSchema);

const customerSaleItemSchema = z.object({
  id: z.string().uuid(),
  productNameSnapshot: z.string(),
  quantity: z.number().int().min(1),
  unitPriceCents: z.number().int().min(0),
  totalPriceCents: z.number().int().min(0),
});

const customerSaleSchema = z.object({
  id: z.string().uuid(),
  totalAmountCents: z.number().int().min(0),
  paymentMethod: z.enum(["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD", "OTHER"]),
  status: z.enum(["COMPLETED", "CANCELED", "PENDING_DELIVERY"]),
  createdAt: z.string(),
  items: z.array(customerSaleItemSchema),
});

export const customerDetailResponseSchema = z.object({
  customer: customerResponseSchema,
  bottles: z.array(customerBottleResponseSchema),
  recentSales: z.array(customerSaleSchema),
});

export const duplicateCheckResponseSchema = z.object({
  hasDuplicates: z.boolean(),
  duplicates: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      phone: z.string().nullable(),
    }),
  ),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerResponse = z.infer<typeof customerResponseSchema>;
export type CustomersListResponse = z.infer<typeof customersListResponseSchema>;
export type CreateCustomerBottleInput = z.infer<typeof createCustomerBottleSchema>;
export type UpdateCustomerBottleInput = z.infer<typeof updateCustomerBottleSchema>;
export type CustomerBottleResponse = z.infer<typeof customerBottleResponseSchema>;
export type CustomerDetailResponse = z.infer<typeof customerDetailResponseSchema>;
export type DuplicateCheckResponse = z.infer<typeof duplicateCheckResponseSchema>;
