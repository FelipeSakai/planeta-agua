import bcrypt from "bcryptjs";

import { db } from "../../src/db";
import { users } from "../../src/db/schema";

const SALT_ROUNDS = 12;

export async function seedUsers(): Promise<void> {
  console.log("Seeding users...");

  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const operatorPassword = process.env.SEED_OPERATOR_PASSWORD || "op123";

  const adminHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);
  const op1Hash = await bcrypt.hash(operatorPassword, SALT_ROUNDS);
  const op2Hash = await bcrypt.hash(operatorPassword, SALT_ROUNDS);

  await db.insert(users).values([
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Admin",
      email: "admin@planetaagua.local",
      passwordHash: adminHash,
      role: "ADMIN",
      isActive: true,
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Operador 1",
      email: "op1@planetaagua.local",
      passwordHash: op1Hash,
      role: "OPERATOR",
      isActive: true,
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Operador 2",
      email: "op2@planetaagua.local",
      passwordHash: op2Hash,
      role: "OPERATOR",
      isActive: true,
    },
  ]);

  console.log("Created 3 users (1 admin, 2 operators).");
}
