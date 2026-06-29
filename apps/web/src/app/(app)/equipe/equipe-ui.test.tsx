import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EquipeUi } from "./equipe-ui";

describe("EquipeUi", () => {
  it("shows users and drivers as team sections for admins", () => {
    const html = renderToStaticMarkup(createElement(EquipeUi, { userRole: "ADMIN" }));

    expect(html).toContain("Equipe");
    expect(html).toContain("Usuarios");
    expect(html).toContain("Entregadores");
    expect(html).toContain('href="/usuarios"');
    expect(html).toContain('href="/entregadores"');
  });

  it("renders team actions as links without nested buttons", () => {
    const html = renderToStaticMarkup(createElement(EquipeUi, { userRole: "ADMIN" }));

    expect(html).toContain('href="/usuarios"');
    expect(html).toContain("inline-flex min-h-10 items-center justify-center");
    expect(html).not.toContain("<button");
  });

  it("shows drivers but not user management to operators", () => {
    const html = renderToStaticMarkup(createElement(EquipeUi, { userRole: "OPERATOR" }));

    expect(html).toContain("Entregadores");
    expect(html).not.toContain('href="/usuarios"');
  });
});
