import { Injectable } from "@nestjs/common";
import { asc, desc, eq, sql } from "drizzle-orm";

import { db } from "../../db";
import { products, stockMovements } from "../../db/schema";
import type { StockAdjustmentInput, StockEntryInput } from "./stock.schemas";

export type StockProductRow = typeof products.$inferSelect;
export type StockMovementRow = typeof stockMovements.$inferSelect & {
  product: { id: string; name: string };
  user: { id: string; name: string };
};
export type StockMutationRow = { product: StockProductRow; movement: StockMovementRow };

@Injectable()
export class StockRepository {
  findStockProducts() {
    return db.query.products.findMany({
      orderBy: [asc(products.name)],
    });
  }

  findRecentMovements(limit = 20) {
    return db.query.stockMovements.findMany({
      orderBy: [desc(stockMovements.createdAt)],
      limit,
      with: {
        product: { columns: { id: true, name: true } },
        user: { columns: { id: true, name: true } },
      },
    });
  }

  async createEntry(input: StockEntryInput, userId: string): Promise<StockMutationRow | null> {
    return db.transaction(async (tx) => {
      const [updatedProduct] = await tx
        .update(products)
        .set({ stockQuantity: sql`${products.stockQuantity} + ${input.quantity}`, updatedAt: new Date() })
        .where(eq(products.id, input.productId))
        .returning();

      if (!updatedProduct) {
        return null;
      }

      const [movement] = await tx
        .insert(stockMovements)
        .values({
          productId: input.productId,
          userId,
          type: "IN",
          quantity: input.quantity,
          reason: input.reason,
          referenceId: null,
        })
        .returning();

      return {
        product: updatedProduct,
        movement: { ...movement, product: { id: updatedProduct.id, name: updatedProduct.name }, user: { id: userId, name: "" } },
      };
    });
  }

  async createAdjustment(input: StockAdjustmentInput, userId: string): Promise<StockMutationRow | null> {
    return db.transaction(async (tx) => {
      const [product] = await tx.select().from(products).where(eq(products.id, input.productId)).for("update");

      if (!product) {
        return null;
      }

      const delta = input.newQuantity - product.stockQuantity;
      const [updatedProduct] = await tx
        .update(products)
        .set({ stockQuantity: input.newQuantity, updatedAt: new Date() })
        .where(eq(products.id, input.productId))
        .returning();

      const [movement] = await tx
        .insert(stockMovements)
        .values({
          productId: input.productId,
          userId,
          type: "ADJUSTMENT",
          quantity: delta,
          reason: input.reason,
          referenceId: null,
        })
        .returning();

      return {
        product: updatedProduct,
        movement: { ...movement, product: { id: updatedProduct.id, name: updatedProduct.name }, user: { id: userId, name: "" } },
      };
    });
  }

  findMovementById(id: string) {
    return db.query.stockMovements.findFirst({
      where: eq(stockMovements.id, id),
      with: {
        product: { columns: { id: true, name: true } },
        user: { columns: { id: true, name: true } },
      },
    });
  }
}
