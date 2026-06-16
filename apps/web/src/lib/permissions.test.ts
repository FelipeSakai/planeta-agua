import { describe, expect, it } from "vitest";

import { canAccessFinance, canCancelSale, canManageStock, canManageUsers } from "./permissions";

const admin = { role: "ADMIN" as const };
const operator = { role: "OPERATOR" as const };

describe("permissions", () => {
  it("allows admin sensitive actions", () => {
    expect(canAccessFinance(admin)).toBe(true);
    expect(canCancelSale(admin)).toBe(true);
    expect(canManageStock(admin)).toBe(true);
    expect(canManageUsers(admin)).toBe(true);
  });

  it("blocks operator sensitive actions", () => {
    expect(canAccessFinance(operator)).toBe(false);
    expect(canCancelSale(operator)).toBe(false);
    expect(canManageStock(operator)).toBe(false);
    expect(canManageUsers(operator)).toBe(false);
  });
});
