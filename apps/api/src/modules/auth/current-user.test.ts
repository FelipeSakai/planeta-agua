import { UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { describe, expect, it, vi } from "vitest";

import { requireRequestUser } from "./current-user";
import { SESSION_COOKIE_NAME } from "./session";

describe("requireRequestUser", () => {
  it("throws when the session cookie is missing", async () => {
    const authService = { getUserByToken: vi.fn() };

    await expect(requireRequestUser({ cookies: {} } as Request, authService as never)).rejects.toThrow(
      new UnauthorizedException("Sessao invalida."),
    );
    expect(authService.getUserByToken).not.toHaveBeenCalled();
  });

  it("throws when the session token is invalid", async () => {
    const authService = { getUserByToken: vi.fn(async () => null) };

    await expect(
      requireRequestUser({ cookies: { [SESSION_COOKIE_NAME]: "invalid" } } as unknown as Request, authService as never),
    ).rejects.toThrow(new UnauthorizedException("Sessao invalida."));
  });

  it("returns the authenticated user", async () => {
    const user = { id: "user-id", name: "Admin", email: "admin@example.com", role: "ADMIN" };
    const authService = { getUserByToken: vi.fn(async () => user) };

    await expect(
      requireRequestUser({ cookies: { [SESSION_COOKIE_NAME]: "valid" } } as unknown as Request, authService as never),
    ).resolves.toBe(user);
    expect(authService.getUserByToken).toHaveBeenCalledWith("valid");
  });
});
