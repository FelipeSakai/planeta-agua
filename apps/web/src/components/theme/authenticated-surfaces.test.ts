import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const authenticatedSurfaceFiles = [
  "src/app/(app)/vendas/sales-ui.tsx",
  "src/app/(app)/equipe/equipe-ui.tsx",
  "src/app/(app)/financeiro/resumo/summary-ui.tsx",
  "src/app/(app)/vendas/historico/history-ui.tsx",
  "src/app/(app)/usuarios/usuarios-ui.tsx",
];

describe("authenticated theme surfaces", () => {
  it("uses theme tokens instead of fixed white backgrounds", () => {
    for (const filePath of authenticatedSurfaceFiles) {
      const source = readFileSync(filePath, "utf8");

      expect(source, filePath).not.toMatch(/\bbg-white\b/);
    }
  });
});
