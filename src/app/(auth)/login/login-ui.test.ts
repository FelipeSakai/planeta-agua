import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("@/features/auth/auth.actions", () => ({
  loginAction: vi.fn(),
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();

  return {
    ...actual,
    useActionState: vi.fn(),
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

  it("renders the Planeta Agua login page copy for guests", async () => {
    const { getCurrentUser } = await import("@/lib/auth");
    const { default: LoginPage } = await import("./page");
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const page = (await LoginPage()) as TestElement;
    const text = flattenText(page);

    expect(text).toContain("Planeta Agua");
    expect(text).toContain("registrar vendas");
    expect(String(page.props.className)).toContain("bg-[#f5f1ec]");
  });

  it("renders email and password fields with pending and error states", async () => {
    const { useActionState } = await import("react");
    vi.mocked(useActionState).mockReturnValue([{ error: "E-mail ou senha invalidos." }, vi.fn(), true]);
    const { LoginForm } = await import("./login-form");

    const form = LoginForm() as TestElement;
    const inputs = findByType(form, "input");
    const button = findByType(form, "button")[0];
    const text = flattenText(form);

    expect(form.type).toBe("form");
    expect(inputs.map((input) => input.props.name)).toEqual(["email", "password"]);
    expect(inputs.map((input) => input.props.type)).toEqual(["email", "password"]);
    expect(text).toContain("E-mail ou senha invalidos.");
    expect(text).toContain("Entrando...");
    expect(button.props.disabled).toBe(true);
  });
});
