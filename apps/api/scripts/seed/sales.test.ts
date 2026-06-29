import { describe, expect, it } from "vitest";

import { buildSeedSales } from "./sales";

describe("buildSeedSales", () => {
  it("creates at least one item for every seeded sale", () => {
    const { salesData, saleItemsData } = buildSeedSales(new Date("2026-06-25T12:00:00.000Z"));
    const itemCountBySaleId = new Map<string, number>();

    for (const item of saleItemsData) {
      itemCountBySaleId.set(item.saleId, (itemCountBySaleId.get(item.saleId) ?? 0) + 1);
    }

    expect(salesData).toHaveLength(80);
    expect(salesData.every((sale) => (itemCountBySaleId.get(sale.id!) ?? 0) > 0)).toBe(true);
  });

  it("creates unique sale item ids", () => {
    const { saleItemsData } = buildSeedSales(new Date("2026-06-25T12:00:00.000Z"));
    const ids = saleItemsData.map((item) => item.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
