import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { FinanceSummaryResponse } from "shared";

import { SummaryUi } from "./summary-ui";

const summary: FinanceSummaryResponse = {
  totalRevenueCents: 95000,
  totalExpensesCents: 32000,
  balanceCents: 63000,
  totalsByPaymentMethod: [
    { method: "CASH", revenueCents: 55000, expensesCents: 12000, balanceCents: 43000 },
    { method: "PIX", revenueCents: 40000, expensesCents: 20000, balanceCents: 20000 },
  ],
};

const today = "2026-06-21";

describe("SummaryUi", () => {
  it("renders the Resumo financeiro title", () => {
    const html = renderToStaticMarkup(
      createElement(SummaryUi, { summary, startDate: today, endDate: today }),
    );

    expect(html).toContain("Resumo financeiro");
  });

  it("renders Entradas, Saidas and Saldo metric cards", () => {
    const html = renderToStaticMarkup(
      createElement(SummaryUi, { summary, startDate: today, endDate: today }),
    );

    expect(html).toContain("Entradas");
    expect(html).toContain("Saidas");
    expect(html).toContain("Saldo");
  });

  it("renders formatted totals for revenue, expenses and balance", () => {
    const html = renderToStaticMarkup(
      createElement(SummaryUi, { summary, startDate: today, endDate: today }),
    );

    expect(html).toContain("R$ 950,00");
    expect(html).toContain("R$ 320,00");
    expect(html).toContain("R$ 630,00");
  });

  it("renders totals by payment method with labels and values", () => {
    const html = renderToStaticMarkup(
      createElement(SummaryUi, { summary, startDate: today, endDate: today }),
    );

    expect(html).toContain("Dinheiro");
    expect(html).toContain("Pix");
    expect(html).toContain("R$ 550,00");
    expect(html).toContain("R$ 400,00");
    expect(html).toContain("R$ 120,00");
    expect(html).toContain("R$ 430,00");
  });

  it("renders period filter links Hoje, Semana and Mes", () => {
    const html = renderToStaticMarkup(
      createElement(SummaryUi, { summary, startDate: today, endDate: today }),
    );

    expect(html).toContain("Hoje");
    expect(html).toContain("Semana");
    expect(html).toContain("Mes");
    expect(html).toContain("/financeiro/resumo");
  });

  it("marks the active period filter with aria-current", () => {
    const html = renderToStaticMarkup(
      createElement(SummaryUi, { summary, startDate: today, endDate: today }),
    );

    expect(html).toContain('aria-current="page"');
  });

  it("renders positive balance with success tone", () => {
    const html = renderToStaticMarkup(
      createElement(SummaryUi, { summary, startDate: today, endDate: today }),
    );

    expect(html).toContain("OK");
  });

  it("renders negative balance with danger tone", () => {
    const negativeSummary: FinanceSummaryResponse = {
      totalRevenueCents: 30000,
      totalExpensesCents: 50000,
      balanceCents: -20000,
      totalsByPaymentMethod: [],
    };
    const html = renderToStaticMarkup(
      createElement(SummaryUi, { summary: negativeSummary, startDate: today, endDate: today }),
    );

    expect(html).toContain("Crítico");
  });

  it("renders an empty state when there are no payment method totals", () => {
    const emptySummary: FinanceSummaryResponse = {
      totalRevenueCents: 0,
      totalExpensesCents: 0,
      balanceCents: 0,
      totalsByPaymentMethod: [],
    };
    const html = renderToStaticMarkup(
      createElement(SummaryUi, { summary: emptySummary, startDate: today, endDate: today }),
    );

    expect(html).toContain("Nenhum movimento no periodo");
  });
});
