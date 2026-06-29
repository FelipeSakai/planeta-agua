import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { OperatorUserResponse } from "shared";

import { UsuariosUi } from "./usuarios-ui";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const users: OperatorUserResponse[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Operador Ativo",
    email: "op1@planetaagua.local",
    role: "OPERATOR",
    isActive: true,
    createdAt: "2026-06-29T00:00:00.000Z",
    updatedAt: "2026-06-29T00:00:00.000Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Operador Inativo",
    email: "op2@planetaagua.local",
    role: "OPERATOR",
    isActive: false,
    createdAt: "2026-06-29T00:00:00.000Z",
    updatedAt: "2026-06-29T00:00:00.000Z",
  },
];

describe("UsuariosUi", () => {
  it("renders operator management instead of the placeholder", () => {
    const html = renderToStaticMarkup(createElement(UsuariosUi, { users }));

    expect(html).toContain("Usuarios");
    expect(html).toContain("Novo operador");
    expect(html).toContain("Operador Ativo");
    expect(html).toContain("op1@planetaagua.local");
    expect(html).toContain("Ativo");
    expect(html).toContain("Operador Inativo");
    expect(html).toContain("Inativo");
    expect(html).toContain("Redefinir senha");
    expect(html).toContain("Editar");
    expect(html).not.toContain("Funcionalidade em preparacao");
  });
});
