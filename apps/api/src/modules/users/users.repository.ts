import { Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import type { UpdateOperatorUserInput } from "shared";

import { db } from "../../db";
import { users } from "../../db/schema";

export type CreateOperatorUserRowInput = {
  name: string;
  email: string;
  passwordHash: string;
  role: "OPERATOR";
  isActive: boolean;
};

@Injectable()
export class UsersRepository {
  findOperators() {
    return db.query.users.findMany({
      where: eq(users.role, "OPERATOR"),
      orderBy: [asc(users.name)],
    });
  }

  findById(id: string) {
    return db.query.users.findFirst({
      where: eq(users.id, id),
    });
  }

  findByEmail(email: string) {
    return db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  async createOperator(input: CreateOperatorUserRowInput) {
    const [user] = await db.insert(users).values(input).returning();
    return user;
  }

  async updateOperator(id: string, input: UpdateOperatorUserInput) {
    const [user] = await db
      .update(users)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async setActive(id: string, isActive: boolean) {
    const [user] = await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updatePassword(id: string, passwordHash: string) {
    const [user] = await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }
}
