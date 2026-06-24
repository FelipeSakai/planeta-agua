import { closeDb } from "../src/db";

import { seedBottles } from "./seed/bottles";
import { seedCustomers } from "./seed/customers";
import { seedFinance } from "./seed/finance";
import { seedProducts } from "./seed/products";
import { resetAllTables } from "./seed/reset";
import { seedSales } from "./seed/sales";
import { seedStock } from "./seed/stock";
import { seedUsers } from "./seed/users";

async function main() {
  const isDev = process.env.NODE_ENV === "development";
  const allowSeed = process.env.ALLOW_SEED === "true";

  if (!isDev && !allowSeed) {
    console.error("ERROR: Seed can only run in development environment.");
    console.error("Set NODE_ENV=development or ALLOW_SEED=true to proceed.");
    process.exit(1);
  }

  console.log("Starting dev seed...");
  console.log("Environment:", isDev ? "development" : "ALLOW_SEED=true");

  try {
    await resetAllTables();
    await seedUsers();
    await seedProducts();
    await seedCustomers();
    await seedStock();
    await seedSales();
    await seedBottles();
    await seedFinance();

    console.log("\nSeed completed successfully!");
    console.log("\nTest credentials:");
    console.log("  Admin: admin@planetaagua.local / admin123 (or ADMIN_PASSWORD env)");
    console.log("  Operator 1: op1@planetaagua.local / op123 (or SEED_OPERATOR_PASSWORD env)");
    console.log("  Operator 2: op2@planetaagua.local / op123 (or SEED_OPERATOR_PASSWORD env)");
  } catch (error) {
    console.error("\nSeed failed:", error);
    process.exit(1);
  } finally {
    await closeDb();
  }
}

main();
