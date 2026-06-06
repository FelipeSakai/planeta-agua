import { beforeEach, describe, expect, it, vi } from "vitest";

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
import { InvalidCredentialsError, getUserBySessionToken, login, logout, seedAdmin } from "./auth.service";

vi.mock("@/lib/password", () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  createSessionExpiry: vi.fn(),
  createSessionToken: vi.fn(),
  hashSessionToken: vi.fn(),
}));

vi.mock("./auth.repository", () => ({
  createSession: vi.fn(),
  deleteSessionByTokenHash: vi.fn(),
  findActiveUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  findValidSessionByTokenHash: vi.fn(),
  upsertAdminUser: vi.fn(),
}));

const mockedHashPassword = vi.mocked(hashPassword);
const mockedVerifyPassword = vi.mocked(verifyPassword);
const mockedCreateSessionExpiry = vi.mocked(createSessionExpiry);
const mockedCreateSessionToken = vi.mocked(createSessionToken);
const mockedHashSessionToken = vi.mocked(hashSessionToken);
const mockedCreateSession = vi.mocked(createSession);
const mockedDeleteSessionByTokenHash = vi.mocked(deleteSessionByTokenHash);
const mockedFindActiveUserByEmail = vi.mocked(findActiveUserByEmail);
const mockedFindUserById = vi.mocked(findUserById);
const mockedFindValidSessionByTokenHash = vi.mocked(findValidSessionByTokenHash);
const mockedUpsertAdminUser = vi.mocked(upsertAdminUser);

const dummyPasswordHash = "$2b$12$.Wd6vhY4uuFIpd/R2QtY5uCstAEfsjvRlEphPcPH/7x.7MRPQFd6K";

describe("auth service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a session for valid credentials", async () => {
    const expiresAt = new Date("2026-06-06T12:00:00.000Z");
    mockedFindActiveUserByEmail.mockResolvedValue({
      id: "user-1",
      name: "Operador",
      email: "operador@planetaagua.local",
      passwordHash: "stored-hash",
      role: "OPERATOR",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockedVerifyPassword.mockResolvedValue(true);
    mockedCreateSessionToken.mockReturnValue("plain-token");
    mockedHashSessionToken.mockReturnValue("hashed-token");
    mockedCreateSessionExpiry.mockReturnValue(expiresAt);
    mockedCreateSession.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      tokenHash: "hashed-token",
      expiresAt,
      createdAt: new Date(),
    });

    await expect(
      login({ email: "operador@planetaagua.local", password: "senha" }),
    ).resolves.toEqual({ token: "plain-token", expiresAt });

    expect(mockedCreateSession).toHaveBeenCalledWith({
      userId: "user-1",
      tokenHash: "hashed-token",
      expiresAt,
    });
  });

  it("rejects invalid credentials with a safe message", async () => {
    mockedFindActiveUserByEmail.mockResolvedValue(null);
    mockedVerifyPassword.mockResolvedValue(false);

    await expect(login({ email: "inexistente@planetaagua.local", password: "senha" })).rejects.toThrow(
      new InvalidCredentialsError(),
    );

    expect(mockedVerifyPassword).toHaveBeenCalledWith("senha", dummyPasswordHash);
  });

  it("deletes a session by hashed token on logout", async () => {
    mockedHashSessionToken.mockReturnValue("hashed-token");
    mockedDeleteSessionByTokenHash.mockResolvedValue(undefined);

    await logout("plain-token");

    expect(mockedDeleteSessionByTokenHash).toHaveBeenCalledWith("hashed-token");
  });

  it("returns the active user for a valid session token", async () => {
    mockedHashSessionToken.mockReturnValue("hashed-token");
    mockedFindValidSessionByTokenHash.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      tokenHash: "hashed-token",
      expiresAt: new Date(),
      createdAt: new Date(),
    });
    mockedFindUserById.mockResolvedValue({
      id: "user-1",
      name: "Operador",
      email: "operador@planetaagua.local",
      passwordHash: "stored-hash",
      role: "OPERATOR",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(getUserBySessionToken("plain-token")).resolves.toMatchObject({ id: "user-1" });
  });

  it("returns null when the session token is invalid", async () => {
    mockedHashSessionToken.mockReturnValue("hashed-token");
    mockedFindValidSessionByTokenHash.mockResolvedValue(null);

    await expect(getUserBySessionToken("plain-token")).resolves.toBeNull();
    expect(mockedFindUserById).not.toHaveBeenCalled();
  });

  it("hashes the password before upserting the admin user", async () => {
    mockedHashPassword.mockResolvedValue("hashed-password");
    mockedUpsertAdminUser.mockResolvedValue({
      id: "admin-1",
      name: "Administrador",
      email: "admin@planetaagua.local",
      passwordHash: "hashed-password",
      role: "ADMIN",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await seedAdmin({
      name: "Administrador",
      email: "admin@planetaagua.local",
      password: "senha-admin",
    });

    expect(mockedUpsertAdminUser).toHaveBeenCalledWith({
      name: "Administrador",
      email: "admin@planetaagua.local",
      passwordHash: "hashed-password",
    });
  });
});
