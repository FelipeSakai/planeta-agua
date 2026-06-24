import { db } from "../../src/db";
import { stockMovements } from "../../src/db/schema";

export async function seedStock(): Promise<void> {
  console.log("Seeding stock movements...");

  const adminId = "11111111-1111-1111-1111-111111111111";

  await db.insert(stockMovements).values([
    { id: "00000011-0000-0000-0000-000000000001", productId: "44444444-4444-4444-4444-444444444444", userId: adminId, type: "IN", quantity: 50, reason: "Estoque inicial - seed", referenceId: null },
    { id: "00000011-0000-0000-0000-000000000002", productId: "55555555-5555-5555-5555-555555555555", userId: adminId, type: "IN", quantity: 50, reason: "Estoque inicial - seed", referenceId: null },
    { id: "00000011-0000-0000-0000-000000000003", productId: "66666666-6666-6666-6666-666666666666", userId: adminId, type: "IN", quantity: 30, reason: "Estoque inicial - seed", referenceId: null },
    { id: "00000011-0000-0000-0000-000000000004", productId: "77777777-7777-7777-7777-777777777777", userId: adminId, type: "IN", quantity: 20, reason: "Estoque inicial - seed", referenceId: null },
    { id: "00000011-0000-0000-0000-000000000005", productId: "88888888-8888-8888-8888-888888888888", userId: adminId, type: "IN", quantity: 10, reason: "Estoque inicial - seed", referenceId: null },
    { id: "00000011-0000-0000-0000-000000000006", productId: "99999999-9999-9999-9999-999999999999", userId: adminId, type: "ADJUSTMENT", quantity: 2, reason: "Ajuste manual - seed", referenceId: null },
    { id: "00000011-0000-0000-0000-000000000007", productId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", userId: adminId, type: "ADJUSTMENT", quantity: -1, reason: "Ajuste manual - seed", referenceId: null },
    { id: "00000011-0000-0000-0000-000000000008", productId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", userId: adminId, type: "ADJUSTMENT", quantity: 1, reason: "Ajuste manual - seed", referenceId: null },
  ]);

  console.log("Created 8 stock movements (5 initial entries, 3 adjustments).");
}
