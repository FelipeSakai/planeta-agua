import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SalesUi } from "./sales-ui";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}));

afterEach(() => {
  vi.doUnmock("react");
  vi.doUnmock("next/navigation");
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("SalesUi", () => {
  it("keeps customer optional even when customers are preloaded", () => {
    const html = renderToStaticMarkup(
      createElement(SalesUi, {
        userRole: "OPERATOR",
        history: [],
        products: [],
        customers: [{ id: "c1", name: "Maria", phone: "11999999999", previousBottle: { month: 6, year: 2024, notes: "azul" } }],
      }),
    );

    expect(html).toContain("Cliente opcional");
    expect(html).toContain("Siga sem cliente quando o atendimento for rápido de balcão.");
    expect(html).toContain("Finalizar venda");
    expect(html).not.toContain("Último galão conhecido");
    expect(html).not.toContain("Mês do galão");
  });

  it("renders the customer select with 'Sem cliente' selected by default", () => {
    const html = renderToStaticMarkup(
      createElement(SalesUi, {
        userRole: "OPERATOR",
        history: [],
        products: [],
        customers: [{ id: "c1", name: "Maria", phone: "11999999999", previousBottle: { month: 6, year: 2024, notes: "azul" } }],
      }),
    );

    expect(html).toContain('<option value="" selected="">Sem cliente</option>');
    expect(html).not.toContain('<option value="c1" selected="">Maria</option>');
  });

  it("keeps the selected customer bottle block when search results no longer include that customer", async () => {
    const props = {
      userRole: "ADMIN" as const,
      history: [],
      products: [],
      customers: [{ id: "c1", name: "Maria", phone: null, previousBottle: { month: 6, year: 2024, notes: "azul" } }],
    };

    const html = renderToStaticMarkup(
      createElement(
        await importSalesUiWithState(props, {
          knownCustomers: [],
          selectedCustomerId: "c1",
          bottleMonth: "6",
          bottleYear: "2024",
        }),
        props,
      ),
    );

    expect(html).toContain("Maria");
    expect(html).toContain("Último galão conhecido");
    expect(html).toContain("Mês do galão");
  });

  it("ignores bottle note-only differences for mismatch alerts", async () => {
    const html = renderToStaticMarkup(
      createElement(
        await importSalesUiWithState(
          {
            userRole: "ADMIN",
            history: [],
            products: [],
            customers: [{ id: "c1", name: "Maria", phone: null, previousBottle: { month: 6, year: 2024, notes: "azul" } }],
          },
          {
            selectedCustomerId: "c1",
            bottleMonth: "6",
            bottleYear: "2024",
            bottleNotes: "",
          },
        ),
        {
          userRole: "ADMIN",
          history: [],
          products: [],
          customers: [{ id: "c1", name: "Maria", phone: null, previousBottle: { month: 6, year: 2024, notes: "azul" } }],
        },
      ),
    );

    expect(html).not.toContain("Galão informado difere do último registro do cliente.");
  });

  it("shows cancel action in history for operators and admins", () => {
    const html = renderToStaticMarkup(
      createElement(SalesUi, {
        userRole: "OPERATOR",
        history: [
          {
            id: "s1",
            status: "COMPLETED",
            customerName: null,
            userName: "Operador",
            totalAmountCents: 1000,
            paymentMethod: "PIX",
            createdAt: "2026-06-18T00:00:00.000Z",
            canceledAt: null,
            cancellationReason: null,
          },
        ],
        products: [],
        customers: [],
      }),
    );

    expect(html).toContain("Cancelar venda");
  });
});

type SalesUiProps = Parameters<typeof SalesUi>[0];

type StateOverrides = {
  knownCustomers?: SalesUiProps["customers"];
  selectedCustomerId?: string;
  bottleMonth?: string;
  bottleYear?: string;
  bottleNotes?: string;
  cartItems?: unknown;
};

async function importSalesUiWithState(props: SalesUiProps, overrides: StateOverrides) {
  vi.resetModules();
  vi.doMock("react", async (importOriginal) => {
    const actual = await importOriginal<typeof import("react")>();
    let stateIndex = 0;
    let customerDirectoryOffset = 0;

    return {
      ...actual,
      useTransition: vi.fn(() => [false, (callback: () => void) => callback()]),
      useState: vi.fn((initialValue) => {
        const currentIndex = stateIndex;
        stateIndex += 1;

        if (currentIndex === 0) {
          return [overrides.knownCustomers ?? props.customers, vi.fn()];
        }

        if (currentIndex === 1 && Array.isArray(initialValue)) {
          customerDirectoryOffset = 1;
          return [props.customers, vi.fn()];
        }

        if (currentIndex === 1 + customerDirectoryOffset) {
          return [overrides.selectedCustomerId ?? initialValue, vi.fn()];
        }

        if (currentIndex === 5 + customerDirectoryOffset) {
          return [overrides.cartItems ?? initialValue, vi.fn()];
        }

        if (currentIndex === 6 + customerDirectoryOffset) {
          return [overrides.bottleMonth ?? initialValue, vi.fn()];
        }

        if (currentIndex === 7 + customerDirectoryOffset) {
          return [overrides.bottleYear ?? initialValue, vi.fn()];
        }

        if (currentIndex === 8 + customerDirectoryOffset) {
          return [overrides.bottleNotes ?? initialValue, vi.fn()];
        }

        return [initialValue, vi.fn()];
      }),
    };
  });
  vi.doMock("next/navigation", () => ({
    useRouter: vi.fn(() => ({ refresh: vi.fn() })),
  }));

  const { SalesUi: HookMockedSalesUi } = await import("./sales-ui");

  return HookMockedSalesUi;
}
