import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { CustomersService } from "./customers.service";

const now = new Date("2026-06-22T00:00:00.000Z");

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  mobilePhone: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function makeCustomer(overrides: Partial<CustomerRow> = {}): CustomerRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Joao Silva",
    phone: "(11) 99999-0000",
    mobilePhone: "(11) 98888-0000",
    address: null,
    notes: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

type BottleRow = {
  id: string;
  customerId: string;
  saleId: string | null;
  month: number;
  year: number;
  notes: string | null;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

function makeBottle(overrides: Partial<BottleRow> = {}): BottleRow {
  return {
    id: "22222222-2222-2222-2222-222222222222",
    customerId: "11111111-1111-1111-1111-111111111111",
    saleId: null,
    month: 6,
    year: 2024,
    notes: null,
    isActive: true,
    expiresAt: new Date("2027-06-30T23:59:59.999Z"),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

class FakeRepository {
  customers = [makeCustomer()];
  bottles = [makeBottle()];

  findMany = vi.fn(async () => this.customers);
  findById = vi.fn(async (id: string) => this.customers.find((c) => c.id === id));
  create = vi.fn(async (input) => makeCustomer(input));
  update = vi.fn(async (id: string, input) => makeCustomer({ id, ...input }));
  setActive = vi.fn(async (id: string, isActive: boolean) => makeCustomer({ id, isActive }));
  findDuplicates = vi.fn(async (): Promise<{ id: string; name: string; phone: string | null; mobilePhone: string | null }[]> => []);
  findBottlesByCustomerId = vi.fn(async () => this.bottles);
  findBottleById = vi.fn(async (id: string) => this.bottles.find((b) => b.id === id));
  createBottle = vi.fn(async (input) => makeBottle(input));
  updateBottle = vi.fn(async (id: string, input) => makeBottle({ id, ...input }));
  deactivateBottle = vi.fn(async (id: string) => makeBottle({ id, isActive: false }));
  findRecentSalesByCustomerId = vi.fn(async () => []);
}

const operatorUser = { id: "44444444-4444-4444-4444-444444444444", role: "OPERATOR" as const };

describe("CustomersService", () => {
  it("lists customers with summary and bottle alerts", async () => {
    const repository = new FakeRepository();
    const service = new CustomersService(repository as never);

    const result = await service.listCustomers();

    expect(result.customers).toHaveLength(1);
    expect(result.customers[0]).toMatchObject({
      name: "Joao Silva",
      phone: "(11) 99999-0000",
      mobilePhone: "(11) 98888-0000",
    });
    expect(result.summary.total).toBe(1);
    expect(result.summary.active).toBe(1);
  });

  it("throws NotFoundException when getting a non-existent customer", async () => {
    const repository = new FakeRepository();
    const service = new CustomersService(repository as never);

    await expect(service.getCustomerDetail("non-existent")).rejects.toThrow(NotFoundException);
  });

  it("throws BadRequestException when creating a customer with duplicate phone", async () => {
    const repository = new FakeRepository();
    repository.findDuplicates = vi.fn(async () => [
      { id: "55555555-5555-5555-5555-555555555555", name: "Outro Joao", phone: "(11) 99999-0000", mobilePhone: null },
    ]);
    const service = new CustomersService(repository as never);

    await expect(
      service.createCustomer(operatorUser, {
        name: "Joao Silva",
        phone: "(11) 99999-0000",
        mobilePhone: null,
        address: null,
        notes: null,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("allows both ADMIN and OPERATOR to create customers", async () => {
    const repository = new FakeRepository();
    const service = new CustomersService(repository as never);

    await expect(
      service.createCustomer(operatorUser, {
        name: "Maria Santos",
        phone: null,
        mobilePhone: "11999999999",
        address: null,
        notes: null,
      }),
    ).resolves.toMatchObject({
      name: "Maria Santos",
      phone: null,
      mobilePhone: "11999999999",
    });
  });

  it("returns mobile phone in duplicate checks", async () => {
    const repository = new FakeRepository();
    repository.findDuplicates = vi.fn(async () => [
      { id: "55555555-5555-5555-5555-555555555555", name: "Maria", phone: "1133333333", mobilePhone: "11999999999" },
    ]);
    const service = new CustomersService(repository as never);

    await expect(service.checkDuplicates("Maria", "1133333333", "11999999999")).resolves.toEqual({
      hasDuplicates: true,
      duplicates: [
        {
          id: "55555555-5555-5555-5555-555555555555",
          name: "Maria",
          phone: "1133333333",
          mobilePhone: "11999999999",
        },
      ],
    });
  });

  it("throws when trying to add a bottle to a non-existent customer", async () => {
    const repository = new FakeRepository();
    const service = new CustomersService(repository as never);

    await expect(
      service.addBottle("non-existent", operatorUser, { month: 6, year: 2024, notes: null }),
    ).rejects.toThrow(NotFoundException);
  });
});
