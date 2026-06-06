import { describe, expect, it } from "vitest";

import { adminSeedSchema, loginSchema } from "./auth.schemas";

describe("auth schemas", () => {
  it("validates login input", () => {
    const parsed = loginSchema.parse({
      email: "operador@planetaagua.local",
      password: "senha",
    });

    expect(parsed).toEqual({
      email: "operador@planetaagua.local",
      password: "senha",
    });
  });

  it("rejects empty login password", () => {
    expect(() =>
      loginSchema.parse({
        email: "operador@planetaagua.local",
        password: "",
      }),
    ).toThrow();
  });

  it("requires at least eight characters for admin seed password", () => {
    expect(() =>
      adminSeedSchema.parse({
        name: "Administrador",
        email: "admin@planetaagua.local",
        password: "curta",
      }),
    ).toThrow();
  });
});
