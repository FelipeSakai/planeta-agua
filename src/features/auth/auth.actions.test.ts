import { beforeEach, describe, expect, it, vi } from "vitest";

import { InvalidCredentialsError, login, logout } from "./auth.service";

const SESSION_COOKIE_NAME = "planeta_agua_session";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("@/lib/session", () => ({
  SESSION_COOKIE_NAME,
  isProduction: vi.fn(() => false),
}));

vi.mock("./auth.service", () => ({
  InvalidCredentialsError: class InvalidCredentialsError extends Error {
    constructor() {
      super("E-mail ou senha invalidos.");
      this.name = "InvalidCredentialsError";
    }
  },
  login: vi.fn(),
  logout: vi.fn(),
}));

const mockedLogin = vi.mocked(login);
const mockedLogout = vi.mocked(logout);

describe("auth actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a friendly error for invalid login input", async () => {
    const { loginAction } = await import("./auth.actions");
    const formData = new FormData();
    formData.set("email", "nao-e-email");

    await expect(loginAction({}, formData)).resolves.toEqual({ error: "Informe e-mail e senha." });
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  it("sets the session cookie before redirecting after login", async () => {
    const { cookies } = await import("next/headers");
    const { loginAction } = await import("./auth.actions");
    const expiresAt = new Date("2026-06-06T12:00:00.000Z");
    const setCookie = vi.fn();
    vi.mocked(cookies).mockResolvedValue({ set: setCookie } as never);
    mockedLogin.mockResolvedValue({ token: "plain-token", expiresAt });
    const formData = new FormData();
    formData.set("email", "operador@planetaagua.local");
    formData.set("password", "senha");

    await expect(loginAction({}, formData)).rejects.toThrow("redirect:/dashboard");
    expect(setCookie).toHaveBeenCalledWith(SESSION_COOKIE_NAME, "plain-token", {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      expires: expiresAt,
    });
  });

  it("returns the invalid credentials message from the service", async () => {
    const { loginAction } = await import("./auth.actions");
    mockedLogin.mockRejectedValue(new InvalidCredentialsError());
    const formData = new FormData();
    formData.set("email", "operador@planetaagua.local");
    formData.set("password", "senha");

    await expect(loginAction({}, formData)).resolves.toEqual({ error: "E-mail ou senha invalidos." });
  });

  it("logs out the existing session before redirecting to login", async () => {
    const { cookies } = await import("next/headers");
    const { logoutAction } = await import("./auth.actions");
    const deleteCookie = vi.fn();
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn(() => ({ value: "plain-token" })),
      delete: deleteCookie,
    } as never);

    await expect(logoutAction()).rejects.toThrow("redirect:/login");
    expect(mockedLogout).toHaveBeenCalledWith("plain-token");
    expect(deleteCookie).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
  });
});
