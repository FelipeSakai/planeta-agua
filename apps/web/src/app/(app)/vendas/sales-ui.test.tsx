import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { SalesUi } from "./sales-ui";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}));

describe("SalesUi", () => {
  it("allows a sale without customer", () => {
    const html = renderToStaticMarkup(
      createElement(SalesUi, { userRole: "OPERATOR", history: [], products: [], customers: [] }),
    );

    expect(html).toContain("Cliente opcional");
    expect(html).toContain("Finalizar venda");
  });

  it("shows bottle alerts when current bottle is expired or differs from last record", () => {
    const html = renderToStaticMarkup(
      createElement(SalesUi, {
        userRole: "ADMIN",
        history: [],
        products: [],
        customers: [{ id: "c1", name: "Maria", phone: null, previousBottle: { month: 6, year: 2022, notes: "azul" } }],
      }),
    );

    expect(html).toContain("Galão acima da validade de 3 anos.");
    expect(html).toContain("Galão informado difere do último registro do cliente.");
  });

  it("shows cancel action in history for operators and admins", () => {
    const html = renderToStaticMarkup(
      createElement(SalesUi, {
        userRole: "OPERATOR",
        history: [
          {
            id: "s1",
            status: "COMPLETED",
            customerName: null,
            userName: "Operador",
            totalAmountCents: 1000,
            paymentMethod: "PIX",
            createdAt: "2026-06-18T00:00:00.000Z",
            canceledAt: null,
            cancellationReason: null,
          },
        ],
        products: [],
        customers: [],
      }),
    );

    expect(html).toContain("Cancelar venda");
  });
});
