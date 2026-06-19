import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { SalesService } from "./sales.service";

const operatorUser = {
  id: "11111111-1111-4111-8111-111111111111",
  role: "OPERATOR" as const,
};

const adminUser = {
  id: "22222222-2222-4222-8222-222222222222",
  role: "ADMIN" as const,
};

function createRepository() {
  return {
    listSales: vi.fn(),
    getSaleDetail: vi.fn(),
    createSale: vi.fn(),
    cancelSale: vi.fn(),
    searchCustomers: vi.fn(),
    createQuickCustomer: vi.fn(),
    getLatestBottleForCustomer: vi.fn(),
  };
}

describe("SalesService", () => {
  it("rejects a sale when repository reports inactive product or insufficient stock", async () => {
    const repository = createRepository();
    const service = new SalesService(repository as never);
    const input = {
      customerId: null,
      paymentMethod: "PIX" as const,
      items: [{ productId: "33333333-3333-4333-8333-333333333333", quantity: 2 }],
      bottle: null,
    };

    repository.createSale.mockRejectedValueOnce(new Error("Produto Galao 20L esta inativo."));

    await expect(service.createSale(operatorUser, input)).rejects.toMatchObject({
      message: "Produto Galao 20L esta inativo.",
    });

    repository.createSale.mockRejectedValueOnce(new Error("Estoque insuficiente para Galao 20L."));

    await expect(service.createSale(operatorUser, input)).rejects.toMatchObject({
      message: "Estoque insuficiente para Galao 20L.",
    });
  });

  it("returns bottle alerts based on previous customer bottle history", async () => {
    const repository = createRepository();
    const service = new SalesService(repository as never);

    repository.getSaleDetail.mockResolvedValueOnce({
      sale: {
        id: "44444444-4444-4444-8444-444444444444",
        customerId: "55555555-5555-4555-8555-555555555555",
        userId: operatorUser.id,
        totalAmountCents: 3600,
        paymentMethod: "PIX",
        status: "COMPLETED",
        createdAt: new Date("2026-06-18T10:00:00.000Z"),
        canceledAt: null,
        cancellationReason: null,
        bottleMonth: 1,
        bottleYear: 2020,
        bottleNotes: "Casco antigo",
        customer: { id: "55555555-5555-4555-8555-555555555555", name: "Maria" },
        user: { id: operatorUser.id, name: "Operador" },
        canceledByUser: null,
      },
      items: [
        {
          id: "66666666-6666-4666-8666-666666666666",
          productId: "77777777-7777-4777-8777-777777777777",
          productNameSnapshot: "Galao 20L",
          quantity: 2,
          unitPriceCents: 1800,
          totalPriceCents: 3600,
        },
      ],
      previousBottle: { month: 2, year: 2020, notes: "Casco anterior" },
    });

    await expect(service.getSaleDetail("44444444-4444-4444-8444-444444444444")).resolves.toEqual({
      sale: {
        id: "44444444-4444-4444-8444-444444444444",
        customerId: "55555555-5555-4555-8555-555555555555",
        customerName: "Maria",
        userId: operatorUser.id,
        userName: "Operador",
        totalAmountCents: 3600,
        paymentMethod: "PIX",
        status: "COMPLETED",
        createdAt: "2026-06-18T10:00:00.000Z",
        canceledAt: null,
        cancellationReason: null,
        bottle: { month: 1, year: 2020, notes: "Casco antigo" },
        previousBottle: { month: 2, year: 2020, notes: "Casco anterior" },
      },
      items: [
        {
          id: "66666666-6666-4666-8666-666666666666",
          productId: "77777777-7777-4777-8777-777777777777",
          productNameSnapshot: "Galao 20L",
          quantity: 2,
          unitPriceCents: 1800,
          totalPriceCents: 3600,
        },
      ],
      bottleAlerts: {
        expired: true,
        mismatch: true,
      },
    });
  });

  it("requires a cancellation reason and rejects double cancellation", async () => {
    const repository = createRepository();
    const service = new SalesService(repository as never);

    await expect(service.cancelSale(adminUser, "88888888-8888-4888-8888-888888888888", "" as never)).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.cancelSale).not.toHaveBeenCalled();

    repository.cancelSale.mockRejectedValueOnce(new Error("Venda 88888888-8888-4888-8888-888888888888 ja cancelada."));

    await expect(
      service.cancelSale(adminUser, "88888888-8888-4888-8888-888888888888", "Cliente desistiu."),
    ).rejects.toMatchObject({ message: "Venda ja cancelada." });
  });

  it("allows operators and admins to cancel sales", async () => {
    const repository = createRepository();
    const service = new SalesService(repository as never);
    const canceledSale = { id: "88888888-8888-4888-8888-888888888888", status: "CANCELED" as const };

    repository.cancelSale.mockResolvedValueOnce(canceledSale);
    await expect(
      service.cancelSale(operatorUser, "88888888-8888-4888-8888-888888888888", "Cliente desistiu."),
    ).resolves.toEqual(canceledSale);

    repository.cancelSale.mockResolvedValueOnce(canceledSale);
    await expect(
      service.cancelSale(adminUser, "88888888-8888-4888-8888-888888888888", "Cliente desistiu."),
    ).resolves.toEqual(canceledSale);

    expect(repository.cancelSale).toHaveBeenNthCalledWith(1, {
      saleId: "88888888-8888-4888-8888-888888888888",
      userId: operatorUser.id,
      reason: "Cliente desistiu.",
    });
    expect(repository.cancelSale).toHaveBeenNthCalledWith(2, {
      saleId: "88888888-8888-4888-8888-888888888888",
      userId: adminUser.id,
      reason: "Cliente desistiu.",
    });
  });
});
