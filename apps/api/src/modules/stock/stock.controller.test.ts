import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { StockController } from "./stock.controller";

const user = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "Administrador",
  email: "admin@planetaagua.local",
  role: "ADMIN" as const,
};

function makeRequest() {
  return { cookies: { planeta_agua_session: "valid" } };
}

describe("StockController", () => {
  it("lists stock for authenticated users", async () => {
    const authService = { getUserByToken: vi.fn(async () => user) };
    const stockService = {
      getStockPage: vi.fn(async () => ({
        products: [],
        movements: [],
        summary: { totalProducts: 0, lowStockProducts: 0, totalUnits: 0 },
      })),
    };
    const controller = new StockController(authService as never, stockService as never);

    await controller.list(makeRequest() as never);

    expect(stockService.getStockPage).toHaveBeenCalledOnce();
  });

  it("creates entries with the authenticated user", async () => {
    const authService = { getUserByToken: vi.fn(async () => user) };
    const stockService = { createEntry: vi.fn(async () => ({ product: {}, movement: {} })) };
    const controller = new StockController(authService as never, stockService as never);

    await controller.createEntry(makeRequest() as never, {
      productId: "11111111-1111-4111-8111-111111111111",
      quantity: 5,
      reason: "Compra semanal",
    });

    expect(stockService.createEntry).toHaveBeenCalledWith(user, {
      productId: "11111111-1111-4111-8111-111111111111",
      quantity: 5,
      reason: "Compra semanal",
    });
  });

  it("rejects invalid entry payload", async () => {
    const authService = { getUserByToken: vi.fn(async () => user) };
    const stockService = { createEntry: vi.fn() };
    const controller = new StockController(authService as never, stockService as never);

    await expect(
      controller.createEntry(makeRequest() as never, { productId: "invalid", quantity: 0, reason: "" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects invalid adjustment payload", async () => {
    const authService = { getUserByToken: vi.fn(async () => user) };
    const stockService = { createAdjustment: vi.fn() };
    const controller = new StockController(authService as never, stockService as never);

    await expect(
      controller.createAdjustment(makeRequest() as never, { productId: "invalid", newQuantity: -1, reason: "" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
