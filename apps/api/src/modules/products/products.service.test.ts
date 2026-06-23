import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { ProductsService } from "./products.service";

const now = new Date("2026-06-15T00:00:00.000Z");

type ProductRowForTest = {
  id: string;
  name: string;
  description: string | null;
  salePriceCents: number;
  stockQuantity: number;
  minimumStock: number;
  isActive: boolean;
  bottleType: "NONE" | "COMPLETE" | "EXCHANGE";
  createdAt: Date;
  updatedAt: Date;
};

function makeProduct(overrides: Partial<ProductRowForTest> = {}): ProductRowForTest {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Galao 20L",
    description: null,
    salePriceCents: 1200,
    stockQuantity: 3,
    minimumStock: 3,
    isActive: true,
    bottleType: "NONE",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

class FakeProductsRepository {
  products = [makeProduct()];
  findMany = vi.fn(async () => this.products);
  findById = vi.fn(async (id: string) => this.products.find((product) => product.id === id));
  create = vi.fn(async (input) => makeProduct(input));
  update = vi.fn(async (id: string, input) => makeProduct({ id, ...input }));
  setActive = vi.fn(async (id: string, isActive: boolean) => makeProduct({ id, isActive }));
}

const adminUser = { id: "22222222-2222-4222-8222-222222222222", role: "ADMIN" as const };
const operatorUser = { id: "33333333-3333-4333-8333-333333333333", role: "OPERATOR" as const };

describe("ProductsService", () => {
  it("adds low-stock flags and summary when listing products", async () => {
    const service = new ProductsService(new FakeProductsRepository() as never);

    const result = await service.listProducts();

    expect(result.products[0]?.isLowStock).toBe(true);
    expect(result.summary).toEqual({ total: 1, active: 1, lowStock: 1 });
  });

  it("treats zero stock with zero minimum as low stock intentionally", async () => {
    const repository = new FakeProductsRepository();
    repository.products = [makeProduct({ stockQuantity: 0, minimumStock: 0 })];
    const service = new ProductsService(repository as never);

    const result = await service.listProducts();

    expect(result.products[0]?.isLowStock).toBe(true);
    expect(result.summary.lowStock).toBe(1);
  });

  it("allows admins to create products", async () => {
    const repository = new FakeProductsRepository();
    const service = new ProductsService(repository as never);

    await service.createProduct(
      adminUser,
      {
        name: "Fardo 12x500ml",
        description: null,
        salePriceCents: 1800,
        stockQuantity: 8,
        minimumStock: 2,
        bottleType: "NONE",
      },
    );

    expect(repository.create).toHaveBeenCalledWith(
      {
        name: "Fardo 12x500ml",
        description: null,
        salePriceCents: 1800,
        stockQuantity: 8,
        minimumStock: 2,
        bottleType: "NONE",
      },
      adminUser.id,
    );

    await expect(
      service.createProduct(
        adminUser,
        {
          name: "Produto invalido",
          description: null,
          salePriceCents: 100,
          stockQuantity: -1,
          minimumStock: 1,
          bottleType: "NONE",
        },
      ),
    ).rejects.toThrow();
  });

  it("blocks operators from creating products", async () => {
    const service = new ProductsService(new FakeProductsRepository() as never);

    await expect(
      service.createProduct(
        operatorUser,
        {
          name: "Fardo 12x500ml",
          description: null,
          salePriceCents: 1800,
          stockQuantity: 8,
          minimumStock: 2,
          bottleType: "NONE",
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("throws when updating a missing product", async () => {
    const repository = new FakeProductsRepository();
    repository.findById.mockResolvedValueOnce(undefined);
    const service = new ProductsService(repository as never);

    await expect(
      service.updateProduct(
        "missing",
        adminUser,
        {
          name: "Produto",
          description: null,
          salePriceCents: 100,
          minimumStock: 1,
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("does not accept stock quantity changes during product update", async () => {
    const repository = new FakeProductsRepository();
    const service = new ProductsService(repository as never);

    await service.updateProduct(
      "11111111-1111-1111-1111-111111111111",
      adminUser,
      {
        name: "Produto editado",
        salePriceCents: 100,
      },
    );

    expect(repository.update).toHaveBeenCalledWith("11111111-1111-1111-1111-111111111111", {
      name: "Produto editado",
      salePriceCents: 100,
    });

    await expect(
      service.updateProduct(
        "11111111-1111-1111-1111-111111111111",
        adminUser,
        { name: "Produto editado", stockQuantity: 99 } as never,
      ),
    ).rejects.toThrow();
  });
});
