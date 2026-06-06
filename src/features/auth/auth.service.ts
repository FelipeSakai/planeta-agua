import { hashPassword, verifyPassword } from "@/lib/password";
import { createSessionExpiry, createSessionToken, hashSessionToken } from "@/lib/session";

import {
  createSession,
  deleteSessionByTokenHash,
  findActiveUserByEmail,
  findUserById,
  findValidSessionByTokenHash,
  upsertAdminUser,
} from "./auth.repository";
import type { AdminSeedInput, LoginInput } from "./auth.schemas";

const dummyPasswordHash = "$2b$12$.Wd6vhY4uuFIpd/R2QtY5uCstAEfsjvRlEphPcPH/7x.7MRPQFd6K";

export class InvalidCredentialsError extends Error {
  constructor() {
    super("E-mail ou senha invalidos.");
    this.name = "InvalidCredentialsError";
  }
}

export async function login(input: LoginInput) {
  const user = await findActiveUserByEmail(input.email);

  if (!user) {
    await verifyPassword(input.password, dummyPasswordHash);
    throw new InvalidCredentialsError();
  }

  const passwordIsValid = await verifyPassword(input.password, user.passwordHash);

  if (!passwordIsValid) {
    throw new InvalidCredentialsError();
  }

  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = createSessionExpiry();

  await createSession({ userId: user.id, tokenHash, expiresAt });

  return { token, expiresAt };
}

export async function logout(token: string) {
  await deleteSessionByTokenHash(hashSessionToken(token));
}

export async function getUserBySessionToken(token: string) {
  const session = await findValidSessionByTokenHash(hashSessionToken(token));

  if (!session) {
    return null;
  }

  return findUserById(session.userId);
}

export async function seedAdmin(input: AdminSeedInput) {
  const passwordHash = await hashPassword(input.password);
  return upsertAdminUser({ name: input.name, email: input.email, passwordHash });
}
