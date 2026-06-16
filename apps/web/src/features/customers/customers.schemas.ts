import { z } from "zod";

export const customerFormSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export type CustomerFormInput = z.infer<typeof customerFormSchema>;
