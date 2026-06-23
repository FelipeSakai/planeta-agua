import { beforeEach, describe, expect, it, vi } from "vitest";

const now = new Date("2026-06-22T00:00:00.000Z");

const customer = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Joao Silva",
  code: null,
  phone: "(11) 99999-0000",
  address: null,
  notes: null,
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

describe("CustomersRepository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("creates a customer and returns it", async () => {
    const returning = vi.fn(async () => [customer]);
    const insert = vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ returning }) });
    const db = { insert };

    vi.doMock("../../db", () => ({ db }));
    const { CustomersRepository } = await import("./customers.repository");

    const result = await new CustomersRepository().create({
      name: "Joao Silva",
      phone: "(11) 99999-0000",
      address: null,
      notes: null,
    });

    expect(result).toEqual(customer);
    expect(insert).toHaveBeenCalled();
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
    const insert = vi.fn().mockReturnValue({ values });
    const db = { insert };

    vi.doMock("../../db", () => ({ db }));
    const { CustomersRepository } = await import("./customers.repository");

    const result = await new CustomersRepository().createBottle({
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
});
