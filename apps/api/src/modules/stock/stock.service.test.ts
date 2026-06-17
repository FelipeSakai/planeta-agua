import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { StockService } from "./stock.service";

const now = new Date("2026-06-17T00:00:00.000Z");
const adminUser = { id: "33333333-3333-4333-8333-333333333333", role: "ADMIN" as const };
const operatorUser = { id: "44444444-4444-4444-8444-444444444444", role: "OPERATOR" as const };

function makeProduct(overrides = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Galao 20L",
    stockQuantity: 2,
    minimumStock: 3,
    isActive: true,
    ...overrides,
  };
}

function makeMovement(overrides = {}) {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    productId: "11111111-1111-4111-8111-111111111111",
    userId: adminUser.id,
    type: "IN" as const,
    quantity: 5,
    reason: "Compra semanal",
    createdAt: now,
    product: { id: "11111111-1111-4111-8111-111111111111", name: "Galao 20L" },
    user: { id: adminUser.id, name: "Administrador" },
    ...overrides,
  };
}

class FakeStockRepository {
  products = [makeProduct()];
  movements = [makeMovement()];
  lastMovement = makeMovement();
  findStockProducts = vi.fn(async () => this.products);
  findRecentMovements = vi.fn(async () => this.movements);
  findMovementById = vi.fn(async () => this.lastMovement);
  createEntry = vi.fn(async () => {
    this.lastMovement = makeMovement();
    return { product: makeProduct({ stockQuantity: 7 }), movement: this.lastMovement };
  });
  createAdjustment = vi.fn(async () => {
    this.lastMovement = makeMovement({ type: "ADJUSTMENT" as const, quantity: 8 });
    return { product: makeProduct({ stockQuantity: 10 }), movement: this.lastMovement };
  });
}

describe("StockService", () => {
  it("lists products, low-stock summary, total units and movements", async () => {
    const service = new StockService(new FakeStockRepository() as never);

    const result = await service.getStockPage();

    expect(result.summary).toEqual({ totalProducts: 1, lowStockProducts: 1, totalUnits: 2 });
    expect(result.products[0]?.isLowStock).toBe(true);
    expect(result.movements[0]?.createdAt).toBe("2026-06-17T00:00:00.000Z");
  });

  it("allows admins to create stock entries", async () => {
    const repository = new FakeStockRepository();
    const service = new StockService(repository as never);

    const result = await service.createEntry(adminUser, {
      productId: "11111111-1111-4111-8111-111111111111",
      quantity: 5,
      reason: "Compra semanal",
    });

    expect(repository.createEntry).toHaveBeenCalledWith(
      {
        productId: "11111111-1111-4111-8111-111111111111",
        quantity: 5,
        reason: "Compra semanal",
      },
      adminUser.id,
    );
    expect(repository.findMovementById).toHaveBeenCalledWith(result.movement.id);
    expect(result.movement.userName).toBe("Administrador");
  });

  it("blocks operators from creating stock entries", async () => {
    const service = new StockService(new FakeStockRepository() as never);

    await expect(
      service.createEntry(operatorUser, {
        productId: "11111111-1111-4111-8111-111111111111",
        quantity: 5,
        reason: "Compra semanal",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows admins to create absolute stock adjustments", async () => {
    const repository = new FakeStockRepository();
    const service = new StockService(repository as never);

    const result = await service.createAdjustment(adminUser, {
      productId: "11111111-1111-4111-8111-111111111111",
      newQuantity: 10,
      reason: "Conferencia fisica",
    });

    expect(repository.createAdjustment).toHaveBeenCalledWith(
      {
        productId: "11111111-1111-4111-8111-111111111111",
        newQuantity: 10,
        reason: "Conferencia fisica",
      },
      adminUser.id,
    );
    expect(result.movement.type).toBe("ADJUSTMENT");
  });

  it("throws not found when repository cannot find product for entry", async () => {
    const repository = new FakeStockRepository();
    repository.createEntry.mockResolvedValueOnce(null as never);
    const service = new StockService(repository as never);

    await expect(
      service.createEntry(adminUser, {
        productId: "11111111-1111-4111-8111-111111111111",
        quantity: 5,
        reason: "Compra semanal",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
