import { z } from "zod";

export const userRoleSchema = z.enum(["ADMIN", "OPERATOR"]);

export type UserRole = z.infer<typeof userRoleSchema>;

export const sessionUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  role: userRoleSchema,
});

export type SessionUser = z.infer<typeof sessionUserSchema>;
