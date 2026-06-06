import { and, eq, gt } from "drizzle-orm";

import { db } from "@/db";
import { sessions, users } from "@/db/schema";

type Database = typeof db;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type DatabaseClient = Database | Transaction;
type User = typeof users.$inferSelect;
type Session = typeof sessions.$inferSelect;

export async function findActiveUserByEmail(email: string, client: DatabaseClient = db): Promise<User | null> {
  const [user] = await client
    .select()
    .from(users)
    .where(and(eq(users.email, email), eq(users.isActive, true)))
    .limit(1);

  return user ?? null;
}

export async function findUserById(id: string, client: DatabaseClient = db): Promise<User | null> {
  const [user] = await client
    .select()
    .from(users)
    .where(and(eq(users.id, id), eq(users.isActive, true)))
    .limit(1);

  return user ?? null;
}

export async function upsertAdminUser(
  input: { name: string; email: string; passwordHash: string },
  client: DatabaseClient = db,
): Promise<User> {
  const [existingUser] = await client.select().from(users).where(eq(users.email, input.email)).limit(1);

  if (existingUser) {
    const [updatedUser] = await client
      .update(users)
      .set({
        name: input.name,
        passwordHash: input.passwordHash,
        role: "ADMIN",
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingUser.id))
      .returning();

    return updatedUser;
  }

  const [createdUser] = await client
    .insert(users)
    .values({
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      role: "ADMIN",
      isActive: true,
    })
    .returning();

  return createdUser;
}

export async function createSession(
  input: { userId: string; tokenHash: string; expiresAt: Date },
  client: DatabaseClient = db,
): Promise<Session> {
  const [session] = await client.insert(sessions).values(input).returning();
  return session;
}

export async function findValidSessionByTokenHash(
  tokenHash: string,
  client: DatabaseClient = db,
): Promise<Session | null> {
  const [session] = await client
    .select()
    .from(sessions)
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return session ?? null;
}

export async function deleteSessionByTokenHash(tokenHash: string, client: DatabaseClient = db) {
  await client.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}
