import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { UsuariosUi } from "./usuarios-ui";

describe("UsuariosUi", () => {
  it("renders an admin-only placeholder without user management actions", () => {
    const html = renderToStaticMarkup(createElement(UsuariosUi));

    expect(html).toContain("Usuarios");
    expect(html).toContain("Funcionalidade em preparacao");
    expect(html).toContain("Somente administradores podem acessar esta area");
    expect(html).toContain('href="/equipe"');
    expect(html).not.toContain("Novo usuario");
  });
});
