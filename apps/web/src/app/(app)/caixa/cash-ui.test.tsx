import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CashUi, type CashUiProps } from "./cash-ui";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}));

afterEach(() => {
  vi.doUnmock("next/navigation");
  vi.unstubAllGlobals();
  vi.resetModules();
});

const openCashRegister: CashUiProps["cashRegister"] = {
  id: "11111111-1111-4111-8111-111111111111",
  date: "2026-06-21",
  openingBalanceCents: 5000,
  openedAt: "2026-06-21T10:00:00.000Z",
  openedByUserId: "22222222-2222-4222-8222-222222222222",
  closedAt: null,
  closedByUserId: null,
  counts: {},
};

const closedCashRegister: CashUiProps["cashRegister"] = {
  ...openCashRegister,
  closedAt: "2026-06-21T18:00:00.000Z",
  closedByUserId: "33333333-3333-4333-8333-333333333333",
  counts: {
    CASH: { expected: 15000, counted: 14500, difference: -500 },
    PIX: { expected: 8000, counted: 8000, difference: 0 },
    DEBIT_CARD: { expected: 0, counted: 0, difference: 0 },
    CREDIT_CARD: { expected: 0, counted: 0, difference: 0 },
    OTHER: { expected: 0, counted: 0, difference: 0 },
  },
};

const summary: CashUiProps["summary"] = [
  { method: "CASH", salesCents: 12000, expensesCents: 2000, expectedCents: 15000 },
  { method: "PIX", salesCents: 8000, expensesCents: 0, expectedCents: 8000 },
  { method: "DEBIT_CARD", salesCents: 0, expensesCents: 0, expectedCents: 0 },
  { method: "CREDIT_CARD", salesCents: 0, expensesCents: 0, expectedCents: 0 },
  { method: "OTHER", salesCents: 0, expensesCents: 0, expectedCents: 0 },
];

describe("CashUi", () => {
  it("renders Caixa de hoje and Fundo de caixa", () => {
    const html = renderToStaticMarkup(
      createElement(CashUi, { cashRegister: openCashRegister, summary }),
    );

    expect(html).toContain("Caixa de hoje");
    expect(html).toContain("Fundo de caixa");
  });

  it("renders Fechar caixa when the register is open", () => {
    const html = renderToStaticMarkup(
      createElement(CashUi, { cashRegister: openCashRegister, summary }),
    );

    expect(html).toContain("Fechar caixa");
  });

  it("does not render Fechar caixa when the register is closed", () => {
    const html = renderToStaticMarkup(
      createElement(CashUi, { cashRegister: closedCashRegister, summary }),
    );

    expect(html).not.toContain("Fechar caixa");
  });

  it("renders totals by payment method", () => {
    const html = renderToStaticMarkup(
      createElement(CashUi, { cashRegister: openCashRegister, summary }),
    );

    expect(html).toContain("Dinheiro");
    expect(html).toContain("Pix");
    expect(html).toContain("Debito");
    expect(html).toContain("Credito");
    expect(html).toContain("Outro");
  });

  it("renders the opening balance value", () => {
    const html = renderToStaticMarkup(
      createElement(CashUi, { cashRegister: openCashRegister, summary }),
    );

    expect(html).toContain("R$ 50,00");
  });

  it("renders read-only counts when the register is closed", () => {
    const html = renderToStaticMarkup(
      createElement(CashUi, { cashRegister: closedCashRegister, summary }),
    );

    expect(html).toContain("R$ 145,00");
    expect(html).toContain("R$ 80,00");
  });
});
