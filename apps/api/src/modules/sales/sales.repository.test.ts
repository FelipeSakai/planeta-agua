import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { closeDb, db } from "../../db";
import { customers, products, saleItems, sales, sessions, stockMovements, users } from "../../db/schema";
import { SalesRepositoryError } from "./sales.errors";
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

  it("searches customers by phone and returns an initial ordered list for blank queries", async () => {
    const [ana] = await db
      .insert(customers)
      .values({ name: "Ana", phone: "11911112222" })
      .returning();
    const [bruno] = await db
      .insert(customers)
      .values({ name: "Bruno", phone: "11888887777" })
      .returning();

    await expect(repository.searchCustomers("")).resolves.toMatchObject([
      { id: ana.id, name: "Ana", phone: "11911112222" },
      { id: bruno.id, name: "Bruno", phone: "11888887777" },
    ]);
    await expect(repository.searchCustomers("8888")).resolves.toMatchObject([
      { id: bruno.id, name: "Bruno", phone: "11888887777" },
    ]);
  });

  it("lists sales with creator, customer, and canceler relations", async () => {
    const [operator] = await db
      .insert(users)
      .values({
        name: "Operador Lista",
        email: "operador-lista@planetaagua.local",
        passwordHash: "hash",
        role: "OPERATOR",
      })
      .returning();
    const [admin] = await db
      .insert(users)
      .values({
        name: "Admin Lista",
        email: "admin-lista@planetaagua.local",
        passwordHash: "hash",
        role: "ADMIN",
      })
      .returning();
    const [customer] = await db.insert(customers).values({ name: "Cliente Lista" }).returning();
    const [product] = await db
      .insert(products)
      .values({
        name: "Galao Lista",
        salePriceCents: 2100,
        stockQuantity: 8,
        minimumStock: 1,
      })
      .returning();

    const completedSale = await repository.createSale({
      customerId: customer.id,
      userId: operator.id,
      paymentMethod: "CASH",
      items: [{ productId: product.id, quantity: 1 }],
      bottle: null,
    });

    await db
      .update(sales)
      .set({ createdAt: new Date("2026-02-01T00:00:00.000Z") })
      .where(eq(sales.id, completedSale.id));

    const canceledSale = await repository.createSale({
      customerId: customer.id,
      userId: operator.id,
      paymentMethod: "PIX",
      items: [{ productId: product.id, quantity: 2 }],
      bottle: null,
    });

    await repository.cancelSale({
      saleId: canceledSale.id,
      userId: admin.id,
      reason: "Cliente desistiu.",
    });

    const listedSales = await repository.listSales();

    expect(listedSales).toHaveLength(2);
    expect(listedSales[0]).toMatchObject({
      id: canceledSale.id,
      user: { id: operator.id, name: "Operador Lista" },
      customer: { id: customer.id, name: "Cliente Lista" },
      canceledByUser: { id: admin.id, name: "Admin Lista" },
      paymentMethod: "PIX",
      status: "CANCELED",
    });
    expect(listedSales[1]).toMatchObject({
      id: completedSale.id,
      user: { id: operator.id, name: "Operador Lista" },
      customer: { id: customer.id, name: "Cliente Lista" },
      canceledByUser: null,
      paymentMethod: "CASH",
      status: "COMPLETED",
    });
  });

  it("returns sale detail with relation data, items, and previous bottle", async () => {
    const [operator] = await db
      .insert(users)
      .values({
        name: "Operador Detalhe",
        email: "operador-detalhe@planetaagua.local",
        passwordHash: "hash",
        role: "OPERATOR",
      })
      .returning();
    const [customer] = await db.insert(customers).values({ name: "Cliente Detalhe" }).returning();
    const [product] = await db
      .insert(products)
      .values({
        name: "Galao Detalhe",
        salePriceCents: 1950,
        stockQuantity: 10,
        minimumStock: 1,
      })
      .returning();

    const firstSale = await repository.createSale({
      customerId: customer.id,
      userId: operator.id,
      paymentMethod: "CASH",
      items: [{ productId: product.id, quantity: 1 }],
      bottle: { month: 4, year: 2024, notes: "Anterior" },
    });

    await db
      .update(sales)
      .set({ createdAt: new Date("2026-03-01T00:00:00.000Z") })
      .where(eq(sales.id, firstSale.id));

    const secondSale = await repository.createSale({
      customerId: customer.id,
      userId: operator.id,
      paymentMethod: "DEBIT_CARD",
      items: [{ productId: product.id, quantity: 2 }],
      bottle: { month: 6, year: 2025, notes: "Atual" },
    });

    const saleDetail = await repository.getSaleDetail(secondSale.id);

    expect(saleDetail).toMatchObject({
      sale: {
        id: secondSale.id,
        customerId: customer.id,
        userId: operator.id,
        paymentMethod: "DEBIT_CARD",
        status: "COMPLETED",
        customer: { id: customer.id, name: "Cliente Detalhe" },
        user: { id: operator.id, name: "Operador Detalhe" },
        canceledByUser: null,
        bottleMonth: 6,
        bottleYear: 2025,
        bottleNotes: "Atual",
      },
      previousBottle: { month: 4, year: 2024, notes: "Anterior" },
      items: [
        expect.objectContaining({
          saleId: secondSale.id,
          productId: product.id,
          productNameSnapshot: "Galao Detalhe",
          quantity: 2,
          unitPriceCents: 1950,
          totalPriceCents: 3900,
        }),
      ],
    });
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

  it("rejects a sale without enough stock and rolls back the transaction", async () => {
    const [user] = await db
      .insert(users)
      .values({
        name: "Operador Estoque",
        email: "operador-estoque@planetaagua.local",
        passwordHash: "hash",
        role: "OPERATOR",
      })
      .returning();
    const [product] = await db
      .insert(products)
      .values({
        name: "Galao Sem Estoque",
        salePriceCents: 1800,
        stockQuantity: 1,
        minimumStock: 1,
      })
      .returning();

    const insufficientStockRejection = repository.createSale({
      customerId: null,
      userId: user.id,
      paymentMethod: "PIX",
      items: [{ productId: product.id, quantity: 2 }],
      bottle: null,
    });

    await expect(insufficientStockRejection).rejects.toBeInstanceOf(SalesRepositoryError);
    await expect(insufficientStockRejection).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });

    const salesCount = await db.query.sales.findMany();
    const itemsCount = await db.query.saleItems.findMany();
    const movementsCount = await db.query.stockMovements.findMany();
    const persistedProduct = await db.query.products.findFirst({
      where: (currentProduct, { eq }) => eq(currentProduct.id, product.id),
    });

    expect(salesCount).toHaveLength(0);
    expect(itemsCount).toHaveLength(0);
    expect(movementsCount).toHaveLength(0);
    expect(persistedProduct?.stockQuantity).toBe(1);
  });

  it("rejects a sale with an inactive product and rolls back the transaction", async () => {
    const [user] = await db
      .insert(users)
      .values({
        name: "Operador Inativo",
        email: "operador-inativo@planetaagua.local",
        passwordHash: "hash",
        role: "OPERATOR",
      })
      .returning();
    const [product] = await db
      .insert(products)
      .values({
        name: "Galao Inativo",
        salePriceCents: 1800,
        stockQuantity: 5,
        minimumStock: 1,
        isActive: false,
      })
      .returning();

    const inactiveProductRejection = repository.createSale({
      customerId: null,
      userId: user.id,
      paymentMethod: "PIX",
      items: [{ productId: product.id, quantity: 1 }],
      bottle: null,
    });

    await expect(inactiveProductRejection).rejects.toBeInstanceOf(SalesRepositoryError);
    await expect(inactiveProductRejection).rejects.toMatchObject({ code: "PRODUCT_INACTIVE" });

    const salesCount = await db.query.sales.findMany();
    const itemsCount = await db.query.saleItems.findMany();
    const movementsCount = await db.query.stockMovements.findMany();
    const persistedProduct = await db.query.products.findFirst({
      where: (currentProduct, { eq }) => eq(currentProduct.id, product.id),
    });

    expect(salesCount).toHaveLength(0);
    expect(itemsCount).toHaveLength(0);
    expect(movementsCount).toHaveLength(0);
    expect(persistedProduct?.stockQuantity).toBe(5);
  });

  it("prevents canceling a sale that is already canceled", async () => {
    const [user] = await db
      .insert(users)
      .values({
        name: "Administrador Duplicado",
        email: "admin-duplicado@planetaagua.local",
        passwordHash: "hash",
        role: "ADMIN",
      })
      .returning();
    const [product] = await db
      .insert(products)
      .values({
        name: "Galao Cancelamento",
        salePriceCents: 1500,
        stockQuantity: 5,
        minimumStock: 1,
      })
      .returning();

    const createdSale = await repository.createSale({
      customerId: null,
      userId: user.id,
      paymentMethod: "CASH",
      items: [{ productId: product.id, quantity: 2 }],
      bottle: null,
    });

    await repository.cancelSale({
      saleId: createdSale.id,
      userId: user.id,
      reason: "Cliente desistiu.",
    });

    const duplicateCancelRejection = repository.cancelSale({
      saleId: createdSale.id,
      userId: user.id,
      reason: "Segunda tentativa.",
    });

    await expect(duplicateCancelRejection).rejects.toBeInstanceOf(SalesRepositoryError);
    await expect(duplicateCancelRejection).rejects.toMatchObject({ code: "SALE_ALREADY_CANCELED" });

    const canceledSale = await db.query.sales.findFirst({
      where: (sale, { eq }) => eq(sale.id, createdSale.id),
    });
    const productAfterSecondCancel = await db.query.products.findFirst({
      where: (currentProduct, { eq }) => eq(currentProduct.id, product.id),
    });
    const saleMovements = await db.query.stockMovements.findMany({
      where: (movement, { eq }) => eq(movement.referenceId, createdSale.id),
    });
    const canceledSaleMovements = saleMovements.filter((movement) => movement.type === "CANCELED_SALE");

    expect(canceledSale?.status).toBe("CANCELED");
    expect(canceledSale?.cancellationReason).toBe("Cliente desistiu.");
    expect(productAfterSecondCancel?.stockQuantity).toBe(5);
    expect(canceledSaleMovements).toHaveLength(1);
    expect(canceledSaleMovements[0]).toMatchObject({ reason: "Cliente desistiu." });
  });
});
