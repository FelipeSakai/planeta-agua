import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveBottleState, SalesUi, syncCustomersFromProps } from "./sales-ui";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}));

afterEach(() => {
  vi.doUnmock("next/navigation");
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("SalesUi", () => {
  it("does not render long explanatory paragraphs", () => {
    const html = renderToStaticMarkup(
      createElement(SalesUi, {
        userRole: "OPERATOR",
        products: [],
        customers: [],
        drivers: [],
      }),
    );

    expect(html).not.toContain("Cliente opcional");
    expect(html).not.toContain("Voce pode finalizar a venda sem cliente");
    expect(html).not.toContain("Somente produtos ativos aparecem aqui");
    expect(html).not.toContain("Ajuste quantidades rapidamente antes de finalizar");
  });

  it("renders two customer search fields and a product search field", () => {
    const html = renderToStaticMarkup(
      createElement(SalesUi, {
        userRole: "OPERATOR",
        products: [],
        customers: [],
        drivers: [],
      }),
    );

    expect(html).toContain("Buscar por nome ou telefone");
    expect(html).toContain("Codigo ou endereco");
    expect(html).toContain("Digite o nome do produto");
  });

  it("renders the cart sidebar with finalize button", () => {
    const html = renderToStaticMarkup(
      createElement(SalesUi, {
        userRole: "OPERATOR",
        products: [],
        customers: [],
        drivers: [],
      }),
    );

    expect(html).toContain("Carrinho");
    expect(html).toContain("Finalizar venda");
  });

  it("renders a delivery-later checkbox", () => {
    const html = renderToStaticMarkup(
      createElement(SalesUi, {
        userRole: "OPERATOR",
        products: [],
        customers: [],
        drivers: [],
      }),
    );

    expect(html).toContain("Entregar depois");
  });

  it("does not render sales history on the sales page", () => {
    const html = renderToStaticMarkup(
      createElement(SalesUi, {
        userRole: "OPERATOR",
        products: [],
        customers: [],
        drivers: [],
      }),
    );

    expect(html).not.toContain("Historico recente");
  });
});

describe("syncCustomersFromProps", () => {
  it("replaces stale previous bottle data on refresh without clearing the selected customer id", () => {
    const refreshedCustomer = {
      id: "c1",
      name: "Maria",
      phone: "11999999999",
      code: null,
      address: null,
      previousBottle: { month: 7, year: 2026, notes: "verde" },
    };

    const syncedCustomers = syncCustomersFromProps({
      customers: [refreshedCustomer],
      customerDirectory: [
        { id: "c1", name: "Maria", phone: "11999999999", code: null, address: null, previousBottle: { month: 6, year: 2024, notes: "azul" } },
      ],
      selectedCustomerId: "c1",
    });

    expect(syncedCustomers.knownCustomers).toEqual([refreshedCustomer]);
    expect(syncedCustomers.selectedCustomerId).toBe("c1");
    expect(syncedCustomers.selectedCustomer).toEqual(refreshedCustomer);
    expect(syncedCustomers.customerDirectory).toEqual([refreshedCustomer]);
  });

  it("retains the selected customer when a fresh search returns no results", () => {
    const directoryCustomer = {
      id: "c1",
      name: "Maria",
      phone: null,
      code: null,
      address: null,
      previousBottle: { month: 6, year: 2024, notes: "azul" },
    };

    const syncedCustomers = syncCustomersFromProps({
      customers: [],
      customerDirectory: [directoryCustomer],
      selectedCustomerId: "c1",
    });

    expect(syncedCustomers.selectedCustomer).toEqual(directoryCustomer);
    expect(syncedCustomers.customerDirectory).toEqual([directoryCustomer]);
  });
});

describe("resolveBottleState", () => {
  it("resolves bottle fields from the previous customer record when the operator has not edited them", () => {
    const customer = {
      id: "c1",
      name: "Maria",
      phone: null,
      code: null,
      address: null,
      previousBottle: { month: 6, year: 2024, notes: "azul" },
    };

    const state = resolveBottleState({
      selectedCustomer: customer,
      isCurrentBottleSource: false,
      bottleMonth: "",
      bottleYear: "",
      bottleNotes: "",
      now: new Date("2026-06-18T00:00:00.000Z"),
    });

    expect(state.resolvedBottleMonth).toBe("6");
    expect(state.resolvedBottleYear).toBe("2024");
    expect(state.resolvedBottleNotes).toBe("");
    expect(state.currentBottle).toEqual({ month: 6, year: 2024, notes: null });
  });

  it("ignores bottle note-only differences for mismatch alerts", () => {
    const customer = {
      id: "c1",
      name: "Maria",
      phone: null,
      code: null,
      address: null,
      previousBottle: { month: 6, year: 2024, notes: "azul" },
    };

    const state = resolveBottleState({
      selectedCustomer: customer,
      isCurrentBottleSource: true,
      bottleMonth: "6",
      bottleYear: "2024",
      bottleNotes: "",
      now: new Date("2026-06-18T00:00:00.000Z"),
    });

    expect(state.bottleAlerts).not.toContain("Galão informado difere do último registro do cliente.");
  });

  it("flags a mismatch when the bottle month or year differs from the previous record", () => {
    const customer = {
      id: "c1",
      name: "Maria",
      phone: null,
      code: null,
      address: null,
      previousBottle: { month: 6, year: 2024, notes: "azul" },
    };

    const state = resolveBottleState({
      selectedCustomer: customer,
      isCurrentBottleSource: true,
      bottleMonth: "7",
      bottleYear: "2024",
      bottleNotes: "",
      now: new Date("2026-06-18T00:00:00.000Z"),
    });

    expect(state.bottleAlerts).toContain("Galão informado difere do último registro do cliente.");
  });
});
