import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchProducts, getProductStatusLabel, productFormToPayload } from "./products";

vi.mock("./api", () => ({
  getServerApiUrl: vi.fn(() => "http://api.local"),
}));

const mockedFetch = vi.fn();
vi.stubGlobal("fetch", mockedFetch);

describe("web product helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("converts form data to an API payload", () => {
    const formData = new FormData();
    formData.set("name", "Galao 20L");
    formData.set("description", "Agua mineral");
    formData.set("salePrice", "12,50");
    formData.set("stockQuantity", "10");
    formData.set("minimumStock", "3");

    expect(productFormToPayload(formData)).toEqual({
      name: "Galao 20L",
      description: "Agua mineral",
      salePriceCents: 1250,
      stockQuantity: 10,
      minimumStock: 3,
    });
  });

  it("rejects invalid or empty price text", () => {
    for (const price of ["abc", "", "   "]) {
      const formData = new FormData();
      formData.set("name", "Galao 20L");
      formData.set("salePrice", price);
      formData.set("stockQuantity", "10");
      formData.set("minimumStock", "3");

      expect(() => productFormToPayload(formData)).toThrow();
    }
  });

  it("rejects blank stock fields", () => {
    const formData = new FormData();
    formData.set("name", "Galao 20L");
    formData.set("salePrice", "12,50");
    formData.set("stockQuantity", "");
    formData.set("minimumStock", "3");

    expect(() => productFormToPayload(formData)).toThrow();
  });

  it("allows an intentional zero price", () => {
    const formData = new FormData();
    formData.set("name", "Produto bonificado");
    formData.set("salePrice", "0");
    formData.set("stockQuantity", "1");
    formData.set("minimumStock", "0");

    expect(productFormToPayload(formData).salePriceCents).toBe(0);
  });

  it("labels active and inactive products", () => {
    expect(getProductStatusLabel(true)).toBe("Ativo");
    expect(getProductStatusLabel(false)).toBe("Inativo");
  });

  it("fetches and parses the products list", async () => {
    const payload = {
      products: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Galao 20L",
          description: null,
          salePriceCents: 1250,
          stockQuantity: 10,
          minimumStock: 3,
          isActive: true,
          isLowStock: false,
          createdAt: "2026-06-15T00:00:00.000Z",
          updatedAt: "2026-06-15T00:00:00.000Z",
        },
      ],
      summary: { total: 1, active: 1, lowStock: 0 },
    };
    mockedFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(payload) });

    await expect(fetchProducts("pa_session=token")).resolves.toEqual(payload);
    expect(mockedFetch).toHaveBeenCalledWith("http://api.local/products", {
      headers: { cookie: "pa_session=token" },
      cache: "no-store",
    });
  });

  it("returns an empty products summary when the API rejects the request", async () => {
    mockedFetch.mockResolvedValue({ ok: false });

    await expect(fetchProducts("pa_session=expired")).resolves.toEqual({
      products: [],
      summary: { total: 0, active: 0, lowStock: 0 },
    });
  });
});
