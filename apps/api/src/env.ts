import { resolve } from "node:path";

import { config } from "dotenv";

import { z } from "zod";

config({ path: resolve(__dirname, "../../../.env") });
config({ path: resolve(process.cwd(), ".env"), override: true });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32).optional(),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  API_PORT: z.coerce.number().int().positive().default(3333),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  ADMIN_NAME: z.string().min(1).optional(),
  ADMIN_EMAIL: z.email().optional(),
  ADMIN_PASSWORD: z.string().optional()
});

export const env = envSchema.parse(process.env);
