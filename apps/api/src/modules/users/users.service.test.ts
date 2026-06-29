import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { describe, expect, it, vi } from "vitest";

import { UsersService } from "./users.service";

const operator = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Operador",
  email: "op@planetaagua.local",
  passwordHash: "hash",
  role: "OPERATOR" as const,
  isActive: true,
  createdAt: new Date("2026-06-29T00:00:00.000Z"),
  updatedAt: new Date("2026-06-29T00:00:00.000Z"),
};

const admin = { ...operator, id: "22222222-2222-4222-8222-222222222222", role: "ADMIN" as const };

function createService(repositoryOverrides = {}) {
  const repository = {
    findOperators: vi.fn(async () => [operator]),
    findById: vi.fn(async () => operator),
    findByEmail: vi.fn(async () => null),
    createOperator: vi.fn(async (input) => ({ ...operator, ...input })),
    updateOperator: vi.fn(async (_id, input) => ({ ...operator, ...input })),
    setActive: vi.fn(async (_id, isActive) => ({ ...operator, isActive })),
    updatePassword: vi.fn(async () => operator),
    ...repositoryOverrides,
  };

  return { service: new UsersService(repository as never), repository };
}

describe("UsersService", () => {
  it("lists only operators without password hashes", async () => {
    const { service } = createService();

    const result = await service.listOperators();

    expect(result.users).toEqual([
      {
        id: operator.id,
        name: operator.name,
        email: operator.email,
        role: "OPERATOR",
        isActive: true,
        createdAt: "2026-06-29T00:00:00.000Z",
        updatedAt: "2026-06-29T00:00:00.000Z",
      },
    ]);
    expect(result.users[0]).not.toHaveProperty("passwordHash");
  });

  it("creates an operator with a hashed password", async () => {
    const { service, repository } = createService();

    await service.createOperator({ name: "Operador", email: "op@planetaagua.local", password: "senha123" });

    expect(repository.createOperator).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Operador", email: "op@planetaagua.local", role: "OPERATOR", isActive: true }),
    );
    const passwordHash = repository.createOperator.mock.calls[0][0].passwordHash;
    expect(passwordHash).not.toBe("senha123");
    await expect(bcrypt.compare("senha123", passwordHash)).resolves.toBe(true);
  });

  it("rejects duplicate e-mail", async () => {
    const { service } = createService({ findByEmail: vi.fn(async () => operator) });

    await expect(service.createOperator({ name: "Operador", email: operator.email, password: "senha123" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects actions against admin users", async () => {
    const { service } = createService({ findById: vi.fn(async () => admin) });

    await expect(service.updateOperator(admin.id, { name: "Admin", email: "admin@planetaagua.local" })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.toggleActive(admin.id)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.resetPassword(admin.id, { password: "senha123" })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("throws not found when operator does not exist", async () => {
    const { service } = createService({ findById: vi.fn(async () => null) });

    await expect(service.toggleActive(operator.id)).rejects.toBeInstanceOf(NotFoundException);
  });
});
