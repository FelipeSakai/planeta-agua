import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();

  return {
    ...actual,
    useState: vi.fn(),
    useTransition: vi.fn(),
  };
});

type TestElement = {
  type: unknown;
  props: {
    children?: TestNode;
    className?: string;
    name?: string;
    type?: string;
    action?: unknown;
    disabled?: boolean;
    isLoading?: boolean;
    variant?: string;
  };
};

type TestNode = TestElement | string | number | boolean | null | undefined | TestNode[];

function flattenText(node: TestNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (!node || typeof node === "boolean") {
    return "";
  }

  if (Array.isArray(node)) {
    return node.map(flattenText).join(" ");
  }

  return flattenText(node.props.children);
}

function findByType(node: TestNode, type: unknown): TestElement[] {
  if (!node || typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
    return [];
  }

  if (Array.isArray(node)) {
    return node.flatMap((child) => findByType(child, type));
  }

  const children = findByType(node.props.children, type);
  return node.type === type ? [node, ...children] : children;
}

describe("login UI", () => {
  it("redirects an already authenticated user to the dashboard", async () => {
    const { getCurrentUser } = await import("@/lib/auth");
    const { default: LoginPage } = await import("./page");
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user-id",
      name: "Operador",
      email: "operador@planetaagua.local",
      role: "OPERATOR",
    });

    await expect(LoginPage()).rejects.toThrow("redirect:/dashboard");
  });

  it("renders the compact operational login page copy for guests", async () => {
    const { getCurrentUser } = await import("@/lib/auth");
    const { default: LoginPage } = await import("./page");
    const { LoginForm } = await import("./login-form");
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const page = (await LoginPage()) as TestElement;
    const forms = findByType(page, LoginForm);

    expect(String(page.props.className)).toContain("bg-[var(--background)]");
    expect(forms).toHaveLength(1);
  });

  it("renders email and password fields with pending and error states", async () => {
    const { useState, useTransition } = await import("react");
    const { Alert } = await import("@/components/ui/alert");
    const { Button } = await import("@/components/ui/button");
    const { TextInput } = await import("@/components/ui/form-controls");
    const { Panel } = await import("@/components/ui/panel");
    vi.mocked(useState).mockReturnValue(["E-mail ou senha invalidos.", vi.fn()] as never);
    vi.mocked(useTransition).mockReturnValue([true, vi.fn()] as never);
    const { LoginForm } = await import("./login-form");

    const panel = LoginForm() as TestElement;
    const form = findByType(panel, "form")[0];
    const inputs = findByType(panel, TextInput);
    const alert = findByType(panel, Alert)[0];
    const button = findByType(panel, Button)[0];
    const text = flattenText(panel);

    expect(panel.type).toBe(Panel);
    expect(panel.props.className).toContain("w-full");
    expect(form.type).toBe("form");
    expect(text).toContain("Planeta Agua");
    expect(text).toContain("Acesso operacional");
    expect(text).toContain("registrar vendas, consultar estoque e acompanhar o caixa do dia");
    expect(inputs.map((input) => input.props.name)).toEqual(["email", "password"]);
    expect(inputs.map((input) => input.props.type)).toEqual(["email", "password"]);
    expect(text).toContain("E-mail ou senha invalidos.");
    expect(alert.props.variant).toBe("danger");
    expect(button.props.isLoading).toBe(true);
    expect(button.props.type).toBe("submit");
  });
});
