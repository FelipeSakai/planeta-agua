import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DashboardView } from "./page";

describe("DashboardPage", () => {
  it("renders operational sections", () => {
    const html = renderToStaticMarkup(createElement(DashboardView, { userRole: "ADMIN" }));

    expect(html).toContain("Resumo operacional");
    expect(html).toContain("Vendas hoje");
    expect(html).toContain("Faturamento hoje");
    expect(html).toContain("Alertas de estoque");
    expect(html).toContain("Atalhos operacionais");
  });

  it("shows the stock shortcut for admins", () => {
    const html = renderToStaticMarkup(createElement(DashboardView, { userRole: "ADMIN" }));

    expect(html).toContain('action="/vendas"');
    expect(html).toContain('action="/produtos"');
    expect(html).toContain('action="/estoque"');
  });

  it("hides the stock shortcut from operators", () => {
    const html = renderToStaticMarkup(createElement(DashboardView, { userRole: "OPERATOR" }));

    expect(html).toContain('action="/vendas"');
    expect(html).toContain('action="/produtos"');
    expect(html).not.toContain('action="/estoque"');
  });
});
