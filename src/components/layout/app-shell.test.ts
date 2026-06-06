import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AppShell, getVisibleNavigation } from "./app-shell";

vi.mock("@/features/auth/auth.actions", () => ({
  logoutAction: vi.fn(),
}));

describe("app shell navigation", () => {
  it("hides admin-only entries from operators", () => {
    const items = getVisibleNavigation("OPERATOR").map((item) => item.label);

    expect(items).toEqual(["Dashboard", "Vendas", "Produtos", "Clientes"]);
  });

  it("shows all entries to admins", () => {
    const items = getVisibleNavigation("ADMIN").map((item) => item.label);

    expect(items).toEqual(["Dashboard", "Vendas", "Produtos", "Clientes", "Estoque", "Financeiro", "Usuarios"]);
  });

  it("renders a server-side mobile navigation menu for operators", () => {
    const html = renderToStaticMarkup(
      AppShell({
        user: {
          id: "user-1",
          name: "Operador",
          email: "operador@planetaagua.local",
          role: "OPERATOR",
        },
        children: createElement("p", null, "Conteudo"),
      }),
    );

    expect(html).toContain("<details");
    expect(html).toContain("Menu");
    expect(html).toContain('href="/vendas"');
    expect(html).not.toContain('href="/financeiro"');
    expect(html).toContain("Sair");
  });
});
