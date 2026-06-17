import { beforeEach, describe, expect, it, vi } from "vitest";

const product = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Galao 20L",
  stockQuantity: 2,
  minimumStock: 3,
  isActive: true,
};

const movement = {
  id: "22222222-2222-4222-8222-222222222222",
  productId: product.id,
  userId: "33333333-3333-4333-8333-333333333333",
  type: "IN",
  quantity: 5,
  reason: "Compra semanal",
  referenceId: null,
  createdAt: new Date("2026-06-17T00:00:00.000Z"),
};

describe("StockRepository", () => {
  beforeEach(() => vi.resetModules());

  it("creates stock entry with an atomic increment in a transaction", async () => {
    const productReturning = vi.fn(async () => [{ ...product, stockQuantity: 7 }]);
    const movementReturning = vi.fn(async () => [movement]);
    const set = vi.fn(() => ({ where: vi.fn(() => ({ returning: productReturning })) }));
    const values = vi.fn(() => ({ returning: movementReturning }));
    const update = vi.fn(() => ({ set }));
    const insert = vi.fn(() => ({ values }));
    const transaction = vi.fn(async (callback) =>
      callback({
        update,
        insert,
        query: { products: { findFirst: vi.fn(async () => product) } },
      }),
    );

    vi.doMock("../../db", () => ({ db: { transaction } }));
    const { StockRepository } = await import("./stock.repository");

    const result = await new StockRepository().createEntry(
      { productId: product.id, quantity: 5, reason: "Compra semanal" },
      "33333333-3333-4333-8333-333333333333",
    );

    expect(transaction).toHaveBeenCalledOnce();
    expect(set).toHaveBeenCalledWith({ stockQuantity: expect.anything(), updatedAt: expect.any(Date) });
    const [setPayload] = set.mock.calls[0] as unknown as [{ stockQuantity: unknown; updatedAt: Date }];
    expect(setPayload.stockQuantity).not.toBe(7);
    expect(typeof setPayload.stockQuantity).not.toBe("number");
    expect(values).toHaveBeenCalledWith({
      productId: product.id,
      userId: "33333333-3333-4333-8333-333333333333",
      type: "IN",
      quantity: 5,
      reason: "Compra semanal",
      referenceId: null,
    });
    expect(result?.product.stockQuantity).toBe(7);
  });

  it("returns null for stock entry when product does not exist", async () => {
    const productReturning = vi.fn(async () => []);
    const set = vi.fn(() => ({ where: vi.fn(() => ({ returning: productReturning })) }));
    const update = vi.fn(() => ({ set }));
    const insert = vi.fn();
    const transaction = vi.fn(async (callback) =>
      callback({
        update,
        insert,
      }),
    );

    vi.doMock("../../db", () => ({ db: { transaction } }));
    const { StockRepository } = await import("./stock.repository");

    const result = await new StockRepository().createEntry(
      { productId: product.id, quantity: 5, reason: "Compra semanal" },
      "33333333-3333-4333-8333-333333333333",
    );

    expect(result).toBeNull();
    expect(insert).not.toHaveBeenCalled();
  });

  it("creates absolute adjustment using delta quantity after locking the product row", async () => {
    const adjustedProduct = { ...product, stockQuantity: 10 };
    const productReturning = vi.fn(async () => [adjustedProduct]);
    const movementReturning = vi.fn(async () => [{ ...movement, type: "ADJUSTMENT", quantity: 8, reason: "Conferencia fisica" }]);
    const set = vi.fn(() => ({ where: vi.fn(() => ({ returning: productReturning })) }));
    const values = vi.fn(() => ({ returning: movementReturning }));
    const update = vi.fn(() => ({ set }));
    const insert = vi.fn(() => ({ values }));
    const forUpdate = vi.fn(async () => [product]);
    const where = vi.fn(() => ({ for: forUpdate }));
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));
    const transaction = vi.fn(async (callback) =>
      callback({
        select,
        update,
        insert,
        query: { products: { findFirst: vi.fn(async () => product) } },
      }),
    );

    vi.doMock("../../db", () => ({ db: { transaction } }));
    const { StockRepository } = await import("./stock.repository");

    const result = await new StockRepository().createAdjustment(
      { productId: product.id, newQuantity: 10, reason: "Conferencia fisica" },
      "33333333-3333-4333-8333-333333333333",
    );

    expect(select).toHaveBeenCalledOnce();
    expect(forUpdate).toHaveBeenCalledWith("update");
    expect(set).toHaveBeenCalledWith({ stockQuantity: 10, updatedAt: expect.any(Date) });
    expect(values).toHaveBeenCalledWith({
      productId: product.id,
      userId: "33333333-3333-4333-8333-333333333333",
      type: "ADJUSTMENT",
      quantity: 8,
      reason: "Conferencia fisica",
      referenceId: null,
    });
    expect(result?.movement.quantity).toBe(8);
  });

  it("returns null for adjustment when product does not exist", async () => {
    const forUpdate = vi.fn(async () => []);
    const where = vi.fn(() => ({ for: forUpdate }));
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));
    const update = vi.fn();
    const insert = vi.fn();
    const transaction = vi.fn(async (callback) =>
      callback({
        select,
        update,
        insert,
      }),
    );

    vi.doMock("../../db", () => ({ db: { transaction } }));
    const { StockRepository } = await import("./stock.repository");

    const result = await new StockRepository().createAdjustment(
      { productId: product.id, newQuantity: 10, reason: "Conferencia fisica" },
      "33333333-3333-4333-8333-333333333333",
    );

    expect(result).toBeNull();
    expect(forUpdate).toHaveBeenCalledWith("update");
    expect(update).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
});
