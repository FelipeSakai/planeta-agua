import { BadRequestException } from "@nestjs/common";
import type { SessionUser } from "shared";
import { describe, expect, it, vi } from "vitest";

import { SESSION_COOKIE_NAME } from "../auth/session";
import { CustomersController } from "./customers.controller";

const request = { cookies: { [SESSION_COOKIE_NAME]: "token" } };

function createController() {
  const defaultUser: SessionUser = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Operador",
    email: "operador@planetaagua.local",
    role: "OPERATOR",
  };
  const authService = {
    getUserByToken: vi.fn(async (): Promise<SessionUser> => defaultUser),
  };
  const customersService = {
    listCustomers: vi.fn(),
    getCustomerDetail: vi.fn(),
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    toggleActive: vi.fn(),
    checkDuplicates: vi.fn(),
    addBottle: vi.fn(),
    updateBottle: vi.fn(),
    deactivateBottle: vi.fn(),
  };

  return {
    controller: new CustomersController(authService as never, customersService as never),
    authService,
    customersService,
  };
}

describe("CustomersController", () => {
  it("returns a controlled 400 for invalid create payloads", async () => {
    const { controller } = createController();

    await expect(controller.create(request as never, { name: "" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns a controlled 400 for invalid ids", async () => {
    const { controller } = createController();

    await expect(controller.getById(request as never, "not-a-uuid")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("routes toggle to the intended service method", async () => {
    const { controller, customersService } = createController();
    const id = "11111111-1111-4111-8111-111111111111";

    await controller.toggle(request as never, id);

    expect(customersService.toggleActive).toHaveBeenCalledWith(id);
  });
});
