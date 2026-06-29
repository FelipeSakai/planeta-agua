import { z } from "zod";

export const operatorUserResponseSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  email: z.email(),
  role: z.literal("OPERATOR"),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).strip();

export const operatorUsersListResponseSchema = z.object({
  users: z.array(operatorUserResponseSchema),
});

export const createOperatorUserSchema = z.object({
  name: z.string().trim().min(1),
  email: z.email(),
  password: z.string().min(8),
});

export const updateOperatorUserSchema = z.object({
  name: z.string().trim().min(1),
  email: z.email(),
});

export const resetOperatorPasswordSchema = z.object({
  password: z.string().min(8),
});

export type OperatorUserResponse = z.infer<typeof operatorUserResponseSchema>;
export type OperatorUsersListResponse = z.infer<typeof operatorUsersListResponseSchema>;
export type CreateOperatorUserInput = z.infer<typeof createOperatorUserSchema>;
export type UpdateOperatorUserInput = z.infer<typeof updateOperatorUserSchema>;
export type ResetOperatorPasswordInput = z.infer<typeof resetOperatorPasswordSchema>;
