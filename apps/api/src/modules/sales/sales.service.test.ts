import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { SalesRepositoryError } from "./sales.errors";
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
    confirmDelivery: vi.fn(),
    searchCustomers: vi.fn(),
    createQuickCustomer: vi.fn(),
    getLatestBottleForCustomer: vi.fn(),
  };
}

function createFinanceService() {
  return {
    ensureCashRegisterForToday: vi.fn().mockResolvedValue(undefined),
  };
}

describe("SalesService", () => {
  it("rejects a sale when repository reports inactive product, missing product, or insufficient stock", async () => {
    const repository = createRepository();
    const service = new SalesService(repository as never, createFinanceService() as never);
    const input = {
      customerId: null,
      paymentMethod: "PIX" as const,
      items: [{ productId: "33333333-3333-4333-8333-333333333333", quantity: 2 }],
      bottle: null,
      deliveryPending: false,
    };

    repository.createSale.mockRejectedValueOnce(
      new SalesRepositoryError("PRODUCT_INACTIVE", "Produto Galao 20L esta inativo."),
    );

    await expect(service.createSale(operatorUser, input)).rejects.toMatchObject({
      message: "Produto Galao 20L esta inativo.",
    });

    repository.createSale.mockRejectedValueOnce(
      new SalesRepositoryError("INSUFFICIENT_STOCK", "Estoque insuficiente para Galao 20L."),
    );

    await expect(service.createSale(operatorUser, input)).rejects.toMatchObject({
      message: "Estoque insuficiente para Galao 20L.",
    });

    repository.createSale.mockRejectedValueOnce(
      new SalesRepositoryError("PRODUCT_NOT_FOUND", "Produto 33333333-3333-4333-8333-333333333333 nao encontrado."),
    );

    await expect(service.createSale(operatorUser, input)).rejects.toMatchObject({
      message: "Produto 33333333-3333-4333-8333-333333333333 nao encontrado.",
    });
  });

  it("falls back to a generic message when the repository throws a non-typed error", async () => {
    const repository = createRepository();
    const service = new SalesService(repository as never, createFinanceService() as never);
    const input = {
      customerId: null,
      paymentMethod: "PIX" as const,
      items: [{ productId: "33333333-3333-4333-8333-333333333333", quantity: 1 }],
      bottle: null,
      deliveryPending: false,
    };

    repository.createSale.mockRejectedValueOnce(new Error("conexao perdida"));

    await expect(service.createSale(operatorUser, input)).rejects.toMatchObject({
      message: "Nao foi possivel finalizar a venda.",
    });
  });

  it("returns bottle alerts based on previous customer bottle history", async () => {
    const repository = createRepository();
    const service = new SalesService(repository as never, createFinanceService() as never);

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
        deliveredAt: null,
        deliveredByUserId: null,
        bottleMonth: 1,
        bottleYear: 2020,
        bottleNotes: "Casco antigo",
        customer: { id: "55555555-5555-4555-8555-555555555555", name: "Maria", phone: "11999999999", mobilePhone: "11988888888", address: "Rua A, 10" },
        user: { id: operatorUser.id, name: "Operador" },
        canceledByUser: null,
        driverId: "33333333-3333-4333-8333-333333333333",
        driver: { id: "33333333-3333-4333-8333-333333333333", name: "Joao Entregador" },
      },
      items: [
        {
          id: "66666666-6666-4666-8666-666666666666",
          productId: "77777777-7777-4777-8777-777777777777",
          productNameSnapshot: "Galao 20L",
          quantity: 2,
          unitPriceCents: 1800,
          totalPriceCents: 3600,
          discountCents: null,
          finalUnitPriceCents: null,
        },
      ],
      previousBottle: { month: 2, year: 2020, notes: "Casco anterior" },
    });

    await expect(service.getSaleDetail("44444444-4444-4444-8444-444444444444")).resolves.toEqual({
      sale: {
        id: "44444444-4444-4444-8444-444444444444",
        customerId: "55555555-5555-4555-8555-555555555555",
        customerName: "Maria",
        customerPhone: "11999999999",
        customerMobilePhone: "11988888888",
        customerAddress: "Rua A, 10",
        userId: operatorUser.id,
        userName: "Operador",
        totalAmountCents: 3600,
        paymentMethod: "PIX",
        status: "COMPLETED",
        createdAt: "2026-06-18T10:00:00.000Z",
        canceledAt: null,
        cancellationReason: null,
        deliveredAt: null,
        deliveredByUserId: null,
        driverId: "33333333-3333-4333-8333-333333333333",
        driverName: "Joao Entregador",
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
          discountCents: null,
          finalUnitPriceCents: null,
        },
      ],
      bottleAlerts: {
        expired: true,
        mismatch: true,
      },
    });
  });

  it("requires a cancellation reason and rejects double cancellation or missing sale", async () => {
    const repository = createRepository();
    const service = new SalesService(repository as never, createFinanceService() as never);

    await expect(service.cancelSale(adminUser, "88888888-8888-4888-8888-888888888888", "" as never)).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.cancelSale).not.toHaveBeenCalled();

    repository.cancelSale.mockRejectedValueOnce(
      new SalesRepositoryError("SALE_ALREADY_CANCELED", "Venda 88888888-8888-4888-8888-888888888888 ja cancelada."),
    );

    await expect(
      service.cancelSale(adminUser, "88888888-8888-4888-8888-888888888888", "Cliente desistiu."),
    ).rejects.toMatchObject({ message: "Venda ja cancelada." });

    repository.cancelSale.mockRejectedValueOnce(
      new SalesRepositoryError("SALE_NOT_FOUND", "Venda 88888888-8888-4888-8888-888888888888 nao encontrada."),
    );

    await expect(
      service.cancelSale(adminUser, "88888888-8888-4888-8888-888888888888", "Cliente desistiu."),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("returns minimized customer data for sales customer search", async () => {
    const repository = createRepository();
    const service = new SalesService(repository as never, createFinanceService() as never);
    const previousBottle = { month: 6, year: 2024, notes: "Azul" };

    repository.searchCustomers.mockResolvedValueOnce([
      {
        id: "99999999-9999-4999-8999-999999999999",
        name: "Maria",
        phone: "11999999999",
        mobilePhone: "11988888888",
        code: null,
        address: "Rua A, 10",
        notes: "Cliente recorrente",
        createdAt: new Date("2026-06-18T09:00:00.000Z"),
        updatedAt: new Date("2026-06-18T09:30:00.000Z"),
      },
    ]);
    repository.getLatestBottleForCustomer.mockResolvedValueOnce(previousBottle);

    await expect(service.searchCustomers("mar")).resolves.toEqual([
      {
        id: "99999999-9999-4999-8999-999999999999",
        name: "Maria",
        phone: "11999999999",
        mobilePhone: "11988888888",
        code: null,
        address: "Rua A, 10",
        previousBottle,
      },
    ]);
  });

  it("returns minimized customer data for quick customer creation", async () => {
    const repository = createRepository();
    const service = new SalesService(repository as never, createFinanceService() as never);

    repository.createQuickCustomer.mockResolvedValueOnce({
      id: "12121212-1212-4212-8212-121212121212",
      name: "Joao",
      phone: "11888888888",
      mobilePhone: "11999999999",
      code: null,
      address: null,
      notes: null,
      createdAt: new Date("2026-06-18T11:00:00.000Z"),
      updatedAt: new Date("2026-06-18T11:00:00.000Z"),
    });

    await expect(service.createQuickCustomer({ name: "Joao", phone: "11888888888", mobilePhone: "11999999999" })).resolves.toEqual({
      id: "12121212-1212-4212-8212-121212121212",
      name: "Joao",
      phone: "11888888888",
      mobilePhone: "11999999999",
      code: null,
      address: null,
      previousBottle: null,
    });
  });

  it("allows operators and admins to cancel sales", async () => {
    const repository = createRepository();
    const service = new SalesService(repository as never, createFinanceService() as never);
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

  it("confirms delivery for a pending delivery sale", async () => {
    const repository = createRepository();
    const service = new SalesService(repository as never, createFinanceService() as never);
    const delivered = { id: "88888888-8888-4888-8888-888888888888", status: "COMPLETED" as const };

    repository.confirmDelivery.mockResolvedValueOnce(delivered);
    await expect(service.confirmDelivery(operatorUser, "88888888-8888-4888-8888-888888888888")).resolves.toEqual(delivered);
    expect(repository.confirmDelivery).toHaveBeenCalledWith({ saleId: "88888888-8888-4888-8888-888888888888", userId: operatorUser.id });
  });

  it("maps confirmDelivery errors to not found or bad request", async () => {
    const repository = createRepository();
    const service = new SalesService(repository as never, createFinanceService() as never);

    repository.confirmDelivery.mockRejectedValueOnce(new SalesRepositoryError("SALE_NOT_FOUND", "Venda nao encontrada."));
    await expect(service.confirmDelivery(operatorUser, "88888888-8888-4888-8888-888888888888")).rejects.toBeInstanceOf(NotFoundException);

    repository.confirmDelivery.mockRejectedValueOnce(new SalesRepositoryError("SALE_NOT_DELIVERABLE", "Nao pendente."));
    await expect(service.confirmDelivery(operatorUser, "88888888-8888-4888-8888-888888888888")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("searches customers with primary and secondary queries", async () => {
    const repository = createRepository();
    const service = new SalesService(repository as never, createFinanceService() as never);

    repository.searchCustomers.mockResolvedValueOnce([
      { id: "99999999-9999-4999-8999-999999999999", name: "Maria", phone: "11999999999", mobilePhone: "11988888888", code: "C001", address: "Rua A", notes: null, createdAt: new Date(), updatedAt: new Date() },
    ]);
    repository.getLatestBottleForCustomer.mockResolvedValueOnce(null);

    await expect(service.searchCustomers("Maria", "C001")).resolves.toEqual([
      { id: "99999999-9999-4999-8999-999999999999", name: "Maria", phone: "11999999999", mobilePhone: "11988888888", code: "C001", address: "Rua A", previousBottle: null },
    ]);
    expect(repository.searchCustomers).toHaveBeenCalledWith("Maria", "C001");
  });

  it("lists sales with a status filter", async () => {
    const repository = createRepository();
    const service = new SalesService(repository as never, createFinanceService() as never);

    repository.listSales.mockResolvedValueOnce([]);
    await service.listSales({ status: "PENDING_DELIVERY" });
    expect(repository.listSales).toHaveBeenCalledWith({ status: "PENDING_DELIVERY" });
  });

  it("ensures cash register exists before creating a sale", async () => {
    const repository = createRepository();
    const financeService = createFinanceService();
    const service = new SalesService(repository as never, financeService as never);
    const input = {
      customerId: null,
      paymentMethod: "PIX" as const,
      items: [{ productId: "33333333-3333-4333-8333-333333333333", quantity: 1 }],
      bottle: null,
      deliveryPending: false,
    };

    const callOrder: string[] = [];
    financeService.ensureCashRegisterForToday.mockImplementationOnce(async () => {
      callOrder.push("ensureCashRegisterForToday");
      return undefined;
    });
    repository.createSale.mockImplementationOnce(async () => {
      callOrder.push("createSale");
      return { id: "s1" };
    });

    await service.createSale(operatorUser, input);

    expect(financeService.ensureCashRegisterForToday).toHaveBeenCalledWith(operatorUser.id);
    expect(callOrder).toEqual(["ensureCashRegisterForToday", "createSale"]);
  });
});
