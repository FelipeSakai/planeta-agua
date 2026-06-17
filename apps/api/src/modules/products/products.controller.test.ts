import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { ProductsController } from "./products.controller";

const request = { cookies: { planeta_agua_session: "token" } };

function createController() {
  const authService = {
    getUserByToken: vi.fn(async () => ({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Admin",
      email: "admin@planetaagua.local",
      role: "ADMIN" as const,
    })),
  };
  const productsService = {
    listProducts: vi.fn(),
    getProduct: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    activateProduct: vi.fn(),
    deactivateProduct: vi.fn(),
  };

  return {
    controller: new ProductsController(authService as never, productsService as never),
    productsService,
  };
}

describe("ProductsController", () => {
  it("returns a controlled 400 for invalid create payloads", async () => {
    const { controller } = createController();

    await expect(controller.create(request as never, { name: "" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns a controlled 400 for invalid update payloads", async () => {
    const { controller } = createController();

    await expect(controller.update(request as never, "11111111-1111-4111-8111-111111111111", { stockQuantity: 99 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns a controlled 400 for invalid ids", async () => {
    const { controller } = createController();

    await expect(controller.getById(request as never, "not-a-uuid")).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.activate(request as never, "not-a-uuid")).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.deactivate(request as never, "not-a-uuid")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("routes activate and deactivate to the intended service methods", async () => {
    const { controller, productsService } = createController();
    const id = "11111111-1111-4111-8111-111111111111";

    await controller.activate(request as never, id);
    await controller.deactivate(request as never, id);

    expect(productsService.activateProduct).toHaveBeenCalledWith(id, expect.objectContaining({ role: "ADMIN" }));
    expect(productsService.deactivateProduct).toHaveBeenCalledWith(id, expect.objectContaining({ role: "ADMIN" }));
  });
});
