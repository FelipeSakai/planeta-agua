import { beforeEach, describe, expect, it, vi } from "vitest";

const product = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Galao 20L",
  description: null,
  salePriceCents: 1200,
  stockQuantity: 8,
  minimumStock: 2,
  isActive: true,
  createdAt: new Date("2026-06-15T00:00:00.000Z"),
  updatedAt: new Date("2026-06-15T00:00:00.000Z"),
};

describe("ProductsRepository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("creates an initial stock movement when creating a product with stock", async () => {
    const productReturning = vi.fn(async () => [product]);
    const productValues = vi.fn(() => ({ returning: productReturning }));
    const movementValues = vi.fn(async () => undefined);
    const insert = vi.fn().mockReturnValueOnce({ values: productValues }).mockReturnValueOnce({ values: movementValues });
    const transaction = vi.fn(async (callback) => callback({ insert }));

    vi.doMock("../../db", () => ({ db: { transaction } }));
    const { ProductsRepository } = await import("./products.repository");

    const result = await new ProductsRepository().create(
      {
        name: "Galao 20L",
        description: null,
        salePriceCents: 1200,
        stockQuantity: 8,
        minimumStock: 2,
      },
      "22222222-2222-4222-8222-222222222222",
    );

    expect(result).toEqual(product);
    expect(transaction).toHaveBeenCalledOnce();
    expect(productValues).toHaveBeenCalledWith({
      name: "Galao 20L",
      description: null,
      salePriceCents: 1200,
      stockQuantity: 8,
      minimumStock: 2,
    });
    expect(movementValues).toHaveBeenCalledWith({
      productId: product.id,
      userId: "22222222-2222-4222-8222-222222222222",
      type: "IN",
      quantity: 8,
      reason: "Estoque inicial do produto.",
      referenceId: product.id,
    });
  });
});
