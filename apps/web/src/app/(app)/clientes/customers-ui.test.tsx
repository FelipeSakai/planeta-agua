import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { CustomerResponse } from "shared";
import { describe, expect, it, vi } from "vitest";

import { CustomersUi } from "./customers-ui";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}));

const customers: CustomerResponse[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Maria Silva",
    phone: "(11) 3333-4444",
    mobilePhone: "(11) 98888-7777",
    address: "Rua A, 123",
    notes: null,
    isActive: true,
    hasBottleAlert: false,
    createdAt: "2026-06-15T00:00:00.000Z",
    updatedAt: "2026-06-15T00:00:00.000Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Joao Souza",
    phone: "(11) 2222-3333",
    mobilePhone: null,
    address: null,
    notes: null,
    isActive: true,
    hasBottleAlert: false,
    createdAt: "2026-06-15T00:00:00.000Z",
    updatedAt: "2026-06-15T00:00:00.000Z",
  },
];

describe("CustomersUi", () => {
  it("shows phone and mobile contact labels and compact values", () => {
    const html = renderCustomers();

    expect(html).toContain("Telefone");
    expect(html).toContain("Celular");
    expect(html).toContain("Tel: (11) 3333-4444");
    expect(html).toContain("Cel: (11) 98888-7777");
  });

  it("searches customers by mobile phone", async () => {
    const html = await renderCustomersWithSearch("98888");

    expect(html).toContain("Maria Silva");
    expect(html).not.toContain("Joao Souza");
  });

  it("renders phone and mobile fields in the create form", async () => {
    const html = await renderCustomersWithCreateDrawerOpen();

    expect(html).toContain("Telefone");
    expect(html).toContain('name="phone"');
    expect(html).toContain("Celular");
    expect(html).toContain('name="mobilePhone"');
    expect(html).toContain('placeholder="(00) 0000-0000"');
    expect(html).toContain('placeholder="(00) 00000-0000"');
  });
});

function renderCustomers() {
  return renderToStaticMarkup(createElement(CustomersUi, { userRole: "ADMIN", customers, summary: { total: 2, active: 2, withAlert: 0 } }));
}

async function renderCustomersWithSearch(search: string) {
  return renderCustomersWithStateOverride((stateIndex, initialValue) => {
    if (stateIndex === 0) return [search, vi.fn()];
    return [initialValue, vi.fn()];
  });
}

async function renderCustomersWithCreateDrawerOpen() {
  return renderCustomersWithStateOverride((stateIndex, initialValue) => {
    if (stateIndex === 1) return ["create", vi.fn()];
    return [initialValue, vi.fn()];
  });
}

async function renderCustomersWithStateOverride(resolveState: (stateIndex: number, initialValue: unknown) => [unknown, ReturnType<typeof vi.fn>]) {
  vi.resetModules();
  vi.doMock("react", async (importOriginal) => {
    const actual = await importOriginal<typeof import("react")>();
    let stateIndex = 0;

    return {
      ...actual,
      useState: vi.fn((initialValue) => {
        const currentIndex = stateIndex;
        stateIndex += 1;
        return resolveState(currentIndex, initialValue);
      }),
    };
  });
  vi.doMock("next/navigation", () => ({
    useRouter: vi.fn(() => ({ refresh: vi.fn() })),
  }));

  const { CustomersUi: StateCustomersUi } = await import("./customers-ui");
  const html = renderToStaticMarkup(createElement(StateCustomersUi, { userRole: "ADMIN", customers, summary: { total: 2, active: 2, withAlert: 0 } }));

  vi.doUnmock("react");
  vi.doUnmock("next/navigation");

  return html;
}
