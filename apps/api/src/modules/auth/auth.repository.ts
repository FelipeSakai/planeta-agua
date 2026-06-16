import { Injectable } from "@nestjs/common";
import { and, eq, gt } from "drizzle-orm";

import { db } from "../../db";
import { sessions, users } from "../../db/schema";

@Injectable()
export class AuthRepository {
  findActiveUserByEmail(email: string) {
    return db.query.users.findFirst({
      where: and(eq(users.email, email), eq(users.isActive, true)),
    });
  }

  async createSession(input: { userId: string; tokenHash: string; expiresAt: Date }) {
    const [session] = await db.insert(sessions).values(input).returning();

    return session;
  }

  findUserBySessionHash(tokenHash: string, now = new Date()) {
    return db.query.sessions.findFirst({
      where: and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)),
      with: {
        user: true,
      },
    });
  }

  async deleteSessionByHash(tokenHash: string) {
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }
}
