import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { CashRegisterDetailsResponse, DashboardResponse, UserRole } from "shared";

import { DashboardView } from "./page";

const sampleData: DashboardResponse = {
  todayRevenueCents: 12590,
  todaySalesCount: 3,
  totalsByPaymentMethod: [
    { method: "CASH", salesCount: 1, amountCents: 4200 },
    { method: "PIX", salesCount: 2, amountCents: 8390 },
  ],
  lowStockProducts: [
    { id: "p1", name: "Garrafa 20L", stockQuantity: 2, minimumStock: 5 },
  ],
  recentSales: [
    {
      id: "s1",
      customerName: "Maria Souza",
      totalAmountCents: 4200,
      paymentMethod: "CASH",
      status: "COMPLETED",
      createdAt: "2026-06-20T10:00:00.000Z",
    },
    {
      id: "s2",
      customerName: null,
      totalAmountCents: 8390,
      paymentMethod: "PIX",
      status: "COMPLETED",
      createdAt: "2026-06-20T11:30:00.000Z",
    },
  ],
  pendingDeliveriesTotal: 12,
  pendingDeliveries: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      customerName: "Maria Souza",
      customerPhone: "11999999999",
      customerAddress: "Rua A, 10",
      driverName: "Joao",
      totalAmountCents: 4200,
      paymentMethod: "CASH",
      createdAt: "2026-06-20T12:00:00.000Z",
    },
  ],
};

const emptyData: DashboardResponse = {
  todayRevenueCents: 0,
  todaySalesCount: 0,
  totalsByPaymentMethod: [],
  lowStockProducts: [],
  recentSales: [],
  pendingDeliveriesTotal: 0,
  pendingDeliveries: [],
};

const cashDetails: CashRegisterDetailsResponse = {
  cashRegister: {
    id: "33333333-3333-4333-8333-333333333333",
    date: "2026-06-24",
    openingBalanceCents: 5000,
    openedAt: "2026-06-24T08:00:00.000Z",
    openedByUserId: "11111111-1111-4111-8111-111111111111",
    closedAt: null,
    closedByUserId: null,
    counts: {},
  },
  todaySales: [],
  todayExpenses: [],
  totalsByPaymentMethod: [
    { method: "CASH", salesCents: 4200, expensesCents: 1000 },
    { method: "PIX", salesCents: 8390, expensesCents: 0 },
  ],
  totalSalesCents: 12590,
  totalExpensesCents: 1000,
  expectedCashCents: 8200,
};

function render(role: UserRole, data: DashboardResponse = sampleData, details: CashRegisterDetailsResponse | null = cashDetails) {
  return renderToStaticMarkup(createElement(DashboardView, { data, userRole: role, userName: "Operador", cashDetails: details }));
}

describe("DashboardView", () => {
  it("renders the daily workbench greeting and dominant sale action", () => {
    const html = render("ADMIN");

    expect(html).toContain("Bom dia, Operador");
    expect(html).toContain("Comecar venda");
    expect(html).toContain('href="/vendas"');
  });

  it("keeps operational secondary actions visible near the top", () => {
    const html = render("ADMIN");

    expect(html).toContain("Ver entregas");
    expect(html).toContain("Ver caixa");
    expect(html).toContain("Produtos");
  });

  it("renders payment distribution as simple CSS bars", () => {
    const html = render("ADMIN");

    expect(html).toContain("Resumo por pagamento");
    expect(html).toContain("payment-bar");
  });

  it("renders the operational header", () => {
    const html = render("ADMIN");

    expect(html).toContain("Pronto para vender");
  });

  it("uses tokenized hero colors instead of foreground-as-background", () => {
    const html = render("ADMIN");

    expect(html).toContain("bg-[var(--hero-surface)]");
    expect(html).not.toContain("bg-[var(--foreground)]");
  });

  it("keeps the sale CTA dominant in the top workbench", () => {
    const html = render("ADMIN");

    expect(html).toContain('href="/vendas"');
    expect(html).toContain("Comecar venda");
    expect(html).toContain("bg-[var(--hero-action)]");
    expect(html).toContain("text-[var(--hero-action-foreground)]");
    expect(html).not.toContain("bg-[var(--surface-raised)]");
  });

  it("renders today revenue formatted in BRL", () => {
    const html = render("ADMIN");

    expect(html).toContain("R$ 125,90");
  });

  it("renders today sales count", () => {
    const html = render("ADMIN");

    expect(html).toContain("Vendas hoje");
    expect(html).toContain("3");
  });

  it("shows cash register status in the first dashboard fold", () => {
    const html = render("ADMIN");

    expect(html).toContain("Caixa de hoje");
    expect(html).toContain("Aberto");
    expect(html).toContain("R$ 125,90");
    expect(html).toContain("Saldo esperado");
    expect(html).toContain("R$ 82,00");
  });

  it("renders low stock count with warning tone when there are alerts", () => {
    const html = render("ADMIN");

    expect(html).toContain("Estoque critico");
    expect(html).toContain("1");
  });

  it("renders low stock count with success tone when there are no alerts", () => {
    const html = render("ADMIN", emptyData);

    expect(html).toContain("Estoque critico");
    expect(html).toContain("0");
  });

  it("renders totals by payment method", () => {
    const html = render("ADMIN");

    expect(html).toContain("Resumo por pagamento");
    expect(html).toContain("Dinheiro");
    expect(html).toContain("Pix");
    expect(html).toContain("R$ 42,00");
    expect(html).toContain("R$ 83,90");
  });

  it("renders low stock products panel with the product name", () => {
    const html = render("ADMIN");

    expect(html).toContain("Garrafa 20L");
  });

  it("renders an empty state when there are no low stock products", () => {
    const html = render("ADMIN", emptyData);

    expect(html).toContain("Nenhum produto abaixo do minimo");
  });

  it("renders recent sales with customer and total", () => {
    const html = render("ADMIN");

    expect(html).toContain("Ultimas vendas");
    expect(html).toContain("Maria Souza");
    expect(html).toContain("R$ 42,00");
  });

  it("renders an empty state when there are no recent sales", () => {
    const html = render("ADMIN", emptyData);

    expect(html).toContain("Nenhuma venda registrada hoje");
  });

  it("shows the sale action linking to /vendas", () => {
    const html = render("ADMIN");

    expect(html).toContain("Comecar venda");
    expect(html).toContain('href="/vendas"');
  });

  it("renders the sale action as a styled link without a nested button", () => {
    const html = render("ADMIN");
    const saleAction = html.match(/<a[^>]+href="\/vendas"[^>]*>.*?Comecar venda.*?<\/a>/)?.[0] ?? "";

    expect(saleAction).toContain("Comecar venda");
    expect(saleAction).toContain("inline-flex");
    expect(saleAction).not.toContain("<button");
  });

  it("renders pending deliveries with a link to deliveries page", () => {
    const html = render("ADMIN");

    expect(html).toContain("Entregas pendentes");
    expect(html).toContain("Maria Souza");
    expect(html).toContain("Rua A, 10");
    expect(html).toContain('href="/entregas"');
  });

  it("shows the total pending delivery count instead of the capped list length", () => {
    const html = render("ADMIN");

    expect(html).toContain("12");
  });

  it("shows stock shortcut for admins", () => {
    const html = render("ADMIN");

    expect(html).toContain('href="/estoque"');
  });

  it("hides stock shortcut from operators", () => {
    const html = render("OPERATOR");

    expect(html).not.toContain('href="/estoque"');
  });
});
