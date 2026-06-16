import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("./api", () => ({
  getServerApiUrl: vi.fn(() => "http://api.local"),
}));

const mockedFetch = vi.fn();
vi.stubGlobal("fetch", mockedFetch);

describe("auth guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when there is no session cookie", async () => {
    const { cookies } = await import("next/headers");
    const { getCurrentUser } = await import("./auth");
    vi.mocked(cookies).mockResolvedValue({ getAll: vi.fn(() => []) } as never);

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("fetches the current user from the API with forwarded cookies", async () => {
    const { cookies } = await import("next/headers");
    const { getCurrentUser } = await import("./auth");
    const user = {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Operador",
      email: "operador@planetaagua.local",
      role: "OPERATOR" as const,
    };

    vi.mocked(cookies).mockResolvedValue({
      getAll: vi.fn(() => [
        { name: "pa_session", value: "plain-token" },
        { name: "theme", value: "light" },
      ]),
    } as never);
    mockedFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ user }),
    });

    await expect(getCurrentUser()).resolves.toEqual(user);
    expect(mockedFetch).toHaveBeenCalledWith("http://api.local/auth/me", {
      headers: { cookie: "pa_session=plain-token; theme=light" },
      cache: "no-store",
    });
  });

  it("returns null when the API rejects the session", async () => {
    const { cookies } = await import("next/headers");
    const { getCurrentUser } = await import("./auth");
    vi.mocked(cookies).mockResolvedValue({ getAll: vi.fn(() => [{ name: "pa_session", value: "expired" }]) } as never);
    mockedFetch.mockResolvedValue({ ok: false });

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("returns null when the API is unavailable", async () => {
    const { cookies } = await import("next/headers");
    const { getCurrentUser } = await import("./auth");
    vi.mocked(cookies).mockResolvedValue({ getAll: vi.fn(() => [{ name: "pa_session", value: "plain-token" }]) } as never);
    mockedFetch.mockRejectedValue(new Error("network error"));

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("redirects unauthenticated users to login", async () => {
    const { cookies } = await import("next/headers");
    const { requireUser } = await import("./auth");
    vi.mocked(cookies).mockResolvedValue({ getAll: vi.fn(() => []) } as never);

    await expect(requireUser()).rejects.toThrow("redirect:/login");
  });

  it("redirects users without the required role to dashboard", async () => {
    const { cookies } = await import("next/headers");
    const { requireRole } = await import("./auth");
    vi.mocked(cookies).mockResolvedValue({ getAll: vi.fn(() => [{ name: "pa_session", value: "plain-token" }]) } as never);
    mockedFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        user: {
          id: "00000000-0000-4000-8000-000000000001",
          name: "Operador",
          email: "operador@planetaagua.local",
          role: "OPERATOR",
        },
      }),
    });

    await expect(requireRole(["ADMIN"])).rejects.toThrow("redirect:/dashboard");
  });
});
