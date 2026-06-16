import "dotenv/config";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { closeDb, db } from "../src/db";
import { users } from "../src/db/schema";
import { env } from "../src/env";

const SALT_ROUNDS = 12;

const adminSeedSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(8),
});

async function seedAdmin(input: z.infer<typeof adminSeedSchema>) {
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const [existingUser] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);

  if (existingUser) {
    const [updatedUser] = await db
      .update(users)
      .set({
        name: input.name,
        passwordHash,
        role: "ADMIN",
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingUser.id))
      .returning();

    return updatedUser;
  }

  const [createdUser] = await db
    .insert(users)
    .values({
      name: input.name,
      email: input.email,
      passwordHash,
      role: "ADMIN",
      isActive: true,
    })
    .returning();

  return createdUser;
}

async function main() {
  const input = adminSeedSchema.parse({
    name: env.ADMIN_NAME,
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
  });

  const user = await seedAdmin(input);

  console.log(`Admin pronto: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Erro ao criar admin.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
