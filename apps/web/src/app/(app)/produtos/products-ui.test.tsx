import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ProductsUi } from "./products-ui";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}));

const products = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Galao 20L",
    description: null,
    salePriceCents: 1200,
    stockQuantity: 2,
    minimumStock: 3,
    isActive: true,
    isLowStock: true,
    createdAt: "2026-06-15T00:00:00.000Z",
    updatedAt: "2026-06-15T00:00:00.000Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Fardo 12x500ml",
    description: null,
    salePriceCents: 1800,
    stockQuantity: 10,
    minimumStock: 3,
    isActive: false,
    isLowStock: false,
    createdAt: "2026-06-15T00:00:00.000Z",
    updatedAt: "2026-06-15T00:00:00.000Z",
  },
];

describe("ProductsUi", () => {
  it("hides mutation controls from operators", () => {
    const html = renderToStaticMarkup(
      createElement(ProductsUi, {
        userRole: "OPERATOR",
        products,
        summary: { total: 2, active: 1, lowStock: 1 },
      }),
    );

    expect(html).toContain("Galao 20L");
    expect(html).toContain("Estoque baixo");
    expect(html).not.toContain("Novo produto");
    expect(html).not.toContain("Editar");
    expect(html).not.toContain("Inativar");
    expect(html).not.toContain("Ativar");
  });

  it("shows mutation controls to admins", () => {
    const html = renderToStaticMarkup(
      createElement(ProductsUi, {
        userRole: "ADMIN",
        products,
        summary: { total: 2, active: 1, lowStock: 1 },
      }),
    );

    expect(html).toContain("Novo produto");
    expect(html).toContain("Editar");
    expect(html).toContain("Inativar");
    expect(html).toContain("Ativar");
  });

  it("renders dense product controls and table labels", () => {
    const html = renderToStaticMarkup(
      createElement(ProductsUi, {
        userRole: "ADMIN",
        products,
        summary: { total: 2, active: 1, lowStock: 1 },
      }),
    );

    expect(html).toContain("Buscar produto");
    expect(html).toContain("Status");
    expect(html).toContain("Produto");
    expect(html).toContain("Preço");
    expect(html).toContain("Estoque");
    expect(html).toContain("Ações");
  });
});
