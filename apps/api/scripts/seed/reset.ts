import { db } from "../../src/db";
import {
  customerBottles,
  customers,
  expenses,
  products,
  saleItems,
  sales,
  stockMovements,
  users,
  cashRegisters,
} from "../../src/db/schema";

export async function resetAllTables(): Promise<void> {
  console.log("Truncating all tables...");

  await db.delete(customerBottles);
  await db.delete(saleItems);
  await db.delete(sales);
  await db.delete(stockMovements);
  await db.delete(expenses);
  await db.delete(cashRegisters);
  await db.delete(customers);
  await db.delete(products);
  await db.delete(users);

  console.log("All tables truncated.");
}
