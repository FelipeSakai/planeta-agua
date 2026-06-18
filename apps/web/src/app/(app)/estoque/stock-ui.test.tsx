import { createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StockUi } from "./stock-ui";

type StockActionMode = "ENTRY" | "ADJUSTMENT";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

const stockPage = {
  products: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Galao 20L",
      stockQuantity: 2,
      minimumStock: 3,
      isActive: true,
      isLowStock: true,
    },
  ],
  movements: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      productId: "11111111-1111-4111-8111-111111111111",
      productName: "Galao 20L",
      userId: "33333333-3333-4333-8333-333333333333",
      userName: "Administrador",
      type: "IN" as const,
      quantity: 5,
      reason: "Compra semanal",
      createdAt: "2026-06-17T00:00:00.000Z",
    },
  ],
  summary: { totalProducts: 1, lowStockProducts: 1, totalUnits: 2 },
};

describe("StockUi", () => {
  it("hides mutation controls from operators", () => {
    const html = renderToStaticMarkup(createElement(StockUi, { userRole: "OPERATOR", data: stockPage }));

    expect(html).toContain("Galao 20L");
    expect(html).toContain("Estoque baixo");
    expect(html).toContain("Compra semanal");
    expect(html).not.toContain("Registrar entrada");
    expect(html).not.toContain("Registrar ajuste");
  });

  it("shows mutation controls to admins", () => {
    const html = renderToStaticMarkup(createElement(StockUi, { userRole: "ADMIN", data: stockPage }));

    expect(html).toContain("Registrar entrada");
    expect(html).toContain("Registrar ajuste");
    expect(html).toContain("Motivo");
  });

  it("renders dense stock controls and table labels", () => {
    const html = renderToStaticMarkup(createElement(StockUi, { userRole: "ADMIN", data: stockPage }));

    expect(html).toContain("Buscar produto");
    expect(html).toContain("Status");
    expect(html).toContain("Ordenar");
    expect(html).toContain("Diferença");
    expect(html).toContain("Última movimentação");
  });

  it("requires entry quantity to be positive while allowing zero as final adjustment quantity", async () => {
    const entryHtml = await renderStockWithActionMode("ENTRY");
    const adjustmentHtml = await renderStockWithActionMode("ADJUSTMENT");

    expect(entryHtml).toMatch(/<input[^>]*min="1"[^>]*name="quantity"/);
    expect(adjustmentHtml).toMatch(/<input[^>]*min="0"[^>]*name="newQuantity"/);
  });

  it("blocks duplicate stock mutations before React rerenders", async () => {
    vi.resetModules();
    let actionMode: StockActionMode = "ENTRY";

    vi.doMock("react", async (importOriginal) => {
      const actual = await importOriginal<typeof import("react")>();

      return {
        ...actual,
        useRef: vi.fn((initialValue) => ({ current: initialValue })),
        useState: vi.fn((initialValue) => [initialValue === "ENTRY" ? actionMode : initialValue, vi.fn()]),
        useTransition: vi.fn(() => [false, (callback: () => void) => callback()]),
      };
    });
    vi.doMock("next/navigation", () => ({
      useRouter: vi.fn(() => ({ refresh: vi.fn() })),
    }));

    const { StockUi: HookMockedStockUi } = await import("./stock-ui");
    const ui = HookMockedStockUi({ userRole: "ADMIN", data: stockPage });
    const submitEntry = findStockAction(ui, "Salvar entrada");
    actionMode = "ADJUSTMENT";
    const adjustmentUi = HookMockedStockUi({ userRole: "ADMIN", data: stockPage });
    const submitAdjustment = findStockAction(adjustmentUi, "Salvar ajuste");
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const entryPromise = submitEntry(formData({ quantityName: "quantity" }));
    await submitEntry(formData({ quantityName: "quantity" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await entryPromise;

    const adjustmentPromise = submitAdjustment(formData({ quantityName: "newQuantity" }));
    await submitAdjustment(formData({ quantityName: "newQuantity" }));

    expect(fetchMock).toHaveBeenCalledTimes(2);

    await adjustmentPromise;

    vi.doUnmock("react");
    vi.doUnmock("next/navigation");
  });
});

async function renderStockWithActionMode(actionMode: StockActionMode) {
  vi.resetModules();
  vi.doMock("react", async (importOriginal) => {
    const actual = await importOriginal<typeof import("react")>();

    return {
      ...actual,
      useState: vi.fn((initialValue) => [initialValue === "ENTRY" ? actionMode : initialValue, vi.fn()]),
    };
  });
  vi.doMock("next/navigation", () => ({
    useRouter: vi.fn(() => ({ refresh: vi.fn() })),
  }));

  const { StockUi: ActionModeStockUi } = await import("./stock-ui");
  const html = renderToStaticMarkup(createElement(ActionModeStockUi, { userRole: "ADMIN", data: stockPage }));

  vi.doUnmock("react");
  vi.doUnmock("next/navigation");

  return html;
}

function findStockAction(element: ReactElement, submitLabel: string): (formData: FormData) => Promise<void> {
  const action = findActionInNode(element, submitLabel);

  if (!action) {
    throw new Error(`Action not found for ${submitLabel}`);
  }

  return action;
}

function findActionInNode(node: ReactNode, submitLabel: string): ((formData: FormData) => Promise<void>) | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const action = findActionInNode(child, submitLabel);

      if (action) {
        return action;
      }
    }

    return null;
  }

  if (!isValidElement(node)) {
    return null;
  }

  const props = node.props as { action?: (formData: FormData) => Promise<void>; children?: ReactNode; submitLabel?: string };

  if (props.submitLabel === submitLabel && props.action) {
    return props.action;
  }

  return findActionInNode(props.children, submitLabel);
}

function formData({ quantityName }: { quantityName: "quantity" | "newQuantity" }) {
  const data = new FormData();

  data.set("productId", "11111111-1111-4111-8111-111111111111");
  data.set(quantityName, "5");
  data.set("reason", "Compra semanal");

  return data;
}
