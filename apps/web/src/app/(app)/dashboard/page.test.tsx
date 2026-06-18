import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import DashboardPage from "./page";

describe("DashboardPage", () => {
  it("renders operational sections", () => {
    const html = renderToStaticMarkup(createElement(DashboardPage));

    expect(html).toContain("Resumo operacional");
    expect(html).toContain("Vendas hoje");
    expect(html).toContain("Faturamento hoje");
    expect(html).toContain("Alertas de estoque");
    expect(html).toContain("Atalhos operacionais");
  });
});
