import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AppShell, getNavigationItems, getVisibleNavigation } from "./app-shell";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/vendas"),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();

  return {
    ...actual,
    useTransition: vi.fn(() => [false, vi.fn()]),
  };
});

describe("app shell navigation", () => {
  it("marks the current route active", () => {
    const items = getNavigationItems("ADMIN", "/estoque");

    expect(items.find((item) => item.href === "/estoque")?.isActive).toBe(true);
    expect(items.find((item) => item.href === "/produtos")?.isActive).toBe(false);
  });

  it("marks team child routes under Equipe", () => {
    const driverItems = getNavigationItems("OPERATOR", "/entregadores");
    const userItems = getNavigationItems("ADMIN", "/usuarios");

    expect(driverItems.find((item) => item.href === "/equipe")?.isActive).toBe(true);
    expect(userItems.find((item) => item.href === "/equipe")?.isActive).toBe(true);
  });

  it("keeps admin-only modules hidden from operators", () => {
    const items = getNavigationItems("OPERATOR", "/caixa");

    expect(items.map((item) => item.href)).not.toContain("/usuarios");
    expect(items.map((item) => item.href)).not.toContain("/estoque");
    expect(items.map((item) => item.href)).toContain("/caixa");
    expect(items.map((item) => item.href)).toContain("/financeiro/despesas");
    expect(items.map((item) => item.href)).toContain("/produtos");
  });

  it("hides admin-only entries from operators", () => {
    const items = getVisibleNavigation("OPERATOR").map((item) => item.label);

    expect(items).toEqual(["Dashboard", "Nova Venda", "Historico", "Entregas", "Caixa", "Produtos", "Clientes", "Equipe", "Financeiro"]);
  });

  it("shows all entries to admins", () => {
    const items = getVisibleNavigation("ADMIN").map((item) => item.label);

    expect(items).toEqual(["Dashboard", "Nova Venda", "Historico", "Entregas", "Caixa", "Produtos", "Clientes", "Equipe", "Estoque", "Financeiro"]);
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
    expect(html).toContain('href="/caixa"');
    expect(html).toContain('href="/financeiro/despesas"');
    expect(html).not.toContain('href="/usuarios"');
    expect(html).toContain("Sair");
  });

  it("respects reduced motion for shell transitions", () => {
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

    expect(html).toContain("motion-reduce:transition-none");
  });

  it("renders logout with the shared button structure", () => {
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

    expect(html).toContain("inline-flex min-h-10 items-center justify-center");
  });
});
