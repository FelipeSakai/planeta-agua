import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { closeDb, db } from "../../db";
import { customers, products, saleItems, sales, sessions, stockMovements, users } from "../../db/schema";
import { SalesRepository } from "./sales.repository";

describe("SalesRepository", () => {
  const repository = new SalesRepository();

  beforeEach(async () => {
    await db.delete(sessions);
    await db.delete(stockMovements);
    await db.delete(saleItems);
    await db.delete(sales);
    await db.delete(products);
    await db.delete(customers);
    await db.delete(users);
  });

  afterAll(async () => {
    await closeDb();
  });

  it("creates a completed sale, item snapshots, and stock movements in one transaction", async () => {
    const [user] = await db
      .insert(users)
      .values({
        name: "Operador",
        email: "operador@planetaagua.local",
        passwordHash: "hash",
        role: "OPERATOR",
      })
      .returning();
    const [customer] = await db.insert(customers).values({ name: "Maria" }).returning();
    const [product] = await db
      .insert(products)
      .values({
        name: "Galao 20L",
        salePriceCents: 1800,
        stockQuantity: 6,
        minimumStock: 1,
      })
      .returning();

    const createdSale = await repository.createSale({
      customerId: customer.id,
      userId: user.id,
      paymentMethod: "PIX",
      items: [{ productId: product.id, quantity: 2 }],
      bottle: null,
    });

    const persistedSale = await db.query.sales.findFirst({
      where: (sale, { eq }) => eq(sale.id, createdSale.id),
    });
    const persistedItems = await db.query.saleItems.findMany({
      where: (item, { eq }) => eq(item.saleId, createdSale.id),
    });
    const persistedMovements = await db.query.stockMovements.findMany({
      where: (movement, { eq }) => eq(movement.referenceId, createdSale.id),
    });
    const persistedProduct = await db.query.products.findFirst({
      where: (currentProduct, { eq }) => eq(currentProduct.id, product.id),
    });

    expect(persistedSale).toMatchObject({
      id: createdSale.id,
      customerId: customer.id,
      userId: user.id,
      totalAmountCents: 3600,
      paymentMethod: "PIX",
      status: "COMPLETED",
    });
    expect(persistedItems).toEqual([
      expect.objectContaining({
        saleId: createdSale.id,
        productId: product.id,
        productNameSnapshot: "Galao 20L",
        quantity: 2,
        unitPriceCents: 1800,
        totalPriceCents: 3600,
      }),
    ]);
    expect(persistedMovements).toEqual([
      expect.objectContaining({
        productId: product.id,
        userId: user.id,
        type: "SALE",
        quantity: -2,
        referenceId: createdSale.id,
      }),
    ]);
    expect(persistedProduct?.stockQuantity).toBe(4);
  });

  it("stores bottle month, year, and notes on the sale", async () => {
    const [user] = await db
      .insert(users)
      .values({
        name: "Operador",
        email: "operador-bottle@planetaagua.local",
        passwordHash: "hash",
        role: "OPERATOR",
      })
      .returning();
    const [customer] = await db.insert(customers).values({ name: "Jose" }).returning();
    const [product] = await db
      .insert(products)
      .values({
        name: "Agua sem gas",
        salePriceCents: 900,
        stockQuantity: 4,
        minimumStock: 1,
      })
      .returning();

    const createdSale = await repository.createSale({
      customerId: customer.id,
      userId: user.id,
      paymentMethod: "CASH",
      items: [{ productId: product.id, quantity: 1 }],
      bottle: { month: 5, year: 2025, notes: "Lacre azul" },
    });

    const persistedSale = await db.query.sales.findFirst({
      where: (sale, { eq }) => eq(sale.id, createdSale.id),
    });

    expect(persistedSale).toMatchObject({
      bottleMonth: 5,
      bottleYear: 2025,
      bottleNotes: "Lacre azul",
    });
  });

  it("returns latest bottle by customer from the most recent completed sale", async () => {
    const [user] = await db
      .insert(users)
      .values({
        name: "Operador",
        email: "operador-latest@planetaagua.local",
        passwordHash: "hash",
        role: "OPERATOR",
      })
      .returning();
    const [customer] = await db.insert(customers).values({ name: "Ana" }).returning();
    const [product] = await db
      .insert(products)
      .values({
        name: "Agua com gas",
        salePriceCents: 1200,
        stockQuantity: 10,
        minimumStock: 1,
      })
      .returning();

    const firstSale = await repository.createSale({
      customerId: customer.id,
      userId: user.id,
      paymentMethod: "PIX",
      items: [{ productId: product.id, quantity: 1 }],
      bottle: { month: 1, year: 2024, notes: "Primeiro" },
    });
    await db.update(sales).set({ createdAt: new Date("2026-01-10T00:00:00.000Z") }).where(eq(sales.id, firstSale.id));

    await repository.createSale({
      customerId: customer.id,
      userId: user.id,
      paymentMethod: "PIX",
      items: [{ productId: product.id, quantity: 1 }],
      bottle: { month: 3, year: 2025, notes: "Atual" },
    });

    const latestBottle = await repository.getLatestBottleForCustomer(customer.id);

    expect(latestBottle).toEqual({ month: 3, year: 2025, notes: "Atual" });
  });

  it("cancels a sale by setting canceled fields and returning stock", async () => {
    const [user] = await db
      .insert(users)
      .values({
        name: "Administrador",
        email: "admin-sales@planetaagua.local",
        passwordHash: "hash",
        role: "ADMIN",
      })
      .returning();
    const [product] = await db
      .insert(products)
      .values({
        name: "Galao 10L",
        salePriceCents: 1500,
        stockQuantity: 5,
        minimumStock: 1,
      })
      .returning();

    const createdSale = await repository.createSale({
      customerId: null,
      userId: user.id,
      paymentMethod: "DEBIT_CARD",
      items: [{ productId: product.id, quantity: 3 }],
      bottle: null,
    });

    await repository.cancelSale({
      saleId: createdSale.id,
      userId: user.id,
      reason: "Cliente desistiu na entrega.",
    });

    const canceledSale = await db.query.sales.findFirst({
      where: (sale, { eq }) => eq(sale.id, createdSale.id),
    });
    const productAfterCancel = await db.query.products.findFirst({
      where: (currentProduct, { eq }) => eq(currentProduct.id, product.id),
    });
    const saleMovements = await db.query.stockMovements.findMany({
      where: (movement, { eq }) => eq(movement.referenceId, createdSale.id),
    });

    expect(canceledSale).toMatchObject({
      status: "CANCELED",
      canceledByUserId: user.id,
      cancellationReason: "Cliente desistiu na entrega.",
    });
    expect(canceledSale?.canceledAt).toBeInstanceOf(Date);
    expect(productAfterCancel?.stockQuantity).toBe(5);
    expect(saleMovements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "SALE", quantity: -3 }),
        expect.objectContaining({ type: "CANCELED_SALE", quantity: 3, reason: "Cliente desistiu na entrega." }),
      ]),
    );
  });
});
