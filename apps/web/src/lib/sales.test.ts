import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildBottleAlerts,
  cancelSalePayload,
  createSaleCustomer,
  fetchSaleDetail,
  fetchSalesHistory,
  saleFormToPayload,
  searchSaleCustomers,
} from "./sales";

vi.mock("./api", () => ({
  getServerApiUrl: vi.fn(() => "http://api.local"),
}));

const mockedFetch = vi.fn();
vi.stubGlobal("fetch", mockedFetch);

const salesHistoryPayload = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    customerId: null,
    customerName: null,
    userId: "22222222-2222-4222-8222-222222222222",
    userName: "Operador",
    totalAmountCents: 2400,
    paymentMethod: "PIX" as const,
    status: "COMPLETED" as const,
    createdAt: "2026-06-15T10:00:00.000Z",
    canceledAt: null,
    cancellationReason: null,
  },
];

const saleDetailPayload = {
  sale: {
    id: "11111111-1111-4111-8111-111111111111",
    customerId: null,
    customerName: null,
    userId: "22222222-2222-4222-8222-222222222222",
    userName: "Operador",
    totalAmountCents: 2400,
    paymentMethod: "PIX" as const,
    status: "COMPLETED" as const,
    createdAt: "2026-06-15T10:00:00.000Z",
    canceledAt: null,
    cancellationReason: null,
    bottle: null,
    previousBottle: null,
  },
  items: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      productId: "44444444-4444-4444-8444-444444444444",
      productNameSnapshot: "Galao 20L",
      quantity: 2,
      unitPriceCents: 1200,
      totalPriceCents: 2400,
    },
  ],
  bottleAlerts: {
    expired: false,
    mismatch: false,
  },
};

const customerPayload = {
  id: "55555555-5555-4555-8555-555555555555",
  name: "Maria",
  phone: "11999999999",
  previousBottle: { month: 6, year: 2024, notes: "Azul" },
};

describe("sales web helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds the sale payload with optional customer and bottle", () => {
    expect(
      saleFormToPayload({
        customerId: null,
        paymentMethod: "PIX",
        items: [{ productId: "11111111-1111-4111-8111-111111111111", quantity: 2 }],
        bottleMonth: "6",
        bottleYear: "2024",
        bottleNotes: "azul",
        deliveryPending: false,
      }),
    ).toEqual({
      customerId: null,
      paymentMethod: "PIX",
      items: [{ productId: "11111111-1111-4111-8111-111111111111", quantity: 2 }],
      bottle: { month: 6, year: 2024, notes: "azul" },
      deliveryPending: false,
    });
  });

  it("omits bottle data when month and year are blank", () => {
    expect(
      saleFormToPayload({
        customerId: null,
        paymentMethod: "CASH",
        items: [{ productId: "11111111-1111-4111-8111-111111111111", quantity: 1 }],
        bottleMonth: "",
        bottleYear: "",
        bottleNotes: "",
        deliveryPending: false,
      }),
    ).toMatchObject({ bottle: null });
  });

  it("fails fast when bottle month or year is missing", () => {
    expect(() =>
      saleFormToPayload({
        customerId: null,
        paymentMethod: "PIX",
        items: [{ productId: "11111111-1111-4111-8111-111111111111", quantity: 1 }],
        bottleMonth: "6",
        bottleYear: "",
        bottleNotes: "azul",
        deliveryPending: false,
      }),
    ).toThrow("Informe mes e ano do galao.");

    expect(() =>
      saleFormToPayload({
        customerId: null,
        paymentMethod: "PIX",
        items: [{ productId: "11111111-1111-4111-8111-111111111111", quantity: 1 }],
        bottleMonth: "",
        bottleYear: "2024",
        bottleNotes: "azul",
        deliveryPending: false,
      }),
    ).toThrow("Informe mes e ano do galao.");
  });

  it("builds the cancel sale payload", () => {
    expect(cancelSalePayload("  Cliente desistiu.  ")).toEqual({ reason: "Cliente desistiu." });
  });

  it("returns a clear operator message when the cancel reason is blank", () => {
    expect(() => cancelSalePayload("   ")).toThrow("Informe o motivo do cancelamento com pelo menos 3 caracteres.");
  });

  it("builds expired and mismatch alert labels", () => {
    expect(buildBottleAlerts({ expired: true, mismatch: true })).toEqual([
      "Galão acima da validade de 3 anos.",
      "Galão informado difere do último registro do cliente.",
    ]);
  });

  it("fetches and parses the sales history", async () => {
    mockedFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(salesHistoryPayload) });

    await expect(fetchSalesHistory("pa_session=token")).resolves.toEqual(salesHistoryPayload);
    expect(mockedFetch).toHaveBeenCalledWith("http://api.local/sales", {
      headers: { cookie: "pa_session=token" },
      cache: "no-store",
    });
  });

  it("throws a clear error when sales history cannot be loaded", async () => {
    mockedFetch.mockResolvedValue({ ok: false, json: vi.fn() });

    await expect(fetchSalesHistory("pa_session=expired")).rejects.toThrow(
      "Nao foi possivel carregar o historico de vendas.",
    );
  });

  it("fetches and parses a sale detail", async () => {
    mockedFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(saleDetailPayload) });

    await expect(fetchSaleDetail("pa_session=token", "11111111-1111-4111-8111-111111111111")).resolves.toEqual(
      saleDetailPayload,
    );
    expect(mockedFetch).toHaveBeenCalledWith("http://api.local/sales/11111111-1111-4111-8111-111111111111", {
      headers: { cookie: "pa_session=token" },
      cache: "no-store",
    });
  });

  it("throws a clear error when a sale detail cannot be loaded", async () => {
    mockedFetch.mockResolvedValue({ ok: false, json: vi.fn() });

    await expect(fetchSaleDetail("pa_session=expired", "11111111-1111-4111-8111-111111111111")).rejects.toThrow(
      "Nao foi possivel carregar os detalhes da venda.",
    );
  });

  it("searches sale customers with the sales customer response payload", async () => {
    mockedFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue([customerPayload]) });

    await expect(searchSaleCustomers("mar", { cookieHeader: "pa_session=token" })).resolves.toEqual([customerPayload]);
    expect(mockedFetch).toHaveBeenCalledWith("http://api.local/sales/customers?query=mar", {
      headers: { cookie: "pa_session=token" },
      cache: "no-store",
    });
  });

  it("searches sale customers through the app route when no server cookie header is provided", async () => {
    mockedFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue([customerPayload]) });

    await expect(searchSaleCustomers("mar")).resolves.toEqual([customerPayload]);
    expect(mockedFetch).toHaveBeenCalledWith("/api/sales/customers?query=mar", {
      headers: {},
      cache: "no-store",
    });
  });

  it("hydrates the initial sales customer list from an empty query", async () => {
    mockedFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue([customerPayload]) });

    await expect(searchSaleCustomers("", { cookieHeader: "pa_session=token" })).resolves.toEqual([customerPayload]);
    expect(mockedFetch).toHaveBeenCalledWith("http://api.local/sales/customers?query=", {
      headers: { cookie: "pa_session=token" },
      cache: "no-store",
    });
  });

  it("throws a clear error when customer search fails", async () => {
    mockedFetch.mockResolvedValue({ ok: false, json: vi.fn() });

    await expect(searchSaleCustomers("mar", { cookieHeader: "pa_session=expired" })).rejects.toThrow(
      "Nao foi possivel buscar os clientes.",
    );
  });

  it("creates a quick customer with the sales customer response payload", async () => {
    mockedFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(customerPayload) });

    await expect(createSaleCustomer({ name: "Maria", phone: "11999999999" }, { cookieHeader: "pa_session=token" })).resolves.toEqual(
      customerPayload,
    );
    expect(mockedFetch).toHaveBeenCalledWith("http://api.local/sales/customers", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "pa_session=token" },
      body: JSON.stringify({ name: "Maria", phone: "11999999999" }),
      cache: "no-store",
    });
  });

  it("creates a quick customer through the app route when running in the sales UI", async () => {
    mockedFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ ...customerPayload, previousBottle: null }) });

    await expect(createSaleCustomer({ name: "Maria", phone: "11999999999" })).resolves.toEqual({
      ...customerPayload,
      previousBottle: null,
    });
    expect(mockedFetch).toHaveBeenCalledWith("/api/sales/customers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Maria", phone: "11999999999" }),
      cache: "no-store",
    });
  });

  it("throws a clear error when customer creation fails", async () => {
    mockedFetch.mockResolvedValue({ ok: false, json: vi.fn() });

    await expect(
      createSaleCustomer({ name: "Maria", phone: "11999999999" }, { cookieHeader: "pa_session=expired" }),
    ).rejects.toThrow("Nao foi possivel cadastrar o cliente.");
  });
});
