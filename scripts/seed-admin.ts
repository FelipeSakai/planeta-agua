import "dotenv/config";

import { closeDb } from "../src/db";
import { adminSeedSchema } from "../src/features/auth/auth.schemas";
import { seedAdmin } from "../src/features/auth/auth.service";
import { env } from "../src/lib/env";

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
