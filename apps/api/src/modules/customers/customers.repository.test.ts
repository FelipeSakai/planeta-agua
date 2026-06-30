import { beforeEach, describe, expect, it, vi } from "vitest";

import { CustomersRepository } from "./customers.repository";

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    insert: vi.fn(),
    query: {
      customers: {
        findMany: vi.fn(),
      },
    },
  },
}));

vi.mock("../../db", () => ({ db: dbMock }));

const now = new Date("2026-06-22T00:00:00.000Z");

const customer = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Joao Silva",
  code: null,
  phone: "(11) 99999-0000",
  mobilePhone: "(11) 98888-0000",
  address: null,
  notes: null,
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

describe("CustomersRepository", () => {
  const repository = new CustomersRepository();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a customer and returns it", async () => {
    const returning = vi.fn(async () => [customer]);
    dbMock.insert.mockReturnValue({ values: vi.fn().mockReturnValue({ returning }) });

    const result = await repository.create({
      name: "Joao Silva",
      phone: "(11) 99999-0000",
      mobilePhone: "(11) 98888-0000",
      address: null,
      notes: null,
    });

    expect(result).toEqual(customer);
    expect(dbMock.insert).toHaveBeenCalled();
  });

  it("creates a bottle with calculated expiresAt", async () => {
    const bottle = {
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
    };
    const returning = vi.fn(async () => [bottle]);
    const values = vi.fn().mockReturnValue({ returning });
    dbMock.insert.mockReturnValue({ values });

    const result = await repository.createBottle({
      customerId: "11111111-1111-1111-1111-111111111111",
      month: 6,
      year: 2024,
      notes: null,
    });

    expect(result).toEqual(bottle);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "11111111-1111-1111-1111-111111111111",
        month: 6,
        year: 2024,
        expiresAt: new Date("2027-06-30T23:59:59.999Z"),
      }),
    );
  });

  it("finds duplicates and returns mobile phone", async () => {
    dbMock.query.customers.findMany.mockResolvedValue([
      { id: customer.id, name: customer.name, phone: customer.phone, mobilePhone: customer.mobilePhone },
    ]);

    const result = await repository.findDuplicates("Joao Silva", customer.phone, customer.mobilePhone);

    expect(result).toEqual([
      {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        mobilePhone: customer.mobilePhone,
      },
    ]);
    expect(dbMock.query.customers.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        columns: { id: true, name: true, phone: true, mobilePhone: true },
      }),
    );
  });
});
