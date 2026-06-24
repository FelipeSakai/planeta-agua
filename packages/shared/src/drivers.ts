import { z } from "zod";

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

export const createDriverSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: phoneSchema,
});

export const updateDriverSchema = createDriverSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0);

export const driverResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  phone: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const driversListResponseSchema = z.object({
  drivers: z.array(driverResponseSchema),
  summary: z.object({
    total: z.number().int().min(0),
    active: z.number().int().min(0),
  }),
});

export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;
export type DriverResponse = z.infer<typeof driverResponseSchema>;
export type DriversListResponse = z.infer<typeof driversListResponseSchema>;