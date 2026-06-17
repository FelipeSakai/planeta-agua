import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchStockPage, stockAdjustmentFormToPayload, stockEntryFormToPayload } from "./stock";

vi.mock("./api", () => ({
  getServerApiUrl: vi.fn(() => "http://api.local"),
}));

const mockedFetch = vi.fn();
vi.stubGlobal("fetch", mockedFetch);

describe("stock web helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("converts stock entry form data to payload", () => {
    const formData = new FormData();
    formData.set("productId", "11111111-1111-4111-8111-111111111111");
    formData.set("quantity", "5");
    formData.set("reason", "Compra semanal");

    expect(stockEntryFormToPayload(formData)).toEqual({
      productId: "11111111-1111-4111-8111-111111111111",
      quantity: 5,
      reason: "Compra semanal",
    });
  });

  it("rejects entry form data with blank reason", () => {
    const formData = new FormData();
    formData.set("productId", "11111111-1111-4111-8111-111111111111");
    formData.set("quantity", "5");
    formData.set("reason", "");

    expect(() => stockEntryFormToPayload(formData)).toThrow();
  });

  it("converts absolute adjustment form data to payload", () => {
    const formData = new FormData();
    formData.set("productId", "11111111-1111-4111-8111-111111111111");
    formData.set("newQuantity", "0");
    formData.set("reason", "Conferencia fisica");

    expect(stockAdjustmentFormToPayload(formData)).toEqual({
      productId: "11111111-1111-4111-8111-111111111111",
      newQuantity: 0,
      reason: "Conferencia fisica",
    });
  });

  it("fetches and parses the stock page", async () => {
    const payload = {
      products: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Galao 20L",
          stockQuantity: 10,
          minimumStock: 3,
          isActive: true,
          isLowStock: false,
        },
      ],
      movements: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          productId: "11111111-1111-4111-8111-111111111111",
          productName: "Galao 20L",
          userId: "33333333-3333-4333-8333-333333333333",
          userName: "Admin",
          type: "IN",
          quantity: 5,
          reason: "Compra semanal",
          createdAt: "2026-06-15T00:00:00.000Z",
        },
      ],
      summary: { totalProducts: 1, lowStockProducts: 0, totalUnits: 10 },
    };
    mockedFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(payload) });

    await expect(fetchStockPage("pa_session=token")).resolves.toEqual(payload);
    expect(mockedFetch).toHaveBeenCalledWith("http://api.local/stock", {
      headers: { cookie: "pa_session=token" },
      cache: "no-store",
    });
  });

  it("returns an empty stock page when the API rejects the request", async () => {
    mockedFetch.mockResolvedValue({ ok: false });

    await expect(fetchStockPage("pa_session=expired")).resolves.toEqual({
      products: [],
      movements: [],
      summary: { totalProducts: 0, lowStockProducts: 0, totalUnits: 0 },
    });
  });
});
