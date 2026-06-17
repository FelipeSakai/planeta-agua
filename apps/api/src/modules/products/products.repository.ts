import { Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";

import { db } from "../../db";
import { products, stockMovements } from "../../db/schema";
import type { CreateProductInput, UpdateProductInput } from "./products.schemas";

@Injectable()
export class ProductsRepository {
  findMany() {
    return db.query.products.findMany({
      orderBy: [asc(products.name)],
    });
  }

  findById(id: string) {
    return db.query.products.findFirst({
      where: eq(products.id, id),
    });
  }

  async create(input: CreateProductInput, userId: string) {
    return db.transaction(async (tx) => {
      const [product] = await tx.insert(products).values(input).returning();

      if (input.stockQuantity > 0) {
        await tx.insert(stockMovements).values({
          productId: product.id,
          userId,
          type: "IN",
          quantity: input.stockQuantity,
          reason: "Estoque inicial do produto.",
          referenceId: product.id,
        });
      }

      return product;
    });
  }

  async update(id: string, input: UpdateProductInput) {
    const [product] = await db
      .update(products)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    return product;
  }

  async setActive(id: string, isActive: boolean) {
    const [product] = await db
      .update(products)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    return product;
  }
}
