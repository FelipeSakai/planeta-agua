import { Injectable } from "@nestjs/common";
import { and, asc, desc, eq, ilike, inArray, isNotNull, lt, or, sql } from "drizzle-orm";

import { db } from "../../db";
import { customers, products, saleItems, sales, stockMovements } from "../../db/schema";
import { SalesRepositoryError } from "./sales.errors";
import type { CreateSaleRepositoryInput, SaleStatus } from "./sales.types";

const completedSaleStatus: SaleStatus = "COMPLETED";
const canceledSaleStatus: SaleStatus = "CANCELED";

@Injectable()
export class SalesRepository {
  async searchCustomers(query: string) {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return db.query.customers.findMany({
        orderBy: [asc(customers.name)],
        limit: 10,
      });
    }

    return db.query.customers.findMany({
      where: or(ilike(customers.name, `%${normalizedQuery}%`), ilike(customers.phone, `%${normalizedQuery}%`)),
      orderBy: [asc(customers.name)],
      limit: 10,
    });
  }

  async createQuickCustomer(input: { name: string; phone?: string | null }) {
    const [customer] = await db.insert(customers).values(input).returning();

    return customer;
  }

  async getLatestBottleForCustomer(customerId: string) {
    const latestBottleSale = await db.query.sales.findFirst({
      where: and(
        eq(sales.customerId, customerId),
        eq(sales.status, completedSaleStatus),
        isNotNull(sales.bottleMonth),
        isNotNull(sales.bottleYear),
      ),
      orderBy: [desc(sales.createdAt)],
    });

    if (!latestBottleSale?.bottleMonth || !latestBottleSale.bottleYear) {
      return null;
    }

    return {
      month: latestBottleSale.bottleMonth,
      year: latestBottleSale.bottleYear,
      notes: latestBottleSale.bottleNotes,
    };
  }

  async createSale(input: CreateSaleRepositoryInput) {
    return db.transaction(async (tx) => {
      const quantityByProductId = new Map<string, number>();

      for (const item of input.items) {
        quantityByProductId.set(item.productId, (quantityByProductId.get(item.productId) ?? 0) + item.quantity);
      }

      const productIds = [...quantityByProductId.keys()];
      const lockedProducts = await tx.select().from(products).where(inArray(products.id, productIds)).for("update");
      const productById = new Map(lockedProducts.map((product) => [product.id, product]));

      let totalAmountCents = 0;

      for (const item of input.items) {
        const product = productById.get(item.productId);

        if (!product) {
          throw new SalesRepositoryError("PRODUCT_NOT_FOUND", `Produto ${item.productId} nao encontrado.`);
        }

        if (!product.isActive) {
          throw new SalesRepositoryError("PRODUCT_INACTIVE", `Produto ${product.name} esta inativo.`);
        }

        const requestedQuantity = quantityByProductId.get(item.productId) ?? item.quantity;

        if (product.stockQuantity < requestedQuantity) {
          throw new SalesRepositoryError("INSUFFICIENT_STOCK", `Estoque insuficiente para ${product.name}.`);
        }

        totalAmountCents += product.salePriceCents * item.quantity;
      }

      const [sale] = await tx
        .insert(sales)
        .values({
          customerId: input.customerId,
          userId: input.userId,
          totalAmountCents,
          paymentMethod: input.paymentMethod,
          status: completedSaleStatus,
          bottleMonth: input.bottle?.month ?? null,
          bottleYear: input.bottle?.year ?? null,
          bottleNotes: input.bottle?.notes ?? null,
        })
        .returning();

      await tx.insert(saleItems).values(
        input.items.map((item) => {
          const product = productById.get(item.productId);

          if (!product) {
            throw new SalesRepositoryError("PRODUCT_NOT_FOUND", `Produto ${item.productId} nao encontrado.`);
          }

          return {
            saleId: sale.id,
            productId: product.id,
            productNameSnapshot: product.name,
            quantity: item.quantity,
            unitPriceCents: product.salePriceCents,
            totalPriceCents: product.salePriceCents * item.quantity,
          };
        }),
      );

      for (const [productId, quantity] of quantityByProductId) {
        await tx
          .update(products)
          .set({ stockQuantity: sql`${products.stockQuantity} - ${quantity}`, updatedAt: new Date() })
          .where(eq(products.id, productId));

        await tx.insert(stockMovements).values({
          productId,
          userId: input.userId,
          type: "SALE",
          quantity: -quantity,
          reason: null,
          referenceId: sale.id,
        });
      }

      return sale;
    });
  }

  listSales() {
    return db.query.sales.findMany({
      orderBy: [desc(sales.createdAt)],
      with: {
        customer: { columns: { id: true, name: true } },
        user: { columns: { id: true, name: true } },
        canceledByUser: { columns: { id: true, name: true } },
      },
    });
  }

  async getSaleDetail(id: string) {
    const sale = await db.query.sales.findFirst({
      where: eq(sales.id, id),
      with: {
        customer: { columns: { id: true, name: true } },
        user: { columns: { id: true, name: true } },
        canceledByUser: { columns: { id: true, name: true } },
        items: { orderBy: [asc(saleItems.createdAt)] },
      },
    });

    if (!sale) {
      return null;
    }

    const previousBottle = sale.customerId
      ? await db.query.sales.findFirst({
          where: and(
            eq(sales.customerId, sale.customerId),
            eq(sales.status, completedSaleStatus),
            isNotNull(sales.bottleMonth),
            isNotNull(sales.bottleYear),
            lt(sales.createdAt, sale.createdAt),
          ),
          orderBy: [desc(sales.createdAt)],
        })
      : null;

    return {
      sale,
      items: sale.items,
      previousBottle:
        previousBottle?.bottleMonth && previousBottle.bottleYear
          ? {
              month: previousBottle.bottleMonth,
              year: previousBottle.bottleYear,
              notes: previousBottle.bottleNotes,
            }
          : null,
    };
  }

  async cancelSale(input: { saleId: string; userId: string; reason: string }) {
    return db.transaction(async (tx) => {
      const [sale] = await tx.select().from(sales).where(eq(sales.id, input.saleId)).for("update");

      if (!sale) {
        throw new SalesRepositoryError("SALE_NOT_FOUND", `Venda ${input.saleId} nao encontrada.`);
      }

      if (sale.status === canceledSaleStatus) {
        throw new SalesRepositoryError("SALE_ALREADY_CANCELED", `Venda ${input.saleId} ja cancelada.`);
      }

      const items = await tx.select().from(saleItems).where(eq(saleItems.saleId, sale.id));
      const quantityByProductId = new Map<string, number>();

      for (const item of items) {
        quantityByProductId.set(item.productId, (quantityByProductId.get(item.productId) ?? 0) + item.quantity);
      }

      const productIds = [...quantityByProductId.keys()];

      if (productIds.length > 0) {
        await tx.select().from(products).where(inArray(products.id, productIds)).for("update");
      }

      for (const [productId, quantity] of quantityByProductId) {
        await tx
          .update(products)
          .set({ stockQuantity: sql`${products.stockQuantity} + ${quantity}`, updatedAt: new Date() })
          .where(eq(products.id, productId));

        await tx.insert(stockMovements).values({
          productId,
          userId: input.userId,
          type: "CANCELED_SALE",
          quantity,
          reason: input.reason,
          referenceId: sale.id,
        });
      }

      const [canceledSale] = await tx
        .update(sales)
        .set({
          status: canceledSaleStatus,
          canceledAt: new Date(),
          canceledByUserId: input.userId,
          cancellationReason: input.reason,
          updatedAt: new Date(),
        })
        .where(eq(sales.id, sale.id))
        .returning();

      return canceledSale;
    });
  }
}
