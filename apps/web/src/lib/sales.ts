import {
  cancelSaleInputSchema,
  createSaleInputSchema,
  quickCustomerInputSchema,
  saleCustomerResponseSchema,
  saleCustomersResponseSchema,
  saleDetailResponseSchema,
  saleHistoryResponseSchema,
} from "shared";
import { z } from "zod";

import { getServerApiUrl } from "./api";

type SalesRequestOptions = {
  cookieHeader?: string;
};

export type SaleCustomerResponse = z.infer<typeof saleCustomerResponseSchema>;

function buildSalesUrl(path: string, cookieHeader?: string) {
  return cookieHeader ? `${getServerApiUrl()}${path}` : `/api${path}`;
}

function buildHeaders(headers: Record<string, string>, cookieHeader?: string) {
  return cookieHeader ? { ...headers, cookie: cookieHeader } : headers;
}

function ensureResponseOk(response: Response, message: string) {
  if (!response.ok) {
    throw new Error(message);
  }
}

export function saleFormToPayload(input: {
  customerId: string | null;
  paymentMethod: "CASH" | "PIX" | "CREDIT_CARD" | "DEBIT_CARD" | "OTHER";
  items: Array<{ productId: string; quantity: number; finalUnitPriceCents?: number; discountCents?: number }>;
  bottleMonth: string;
  bottleYear: string;
  bottleNotes: string;
  deliveryPending: boolean;
}) {
  const hasBottleMonth = input.bottleMonth.trim() !== "";
  const hasBottleYear = input.bottleYear.trim() !== "";

  if (hasBottleMonth !== hasBottleYear) {
    throw new Error("Informe mes e ano do galao.");
  }

  const bottle = hasBottleMonth && hasBottleYear
    ? { month: Number(input.bottleMonth), year: Number(input.bottleYear), notes: input.bottleNotes.trim() || null }
    : null;

  return createSaleInputSchema.parse({
    customerId: input.customerId,
    paymentMethod: input.paymentMethod,
    items: input.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      ...(item.finalUnitPriceCents !== undefined ? { finalUnitPriceCents: item.finalUnitPriceCents } : {}),
      ...(item.discountCents !== undefined ? { discountCents: item.discountCents } : {}),
    })),
    bottle,
    deliveryPending: input.deliveryPending,
  });
}

export function cancelSalePayload(reason: string) {
  const parsedInput = cancelSaleInputSchema.safeParse({ reason });

  if (!parsedInput.success) {
    throw new Error("Informe o motivo do cancelamento com pelo menos 3 caracteres.");
  }

  return parsedInput.data;
}

export function buildBottleAlerts(alerts: { expired: boolean; mismatch: boolean }) {
  const messages: string[] = [];

  if (alerts.expired) {
    messages.push("Galão acima da validade de 3 anos.");
  }

  if (alerts.mismatch) {
    messages.push("Galão informado difere do último registro do cliente.");
  }

  return messages;
}

export async function fetchSalesHistory(cookieHeader: string, filter?: { status?: string }) {
  const params = new URLSearchParams();
  if (filter?.status) {
    params.set("status", filter.status);
  }
  const qs = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${getServerApiUrl()}/sales${qs}`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  ensureResponseOk(response, "Nao foi possivel carregar o historico de vendas.");

  return saleHistoryResponseSchema.parse(await response.json());
}

export async function fetchSaleDetail(cookieHeader: string, id: string) {
  const saleId = encodeURIComponent(id);
  const response = await fetch(`${getServerApiUrl()}/sales/${saleId}`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  ensureResponseOk(response, "Nao foi possivel carregar os detalhes da venda.");

  return saleDetailResponseSchema.parse(await response.json());
}

export async function searchSaleCustomers(primaryQuery: string, options?: SalesRequestOptions & { secondaryQuery?: string }) {
  const params = new URLSearchParams({ query: primaryQuery });
  if (options?.secondaryQuery) {
    params.set("secondary", options.secondaryQuery);
  }
  const response = await fetch(buildSalesUrl(`/sales/customers?${params.toString()}`, options?.cookieHeader), {
    headers: buildHeaders({}, options?.cookieHeader),
    cache: "no-store",
  });

  ensureResponseOk(response, "Nao foi possivel buscar os clientes.");

  return saleCustomersResponseSchema.parse(await response.json());
}

export async function createSaleCustomer(
  input: { name: string; phone?: string | null; code?: string | null; address?: string | null },
  options?: SalesRequestOptions,
) {
  const payload = quickCustomerInputSchema.parse(input);
  const response = await fetch(buildSalesUrl("/sales/customers", options?.cookieHeader), {
    method: "POST",
    headers: buildHeaders({ "content-type": "application/json" }, options?.cookieHeader),
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  ensureResponseOk(response, "Nao foi possivel cadastrar o cliente.");

  return saleCustomerResponseSchema.parse(await response.json());
}

export async function confirmSaleDelivery(saleId: string) {
  const response = await fetch(`/api/sales/${encodeURIComponent(saleId)}/deliver`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? "Nao foi possivel confirmar a entrega.");
  }

  return response.json();
}
