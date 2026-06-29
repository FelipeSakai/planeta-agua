import { describe, expect, it } from "vitest";

import {
  createOperatorUserSchema,
  operatorUserResponseSchema,
  operatorUsersListResponseSchema,
  resetOperatorPasswordSchema,
} from "./users";

describe("operator user schemas", () => {
  it("validates operator creation input", () => {
    const parsed = createOperatorUserSchema.parse({
      name: "Operador",
      email: "op@planetaagua.local",
      password: "senha123",
    });

    expect(parsed).toEqual({
      name: "Operador",
      email: "op@planetaagua.local",
      password: "senha123",
    });
  });

  it("rejects short passwords", () => {
    expect(() =>
      createOperatorUserSchema.parse({
        name: "Operador",
        email: "op@planetaagua.local",
        password: "1234567",
      }),
    ).toThrow();
    expect(() => resetOperatorPasswordSchema.parse({ password: "1234567" })).toThrow();
  });

  it("does not allow password hash in responses", () => {
    const response = operatorUserResponseSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Operador",
      email: "op@planetaagua.local",
      role: "OPERATOR",
      isActive: true,
      createdAt: "2026-06-29T00:00:00.000Z",
      updatedAt: "2026-06-29T00:00:00.000Z",
      passwordHash: "secret",
    });

    expect(response).not.toHaveProperty("passwordHash");
  });

  it("validates list responses", () => {
    const response = operatorUsersListResponseSchema.parse({
      users: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Operador",
          email: "op@planetaagua.local",
          role: "OPERATOR",
          isActive: false,
          createdAt: "2026-06-29T00:00:00.000Z",
          updatedAt: "2026-06-29T00:00:00.000Z",
        },
      ],
    });

    expect(response.users).toHaveLength(1);
  });
});
