import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";

import { closeDb, db } from "../src/db";
import { users } from "../src/db/schema";
import { env } from "../src/env";

async function main() {
  if (!env.ADMIN_NAME || !env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    throw new Error("Configure ADMIN_NAME, ADMIN_EMAIL e ADMIN_PASSWORD no Render.");
  }

  await migrate(db, { migrationsFolder: "./src/db/migrations" });

  const existingAdmin = await db.query.users.findFirst({
    where: eq(users.email, env.ADMIN_EMAIL),
  });

  if (!existingAdmin) {
    await db.insert(users).values({
      name: env.ADMIN_NAME,
      email: env.ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(env.ADMIN_PASSWORD, 12),
      role: "ADMIN",
      isActive: true,
    });
    console.log("Administrador inicial criado.");
  } else if (!(await bcrypt.compare(env.ADMIN_PASSWORD, existingAdmin.passwordHash))) {
    await db
      .update(users)
      .set({ passwordHash: await bcrypt.hash(env.ADMIN_PASSWORD, 12), updatedAt: new Date() })
      .where(eq(users.id, existingAdmin.id));
    console.log("Senha do administrador sincronizada com ADMIN_PASSWORD.");
  }
}

main()
  .catch((error: unknown) => {
    console.error("Falha ao preparar o banco:", error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
