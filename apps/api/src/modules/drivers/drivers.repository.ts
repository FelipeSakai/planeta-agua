import { Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";

import { db } from "../../db";
import { drivers } from "../../db/schema";
import type { CreateDriverInput, UpdateDriverInput } from "shared";

@Injectable()
export class DriversRepository {
  findMany() {
    return db.query.drivers.findMany({
      orderBy: [asc(drivers.name)],
    });
  }

  findById(id: string) {
    return db.query.drivers.findFirst({
      where: eq(drivers.id, id),
    });
  }

  async create(input: CreateDriverInput) {
    const [driver] = await db.insert(drivers).values(input).returning();
    return driver;
  }

  async update(id: string, input: UpdateDriverInput) {
    const [driver] = await db
      .update(drivers)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(drivers.id, id))
      .returning();
    return driver;
  }

  async setActive(id: string, isActive: boolean) {
    const [driver] = await db
      .update(drivers)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(drivers.id, id))
      .returning();
    return driver;
  }
}
