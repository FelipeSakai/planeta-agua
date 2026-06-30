import { Injectable } from "@nestjs/common";
import { and, asc, desc, eq, ilike, ne, or } from "drizzle-orm";
import { calculateBottleExpiresAt } from "shared";

import { db } from "../../db";
import { customerBottles, customers, saleItems, sales } from "../../db/schema";
import { CustomersRepositoryError } from "./customers.errors";
import type { CreateCustomerInput, UpdateCustomerBottleInput, UpdateCustomerInput } from "shared";

@Injectable()
export class CustomersRepository {
  findMany(options: { search?: string; includeInactive?: boolean } = {}) {
    const conditions = [];

    if (!options.includeInactive) {
      conditions.push(eq(customers.isActive, true));
    }

    if (options.search) {
      const searchClause = or(
        ilike(customers.name, `%${options.search}%`),
        ilike(customers.phone, `%${options.search}%`),
        ilike(customers.mobilePhone, `%${options.search}%`),
      );
      if (searchClause) {
        conditions.push(searchClause);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return db.query.customers.findMany({
      where: whereClause,
      orderBy: [asc(customers.name)],
    });
  }

  findById(id: string) {
    return db.query.customers.findFirst({
      where: eq(customers.id, id),
    });
  }

  async create(input: CreateCustomerInput) {
    const [customer] = await db.insert(customers).values(input).returning();
    return customer;
  }

  async update(id: string, input: UpdateCustomerInput) {
    const [customer] = await db
      .update(customers)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();

    return customer;
  }

  async setActive(id: string, isActive: boolean) {
    const [customer] = await db
      .update(customers)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();

    return customer;
  }

  async findDuplicates(name: string, phone: string | null, mobilePhone: string | null, excludeId?: string) {
    const conditions = [];

    if (excludeId) {
      conditions.push(ne(customers.id, excludeId));
    }

    const nameOrPhone = or(
      ilike(customers.name, name),
      phone ? ilike(customers.phone, phone) : undefined,
      mobilePhone ? ilike(customers.mobilePhone, mobilePhone) : undefined,
    );

    if (nameOrPhone) {
      conditions.push(nameOrPhone);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return db.query.customers.findMany({
      where: whereClause,
      columns: { id: true, name: true, phone: true, mobilePhone: true },
      orderBy: [asc(customers.name)],
      limit: 10,
    });
  }

  findBottlesByCustomerId(customerId: string) {
    return db.query.customerBottles.findMany({
      where: and(
        eq(customerBottles.customerId, customerId),
        eq(customerBottles.isActive, true),
      ),
      orderBy: [desc(customerBottles.expiresAt)],
    });
  }

  findBottleById(id: string) {
    return db.query.customerBottles.findFirst({
      where: eq(customerBottles.id, id),
    });
  }

  async createBottle(input: { customerId: string; saleId?: string | null; month: number; year: number; notes?: string | null }) {
    const expiresAt = calculateBottleExpiresAt(input.month, input.year);

    const [bottle] = await db
      .insert(customerBottles)
      .values({
        customerId: input.customerId,
        saleId: input.saleId ?? null,
        month: input.month,
        year: input.year,
        notes: input.notes ?? null,
        expiresAt,
      })
      .returning();

    return bottle;
  }

  async updateBottle(id: string, input: UpdateCustomerBottleInput) {
    const bottle = await this.findBottleById(id);

    if (!bottle) {
      throw new CustomersRepositoryError("BOTTLE_NOT_FOUND", "Galao nao encontrado.");
    }

    const month = input.month ?? bottle.month;
    const year = input.year ?? bottle.year;
    const expiresAt = calculateBottleExpiresAt(month, year);

    const [updated] = await db
      .update(customerBottles)
      .set({
        ...input,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(customerBottles.id, id))
      .returning();

    return updated;
  }

  async deactivateBottle(id: string) {
    const [bottle] = await db
      .update(customerBottles)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(customerBottles.id, id))
      .returning();

    return bottle;
  }

  async findRecentSalesByCustomerId(customerId: string, limit = 20) {
    return db.query.sales.findMany({
      where: eq(sales.customerId, customerId),
      orderBy: [desc(sales.createdAt)],
      limit,
      with: {
        items: {
          orderBy: [asc(saleItems.createdAt)],
        },
      },
    });
  }
}
