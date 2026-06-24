import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HistoryUi } from "./history-ui";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}));

afterEach(() => {
  vi.doUnmock("next/navigation");
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("HistoryUi", () => {
  const sampleSale = {
    id: "s1",
    customerId: null,
    customerName: "Maria",
    userId: "u1",
    userName: "Operador",
    totalAmountCents: 1800,
    paymentMethod: "PIX" as const,
    status: "PENDING_DELIVERY" as const,
    createdAt: "2026-06-19T10:00:00.000Z",
    canceledAt: null,
    cancellationReason: null,
    deliveredAt: null,
    deliveredByUserId: null,
    driverId: null,
    driverName: null,
  };

  it("renders filter tabs including pending delivery", () => {
    const html = renderToStaticMarkup(
      createElement(HistoryUi, { userRole: "OPERATOR", history: [sampleSale], activeFilter: "PENDING_DELIVERY" }),
    );

    expect(html).toContain("Pendentes de entrega");
    expect(html).toContain("Concluidas");
    expect(html).toContain("Canceladas");
  });

  it("renders confirm delivery action for pending delivery sales", () => {
    const html = renderToStaticMarkup(
      createElement(HistoryUi, { userRole: "OPERATOR", history: [sampleSale], activeFilter: "PENDING_DELIVERY" }),
    );

    expect(html).toContain("Confirmar entrega");
  });

  it("does not render confirm delivery for completed sales", () => {
    const completedSale = { ...sampleSale, status: "COMPLETED" as const };
    const html = renderToStaticMarkup(
      createElement(HistoryUi, { userRole: "OPERATOR", history: [completedSale], activeFilter: "COMPLETED" }),
    );

    expect(html).not.toContain("Confirmar entrega");
  });
});
