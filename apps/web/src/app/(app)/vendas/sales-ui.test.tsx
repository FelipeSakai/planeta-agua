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
  it("replaces stale previous bottle data on refresh without clearing the selected customer id", () => {
    const refreshedCustomer = {
      id: "c1",
      name: "Maria",
      phone: "11999999999",
      previousBottle: { month: 7, year: 2026, notes: "verde" },
    };

    const syncedCustomers = syncCustomersFromProps({
      customers: [refreshedCustomer],
      customerDirectory: [
        { id: "c1", name: "Maria", phone: "11999999999", previousBottle: { month: 6, year: 2024, notes: "azul" } },
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

  it("resolves bottle fields from the previous customer record when the operator has not edited them", () => {
    const customer = {
      id: "c1",
      name: "Maria",
      phone: null,
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
