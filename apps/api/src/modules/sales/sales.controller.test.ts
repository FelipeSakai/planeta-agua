import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import type { SessionUser } from "shared";
import { describe, expect, it, vi } from "vitest";

import { SESSION_COOKIE_NAME } from "../auth/session";
import { SalesController } from "./sales.controller";

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
  const salesService = {
    listSales: vi.fn(),
    getSaleDetail: vi.fn(),
    createSale: vi.fn(),
    cancelSale: vi.fn(),
    searchCustomers: vi.fn(),
    createQuickCustomer: vi.fn(),
  };

  return {
    controller: new SalesController(authService as never, salesService as never),
    authService,
    salesService,
  };
}

describe("SalesController", () => {
  it("creates a sale with the authenticated user", async () => {
    const { controller, salesService } = createController();
    const body = {
      customerId: null,
      paymentMethod: "PIX" as const,
      items: [{ productId: "22222222-2222-4222-8222-222222222222", quantity: 2 }],
      bottle: null,
    };
    const sale = { id: "33333333-3333-4333-8333-333333333333", status: "COMPLETED" as const };
    salesService.createSale.mockResolvedValueOnce(sale);

    await expect(controller.create(request as never, body)).resolves.toEqual(sale);
    expect(salesService.createSale).toHaveBeenCalledWith(
      expect.objectContaining({ id: "11111111-1111-4111-8111-111111111111", role: "OPERATOR" }),
      body,
    );
  });

  it("cancels a sale with the authenticated user", async () => {
    const { controller, authService, salesService } = createController();
    const admin = {
      id: "44444444-4444-4444-8444-444444444444",
      name: "Admin",
      email: "admin@planetaagua.local",
      role: "ADMIN" as const,
    };
    const sale = { id: "55555555-5555-4555-8555-555555555555", status: "CANCELED" as const };
    authService.getUserByToken.mockResolvedValueOnce(admin);
    salesService.cancelSale.mockResolvedValueOnce(sale);

    await expect(
      controller.cancel(
        "55555555-5555-4555-8555-555555555555",
        request as never,
        { reason: "Cliente desistiu." },
      ),
    ).resolves.toEqual(sale);

    expect(salesService.cancelSale).toHaveBeenCalledWith(admin, "55555555-5555-4555-8555-555555555555", "Cliente desistiu.");
  });

  it("creates a quick customer for authenticated sales flow", async () => {
    const { controller, salesService } = createController();
    const customer = { id: "66666666-6666-4666-8666-666666666666", name: "Maria", phone: "11999999999" };
    salesService.createQuickCustomer.mockResolvedValueOnce(customer);

    await expect(controller.createCustomer(request as never, { name: "Maria", phone: "11999999999" })).resolves.toEqual(customer);
    expect(salesService.createQuickCustomer).toHaveBeenCalledWith({ name: "Maria", phone: "11999999999" });
  });

  it("returns controlled 400 errors for invalid payloads and ids", async () => {
    const { controller } = createController();

    await expect(controller.create(request as never, { items: [] })).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.cancel("not-a-uuid", request as never, { reason: "Cliente desistiu." })).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.createCustomer(request as never, { name: "A" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("fails when the request has no valid session", async () => {
    const { controller } = createController();

    await expect(controller.list({ cookies: {} } as never)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
