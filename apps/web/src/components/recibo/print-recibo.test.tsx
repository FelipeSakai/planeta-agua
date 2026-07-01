import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SaleDetailResponse } from "shared";

import { PrintRecibo } from "./print-recibo";

const saleDetail: SaleDetailResponse = {
  sale: {
    id: "11111111-1111-4111-8111-111111111111",
    customerId: "22222222-2222-4222-8222-222222222222",
    customerName: "Maria Souza",
    customerPhone: "11999999999",
    customerMobilePhone: "11988888888",
    customerAddress: "Rua A, 10",
    userId: "33333333-3333-4333-8333-333333333333",
    userName: "Operador",
    totalAmountCents: 4200,
    paymentMethod: "CASH",
    status: "PENDING_DELIVERY",
    createdAt: "2026-06-24T10:00:00.000Z",
    canceledAt: null,
    cancellationReason: null,
    deliveredAt: null,
    deliveredByUserId: null,
    driverId: "44444444-4444-4444-8444-444444444444",
    driverName: "Joao Entregador",
    bottle: null,
    previousBottle: null,
  },
  items: [
    {
      id: "55555555-5555-4555-8555-555555555555",
      productId: "66666666-6666-4666-8666-666666666666",
      productNameSnapshot: "Galao 20L",
      quantity: 2,
      unitPriceCents: 2100,
      totalPriceCents: 4200,
      discountCents: null,
      finalUnitPriceCents: null,
    },
  ],
  bottleAlerts: { expired: false, mismatch: false },
};

describe("PrintRecibo", () => {
  it("renders product rows in the printable receipt", () => {
    const html = renderToStaticMarkup(createElement(PrintRecibo, { sale: saleDetail }));

    expect(html).toContain("Galao 20L");
    expect(html).toContain("2");
    expect(html).toContain("R$ 21,00");
    expect(html).toContain("R$ 42,00");
  });

  it("renders delivery customer data when the sale is pending delivery", () => {
    const html = renderToStaticMarkup(createElement(PrintRecibo, { sale: saleDetail }));

    expect(html).toContain("Maria Souza");
    expect(html).toContain("11999999999");
    expect(html).toContain("11988888888");
    expect(html).toContain("Rua A, 10");
    expect(html).toContain("Joao Entregador");
  });
});
