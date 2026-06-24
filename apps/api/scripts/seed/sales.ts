import { db } from "../../src/db";
import { sales, saleItems } from "../../src/db/schema";
import { customerIds } from "./customers";

export async function seedSales(): Promise<void> {
  console.log("Seeding sales...");

  const adminId = "11111111-1111-1111-1111-111111111111";
  const op1Id = "22222222-2222-2222-2222-222222222222";
  const op2Id = "33333333-3333-3333-3333-333333333333";

  const galaoCompletoId = "44444444-4444-4444-4444-444444444444";
  const galaoTrocaId = "55555555-5555-5555-5555-555555555555";
  const agua500Id = "66666666-6666-6666-6666-666666666666";
  const agua1500Id = "77777777-7777-7777-7777-777777777777";

  const now = new Date();
  const salesData: (typeof sales.$inferInsert)[] = [];
  const saleItemsData: (typeof saleItems.$inferInsert)[] = [];

  for (let i = 0; i < 80; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const saleDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const saleId = `${String(i + 1).padStart(8, "0")}-0000-0000-0000-${String(i + 1).padStart(12, "0")}`;

    const userId = i % 3 === 0 ? op1Id : i % 3 === 1 ? op2Id : adminId;
    const custId = customerIds[i % 28];

    const isCanceled = i < 5;
    const isPendingDelivery = i >= 5 && i < 8;
    const status = isCanceled ? "CANCELED" : isPendingDelivery ? "PENDING_DELIVERY" : "COMPLETED";

    const paymentMethods = ["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD"] as const;
    const paymentMethod = paymentMethods[i % 4];

    const items: typeof saleItems.$inferInsert[] = [];
    let totalAmountCents = 0;

    const hasCompleteBottle = i % 5 === 0;
    const hasExchangeBottle = i % 5 === 1;

    if (hasCompleteBottle) {
      items.push({ id: `${String(i * 3 + 1).padStart(8, "0")}-0000-0000-0000-${String(i * 3 + 1).padStart(12, "0")}`, saleId, productId: galaoCompletoId, productNameSnapshot: "Galao 20L Completo", quantity: 1, unitPriceCents: 1200, totalPriceCents: 1200, discountCents: null, finalUnitPriceCents: null });
      totalAmountCents += 1200;
    } else if (hasExchangeBottle) {
      items.push({ id: `${String(i * 3 + 1).padStart(8, "0")}-0000-0000-0000-${String(i * 3 + 1).padStart(12, "0")}`, saleId, productId: galaoTrocaId, productNameSnapshot: "Galao 20L Troca", quantity: 1, unitPriceCents: 800, totalPriceCents: 800, discountCents: null, finalUnitPriceCents: null });
      totalAmountCents += 800;
    }

    if (i % 2 === 0) {
      items.push({ id: `${String(i * 3 + 2).padStart(8, "0")}-0000-0000-0000-${String(i * 3 + 2).padStart(12, "0")}`, saleId, productId: agua500Id, productNameSnapshot: "Agua 500ml (fardo 12un)", quantity: 1, unitPriceCents: 1800, totalPriceCents: 1800, discountCents: null, finalUnitPriceCents: null });
      totalAmountCents += 1800;
    }

    if (i % 3 === 0) {
      items.push({ id: `${String(i * 3 + 3).padStart(8, "0")}-0000-0000-0000-${String(i * 3 + 3).padStart(12, "0")}`, saleId, productId: agua1500Id, productNameSnapshot: "Agua 1,5L", quantity: 2, unitPriceCents: 500, totalPriceCents: 1000, discountCents: null, finalUnitPriceCents: null });
      totalAmountCents += 1000;
    }

    salesData.push({
      id: saleId,
      customerId: custId,
      userId,
      totalAmountCents,
      paymentMethod,
      status,
      bottleMonth: hasCompleteBottle ? saleDate.getMonth() + 1 : null,
      bottleYear: hasCompleteBottle ? saleDate.getFullYear() : null,
      bottleNotes: hasCompleteBottle ? "Galao completo - seed" : null,
      canceledAt: isCanceled ? saleDate : null,
      canceledByUserId: isCanceled ? adminId : null,
      cancellationReason: isCanceled ? "Cancelado - seed" : null,
      deliveredAt: status === "COMPLETED" ? saleDate : null,
      deliveredByUserId: status === "COMPLETED" ? userId : null,
    });

    saleItemsData.push(...items);
  }

  await db.insert(sales).values(salesData);
  await db.insert(saleItems).values(saleItemsData);

  console.log(`Created ${salesData.length} sales with ${saleItemsData.length} items.`);
}
