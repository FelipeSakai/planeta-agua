import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { DashboardResponse, UserRole } from "shared";

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
  pendingDeliveries: [],
};

function render(role: UserRole, data: DashboardResponse = sampleData) {
  return renderToStaticMarkup(createElement(DashboardView, { data, userRole: role }));
}

describe("DashboardView", () => {
  it("renders the operational header", () => {
    const html = render("ADMIN");

    expect(html).toContain("Resumo operacional");
  });

  it("renders today revenue formatted in BRL", () => {
    const html = render("ADMIN");

    expect(html).toContain("Faturamento hoje");
    expect(html).toContain("R$ 125,90");
  });

  it("renders today sales count", () => {
    const html = render("ADMIN");

    expect(html).toContain("Vendas hoje");
    expect(html).toContain("3");
  });

  it("renders low stock count with warning tone when there are alerts", () => {
    const html = render("ADMIN");

    expect(html).toContain("Estoque baixo");
    expect(html).toContain("1");
  });

  it("renders low stock count with success tone when there are no alerts", () => {
    const html = render("ADMIN", emptyData);

    expect(html).toContain("Estoque baixo");
    expect(html).toContain("0");
  });

  it("renders totals by payment method", () => {
    const html = render("ADMIN");

    expect(html).toContain("Total por pagamento");
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

  it("shows the Nova venda shortcut linking to /vendas", () => {
    const html = render("ADMIN");

    expect(html).toContain("Nova venda");
    expect(html).toContain('href="/vendas"');
  });

  it("renders pending deliveries with a link to deliveries page", () => {
    const html = render("ADMIN");

    expect(html).toContain("Entregas pendentes");
    expect(html).toContain("Maria Souza");
    expect(html).toContain("Rua A, 10");
    expect(html).toContain('href="/entregas"');
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
