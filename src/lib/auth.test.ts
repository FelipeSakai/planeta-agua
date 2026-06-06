import { beforeEach, describe, expect, it, vi } from "vitest";

import { getUserBySessionToken } from "@/features/auth/auth.service";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("@/features/auth/auth.service", () => ({
  getUserBySessionToken: vi.fn(),
}));

const mockedGetUserBySessionToken = vi.mocked(getUserBySessionToken);

describe("auth guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when there is no session cookie", async () => {
    const { cookies } = await import("next/headers");
    const { getCurrentUser } = await import("./auth");
    vi.mocked(cookies).mockResolvedValue({ get: vi.fn() } as never);

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(mockedGetUserBySessionToken).not.toHaveBeenCalled();
  });

  it("maps the session user without exposing password fields", async () => {
    const { cookies } = await import("next/headers");
    const { getCurrentUser } = await import("./auth");
    vi.mocked(cookies).mockResolvedValue({ get: vi.fn(() => ({ value: "plain-token" })) } as never);
    mockedGetUserBySessionToken.mockResolvedValue({
      id: "user-1",
      name: "Operador",
      email: "operador@planetaagua.local",
      passwordHash: "stored-hash",
      role: "OPERATOR",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(getCurrentUser()).resolves.toEqual({
      id: "user-1",
      name: "Operador",
      email: "operador@planetaagua.local",
      role: "OPERATOR",
    });
  });

  it("redirects unauthenticated users to login", async () => {
    const { cookies } = await import("next/headers");
    const { requireUser } = await import("./auth");
    vi.mocked(cookies).mockResolvedValue({ get: vi.fn() } as never);

    await expect(requireUser()).rejects.toThrow("redirect:/login");
  });

  it("redirects users without the required role to dashboard", async () => {
    const { cookies } = await import("next/headers");
    const { requireRole } = await import("./auth");
    vi.mocked(cookies).mockResolvedValue({ get: vi.fn(() => ({ value: "plain-token" })) } as never);
    mockedGetUserBySessionToken.mockResolvedValue({
      id: "user-1",
      name: "Operador",
      email: "operador@planetaagua.local",
      passwordHash: "stored-hash",
      role: "OPERATOR",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(requireRole(["ADMIN"])).rejects.toThrow("redirect:/dashboard");
  });
});
