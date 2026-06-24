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

const openCashRegister = {
  id: "11111111-1111-4111-8111-111111111111",
  date: "2026-06-21",
  openingBalanceCents: 5000,
  openedAt: "2026-06-21T10:00:00.000Z",
  openedByUserId: "22222222-2222-4222-8222-222222222222",
  closedAt: null,
  closedByUserId: null,
  counts: {},
};

const closedCashRegister = {
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

const totalsByPaymentMethod = [
  { method: "CASH", salesCents: 12000, expensesCents: 2000 },
  { method: "PIX", salesCents: 8000, expensesCents: 0 },
  { method: "DEBIT_CARD", salesCents: 0, expensesCents: 0 },
  { method: "CREDIT_CARD", salesCents: 0, expensesCents: 0 },
  { method: "OTHER", salesCents: 0, expensesCents: 0 },
] as const;

const todaySales = [
  {
    id: "44444444-4444-4444-8444-444444444444",
    customerName: "Cliente Teste",
    totalAmountCents: 12000,
    paymentMethod: "CASH",
    createdAt: "2026-06-21T11:00:00.000Z",
  },
  {
    id: "55555555-5555-5555-8555-555555555555",
    customerName: null,
    totalAmountCents: 8000,
    paymentMethod: "PIX",
    createdAt: "2026-06-21T12:00:00.000Z",
  },
] as const;

const todayExpenses = [
  {
    id: "66666666-6666-6666-8666-666666666666",
    description: "Gasolina",
    amountCents: 2000,
    paymentMethod: "CASH",
    category: "GASOLINA",
  },
] as const;

function buildDetails(
  cashRegister: CashUiProps["details"]["cashRegister"],
): CashUiProps["details"] {
  return {
    cashRegister,
    todaySales: [...todaySales],
    todayExpenses: [...todayExpenses],
    totalsByPaymentMethod: [...totalsByPaymentMethod],
    totalSalesCents: 20000,
    totalExpensesCents: 2000,
    expectedCashCents: 15000,
  };
}

describe("CashUi", () => {
  it("renders Caixa de hoje and Fundo de caixa", () => {
    const html = renderToStaticMarkup(
      createElement(CashUi, { details: buildDetails(openCashRegister) }),
    );

    expect(html).toContain("Caixa de hoje");
    expect(html).toContain("Fundo de caixa");
  });

  it("renders Fechar caixa when the register is open", () => {
    const html = renderToStaticMarkup(
      createElement(CashUi, { details: buildDetails(openCashRegister) }),
    );

    expect(html).toContain("Fechar caixa");
  });

  it("does not render Fechar caixa when the register is closed", () => {
    const html = renderToStaticMarkup(
      createElement(CashUi, { details: buildDetails(closedCashRegister) }),
    );

    expect(html).not.toContain("Fechar caixa");
  });

  it("renders totals by payment method", () => {
    const html = renderToStaticMarkup(
      createElement(CashUi, { details: buildDetails(openCashRegister) }),
    );

    expect(html).toContain("Dinheiro");
    expect(html).toContain("Pix");
    expect(html).toContain("Debito");
    expect(html).toContain("Credito");
    expect(html).toContain("Outro");
  });

  it("renders the opening balance value", () => {
    const html = renderToStaticMarkup(
      createElement(CashUi, { details: buildDetails(openCashRegister) }),
    );

    expect(html).toContain("R$ 50,00");
  });

  it("renders read-only counts when the register is closed", () => {
    const html = renderToStaticMarkup(
      createElement(CashUi, { details: buildDetails(closedCashRegister) }),
    );

    expect(html).toContain("R$ 145,00");
    expect(html).toContain("R$ 80,00");
  });

  it("renders daily totals metric cards", () => {
    const html = renderToStaticMarkup(
      createElement(CashUi, { details: buildDetails(openCashRegister) }),
    );

    expect(html).toContain("Total Vendas");
    expect(html).toContain("Total Despesas");
    expect(html).toContain("Saldo Esperado");
    expect(html).toContain("R$ 200,00");
    expect(html).toContain("R$ 20,00");
    expect(html).toContain("R$ 150,00");
  });

  it("renders sales of the day table", () => {
    const html = renderToStaticMarkup(
      createElement(CashUi, { details: buildDetails(openCashRegister) }),
    );

    expect(html).toContain("Vendas do dia");
    expect(html).toContain("Cliente Teste");
    expect(html).toContain("Horario");
  });

  it("renders expenses of the day table", () => {
    const html = renderToStaticMarkup(
      createElement(CashUi, { details: buildDetails(openCashRegister) }),
    );

    expect(html).toContain("Despesas do dia");
    expect(html).toContain("Gasolina");
    expect(html).toContain("Descricao");
  });

  it("renders not-opened message when cash register is null", () => {
    const html = renderToStaticMarkup(
      createElement(CashUi, { details: buildDetails(null) }),
    );

    expect(html).toContain("Nao aberto");
    expect(html).toContain("O caixa abre na primeira venda do dia");
    expect(html).not.toContain("Fechar caixa");
  });
});
