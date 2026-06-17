import { z } from "zod";

const nullableDescriptionSchema = z
  .string()
  .nullish()
  .transform((value) => {
    const trimmed = value?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : null;
  });

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

export const createProductSchema = z.object({
  name: z.string().trim().min(1),
  description: nullableDescriptionSchema,
  salePriceCents: requiredNonNegativeIntegerSchema,
  stockQuantity: requiredNonNegativeIntegerSchema,
  minimumStock: requiredNonNegativeIntegerSchema,
});

export const updateProductSchema = createProductSchema
  .omit({ stockQuantity: true })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0);

export const productResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  salePriceCents: z.number().int().min(0),
  stockQuantity: z.number().int().min(0),
  minimumStock: z.number().int().min(0),
  isActive: z.boolean(),
  isLowStock: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const productsListResponseSchema = z.object({
  products: z.array(productResponseSchema),
  summary: z.object({
    total: z.number().int().min(0),
    active: z.number().int().min(0),
    lowStock: z.number().int().min(0),
  }),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductResponse = z.infer<typeof productResponseSchema>;
export type ProductsListResponse = z.infer<typeof productsListResponseSchema>;

export function formatCentsToBRL(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
    .format(valueInCents / 100)
    .replace("\u00A0", " ");
}

export function parseBRLToCents(value: string) {
  const withoutCurrency = value.trim().replace(/^R\$\s*/, "");

  if (/[^\d,\.\s-]/.test(withoutCurrency)) {
    return null;
  }

  const sanitized = withoutCurrency.replace(/\s/g, "");

  if (!sanitized || sanitized.startsWith("-")) {
    return null;
  }

  const brlPattern = /^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/;
  const decimalDotPattern = /^\d+(\.\d{1,2})?$/;

  if (brlPattern.test(sanitized)) {
    const parsed = Number(sanitized.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
  }

  if (decimalDotPattern.test(sanitized)) {
    const parsed = Number(sanitized);
    return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
  }

  return null;
}
