import { Injectable } from "@nestjs/common";
import { and, asc, desc, eq, ilike, inArray, isNotNull, lt, or, sql } from "drizzle-orm";
import { calculateBottleExpiresAt } from "shared";

import { db } from "../../db";
import { customerBottles, customers, products, saleItems, sales, stockMovements } from "../../db/schema";
import { SalesRepositoryError } from "./sales.errors";
import type {
  ConfirmDeliveryRepositoryInput,
  CreateSaleRepositoryInput,
  ListSalesOptions,
  SaleStatus,
} from "./sales.types";

const completedSaleStatus: SaleStatus = "COMPLETED";
const canceledSaleStatus: SaleStatus = "CANCELED";
const pendingDeliveryStatus: SaleStatus = "PENDING_DELIVERY";

@Injectable()
export class SalesRepository {
  async searchCustomers(primaryQuery: string, secondaryQuery = "") {
    const normalizedPrimary = primaryQuery.trim();
    const normalizedSecondary = secondaryQuery.trim();

    if (!normalizedPrimary && !normalizedSecondary) {
      return db.query.customers.findMany({ orderBy: [asc(customers.name)], limit: 10 });
    }

    const primaryClause = or(ilike(customers.name, `%${normalizedPrimary}%`), ilike(customers.phone, `%${normalizedPrimary}%`));
    const secondaryClause = or(ilike(customers.code, `%${normalizedSecondary}%`), ilike(customers.address, `%${normalizedSecondary}%`));

    const whereClause = normalizedPrimary && normalizedSecondary
      ? and(primaryClause, secondaryClause)
      : normalizedPrimary
        ? primaryClause
        : secondaryClause;

    return db.query.customers.findMany({ where: whereClause, orderBy: [asc(customers.name)], limit: 10 });
  }

  async createQuickCustomer(input: { name: string; phone?: string | null; code?: string | null; address?: string | null }) {
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

        if (item.finalUnitPriceCents !== undefined && item.finalUnitPriceCents < 0) {
          throw new SalesRepositoryError("INVALID_ITEM_PRICE", `Preco invalido para ${product.name}.`);
        }

        if (item.discountCents !== undefined && item.discountCents < 0) {
          throw new SalesRepositoryError("INVALID_ITEM_PRICE", `Desconto invalido para ${product.name}.`);
        }

        const effectiveUnitPrice = item.finalUnitPriceCents ?? product.salePriceCents;
        const discount = item.discountCents ?? 0;
        const itemTotal = effectiveUnitPrice * item.quantity - discount;

        if (itemTotal < 0) {
          throw new SalesRepositoryError("INVALID_ITEM_PRICE", `Total do item ${product.name} ficou negativo.`);
        }

        totalAmountCents += itemTotal;
      }

      const saleStatus: SaleStatus = input.deliveryPending ? pendingDeliveryStatus : completedSaleStatus;

      const [sale] = await tx
        .insert(sales)
        .values({
          customerId: input.customerId,
          userId: input.userId,
          totalAmountCents,
          paymentMethod: input.paymentMethod,
          status: saleStatus,
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

          const effectiveUnitPrice = item.finalUnitPriceCents ?? product.salePriceCents;
          const discount = item.discountCents ?? 0;

          return {
            saleId: sale.id,
            productId: product.id,
            productNameSnapshot: product.name,
            quantity: item.quantity,
            unitPriceCents: product.salePriceCents,
            totalPriceCents: effectiveUnitPrice * item.quantity - discount,
            discountCents: discount,
            finalUnitPriceCents: item.finalUnitPriceCents ?? null,
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

      const completeBottleItems = input.items.filter((item) => {
        const product = productById.get(item.productId);
        return product?.bottleType === "COMPLETE";
      });

      if (completeBottleItems.length > 0 && input.customerId && input.bottle) {
        for (const item of completeBottleItems) {
          for (let i = 0; i < item.quantity; i++) {
            await tx.insert(customerBottles).values({
              customerId: input.customerId,
              saleId: sale.id,
              month: input.bottle.month,
              year: input.bottle.year,
              notes: input.bottle.notes ?? null,
              expiresAt: calculateBottleExpiresAt(input.bottle.month, input.bottle.year),
            });
          }
        }
      }

      return sale;
    });
  }

  listSales(options: ListSalesOptions = {}) {
    return db.query.sales.findMany({
      where: options.status ? eq(sales.status, options.status) : undefined,
      orderBy: [desc(sales.createdAt)],
      with: {
        customer: { columns: { id: true, name: true } },
        user: { columns: { id: true, name: true } },
        canceledByUser: { columns: { id: true, name: true } },
        deliveredByUser: { columns: { id: true, name: true } },
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
        deliveredByUser: { columns: { id: true, name: true } },
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

  async confirmDelivery(input: ConfirmDeliveryRepositoryInput) {
    return db.transaction(async (tx) => {
      const [sale] = await tx.select().from(sales).where(eq(sales.id, input.saleId)).for("update");

      if (!sale) {
        throw new SalesRepositoryError("SALE_NOT_FOUND", `Venda ${input.saleId} nao encontrada.`);
      }

      if (sale.status !== pendingDeliveryStatus) {
        throw new SalesRepositoryError("SALE_NOT_DELIVERABLE", `Venda ${input.saleId} nao esta pendente de entrega.`);
      }

      const [delivered] = await tx
        .update(sales)
        .set({ status: completedSaleStatus, deliveredAt: new Date(), deliveredByUserId: input.userId, updatedAt: new Date() })
        .where(eq(sales.id, sale.id))
        .returning();

      return delivered;
    });
  }
}
