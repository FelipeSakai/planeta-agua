import { db } from "../../src/db";
import { customerBottles } from "../../src/db/schema";
import { customerIds } from "./customers";

export async function seedBottles(): Promise<void> {
  console.log("Seeding customer bottles...");

  const customerId = customerIds[0];
  const now = new Date();

  const bottlesData = [
    { id: "00000001-0000-4000-8000-000000000001", customerId, saleId: null, month: now.getMonth() + 1, year: now.getFullYear(), notes: "Galao recente - seed", isActive: true, expiresAt: new Date(now.getFullYear() + 3, now.getMonth(), 0, 23, 59, 59, 999) },
    { id: "00000002-0000-4000-8000-000000000002", customerId, saleId: null, month: now.getMonth() + 1, year: now.getFullYear() - 3, notes: "Galao vencido - seed", isActive: true, expiresAt: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999) },
    { id: "00000003-0000-4000-8000-000000000003", customerId, saleId: null, month: now.getMonth() + 2, year: now.getFullYear() - 3, notes: "Galao proximo do vencimento - seed", isActive: true, expiresAt: new Date(now.getFullYear() + 1, now.getMonth() + 1, 0, 23, 59, 59, 999) },
    { id: "00000004-0000-4000-8000-000000000004", customerId, saleId: null, month: now.getMonth() + 3, year: now.getFullYear() - 3, notes: "Galao proximo do vencimento - seed", isActive: true, expiresAt: new Date(now.getFullYear() + 1, now.getMonth() + 2, 0, 23, 59, 59, 999) },
    { id: "00000005-0000-4000-8000-000000000005", customerId, saleId: null, month: 6, year: 2024, notes: "Galao antigo - seed", isActive: true, expiresAt: new Date(2027, 5, 0, 23, 59, 59, 999) },
  ];

  await db.insert(customerBottles).values(bottlesData);

  console.log("Created 5 manual customer bottles (1 recent, 1 expired, 2 near expiration, 1 old).");
}
