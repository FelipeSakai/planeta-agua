import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { StockUi } from "./stock-ui";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}));

const stockPage = {
  products: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Galao 20L",
      stockQuantity: 2,
      minimumStock: 3,
      isActive: true,
      isLowStock: true,
    },
  ],
  movements: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      productId: "11111111-1111-4111-8111-111111111111",
      productName: "Galao 20L",
      userId: "33333333-3333-4333-8333-333333333333",
      userName: "Administrador",
      type: "IN" as const,
      quantity: 5,
      reason: "Compra semanal",
      createdAt: "2026-06-17T00:00:00.000Z",
    },
  ],
  summary: { totalProducts: 1, lowStockProducts: 1, totalUnits: 2 },
};

describe("StockUi", () => {
  it("hides mutation controls from operators", () => {
    const html = renderToStaticMarkup(createElement(StockUi, { userRole: "OPERATOR", data: stockPage }));

    expect(html).toContain("Galao 20L");
    expect(html).toContain("Estoque baixo");
    expect(html).toContain("Compra semanal");
    expect(html).not.toContain("Registrar entrada");
    expect(html).not.toContain("Registrar ajuste");
  });

  it("shows mutation controls to admins", () => {
    const html = renderToStaticMarkup(createElement(StockUi, { userRole: "ADMIN", data: stockPage }));

    expect(html).toContain("Registrar entrada");
    expect(html).toContain("Registrar ajuste");
    expect(html).toContain("Motivo");
  });
});
