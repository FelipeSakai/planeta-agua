import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ExpenseResponse } from "shared";

import { ExpensesUi } from "./expenses-ui";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}));

const expenses: ExpenseResponse[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    description: "Marmita para equipa",
    amountCents: 4500,
    category: "MARMITA",
    paymentMethod: "CASH",
    date: "2026-06-21T10:00:00.000Z",
    createdBy: "22222222-2222-4222-8222-222222222222",
    isDeleted: false,
    createdAt: "2026-06-21T10:00:00.000Z",
    updatedAt: "2026-06-21T10:00:00.000Z",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    description: "Gasolina para entrega",
    amountCents: 8000,
    category: "GASOLINA",
    paymentMethod: "PIX",
    date: "2026-06-20T09:00:00.000Z",
    createdBy: "22222222-2222-4222-8222-222222222222",
    isDeleted: false,
    createdAt: "2026-06-20T09:00:00.000Z",
    updatedAt: "2026-06-20T09:00:00.000Z",
  },
];

describe("ExpensesUi", () => {
  it("renders Despesas title and Nova despesa button", () => {
    const html = renderToStaticMarkup(createElement(ExpensesUi, { expenses }));

    expect(html).toContain("Despesas");
    expect(html).toContain("Nova despesa");
  });

  it("renders the expense list with descriptions and values", () => {
    const html = renderToStaticMarkup(createElement(ExpensesUi, { expenses }));

    expect(html).toContain("Marmita para equipa");
    expect(html).toContain("Gasolina para entrega");
    expect(html).toContain("R$ 45,00");
    expect(html).toContain("R$ 80,00");
  });

  it("renders category and payment method labels for each expense", () => {
    const html = renderToStaticMarkup(createElement(ExpensesUi, { expenses }));

    expect(html).toContain("Marmita");
    expect(html).toContain("Gasolina");
    expect(html).toContain("Dinheiro");
    expect(html).toContain("Pix");
  });

  it("renders edit and delete actions for each expense", () => {
    const html = renderToStaticMarkup(createElement(ExpensesUi, { expenses }));

    expect(html).toContain('aria-label="Editar Marmita para equipa"');
    expect(html).toContain('aria-label="Excluir Marmita para equipa"');
    expect(html).toContain('aria-label="Editar Gasolina para entrega"');
    expect(html).toContain('aria-label="Excluir Gasolina para entrega"');
  });

  it("renders form fields inside the drawer when opened", async () => {
    const html = await renderExpensesWithDrawerOpen();

    expect(html).toContain('role="dialog"');
    expect(html).toContain("Nova despesa");
    expect(html).toContain("Fechar painel");
    expect(html).toContain("Descricao");
    expect(html).toContain("Valor");
    expect(html).toContain("Categoria");
    expect(html).toContain("Pagamento");
    expect(html).toContain("Data");
  });

  it("renders an empty state when there are no expenses", () => {
    const html = renderToStaticMarkup(createElement(ExpensesUi, { expenses: [] }));

    expect(html).toContain("Nenhuma despesa registrada");
  });
});

async function renderExpensesWithDrawerOpen() {
  vi.resetModules();
  vi.doMock("react", async (importOriginal) => {
    const actual = await importOriginal<typeof import("react")>();
    let stateIndex = 0;

    return {
      ...actual,
      useState: vi.fn((initialValue) => {
        const currentIndex = stateIndex;
        stateIndex += 1;

        if (currentIndex === 1) {
          return [true, vi.fn()];
        }

        return [initialValue, vi.fn()];
      }),
    };
  });
  vi.doMock("next/navigation", () => ({
    useRouter: vi.fn(() => ({ refresh: vi.fn() })),
  }));

  const { ExpensesUi: DrawerExpensesUi } = await import("./expenses-ui");
  const html = renderToStaticMarkup(createElement(DrawerExpensesUi, { expenses }));

  vi.doUnmock("react");
  vi.doUnmock("next/navigation");

  return html;
}
