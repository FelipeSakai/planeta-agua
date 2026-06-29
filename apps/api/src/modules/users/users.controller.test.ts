import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { SESSION_COOKIE_NAME } from "../auth/session";
import { UsersController } from "./users.controller";

const adminUser = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Admin",
  email: "admin@planetaagua.local",
  role: "ADMIN" as const,
};

const operatorUser = { ...adminUser, role: "OPERATOR" as const };

function createController(currentUser: typeof adminUser | typeof operatorUser = adminUser) {
  const authService = { getUserByToken: vi.fn(async () => currentUser) };
  const usersService = {
    listOperators: vi.fn(async () => ({ users: [] })),
    createOperator: vi.fn(async () => ({ id: "1" })),
    updateOperator: vi.fn(async () => ({ id: "1" })),
    toggleActive: vi.fn(async () => ({ id: "1" })),
    resetPassword: vi.fn(async () => ({ id: "1" })),
  };

  return {
    controller: new UsersController(authService as never, usersService as never),
    usersService,
    request: { cookies: { [SESSION_COOKIE_NAME]: "token" } } as never,
  };
}

describe("UsersController", () => {
  it("allows admins to list operators", async () => {
    const { controller, request, usersService } = createController();

    await controller.list(request);

    expect(usersService.listOperators).toHaveBeenCalledOnce();
  });

  it("rejects operators", async () => {
    const { controller, request } = createController(operatorUser);

    await expect(controller.list(request)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("creates operators for admins", async () => {
    const { controller, request, usersService } = createController();

    await controller.create(request, { name: "Operador", email: "op@planetaagua.local", password: "senha123" });

    expect(usersService.createOperator).toHaveBeenCalledWith({ name: "Operador", email: "op@planetaagua.local", password: "senha123" });
  });

  it("resets passwords for admins", async () => {
    const { controller, request, usersService } = createController();

    await controller.resetPassword(request, "11111111-1111-4111-8111-111111111111", { password: "senha123" });

    expect(usersService.resetPassword).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111", { password: "senha123" });
  });
});
