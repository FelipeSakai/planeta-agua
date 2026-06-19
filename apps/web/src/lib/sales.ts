import {
  cancelSaleInputSchema,
  createSaleInputSchema,
  quickCustomerInputSchema,
  saleDetailResponseSchema,
  saleHistoryResponseSchema,
} from "shared";
import { z } from "zod";

import { getServerApiUrl } from "./api";

const saleCustomerResponseSchema = quickCustomerInputSchema.extend({
  id: z.string().uuid(),
  phone: z.string().trim().min(8).max(20).nullable(),
});

const saleCustomersResponseSchema = z.array(saleCustomerResponseSchema);

export function saleFormToPayload(input: {
  customerId: string | null;
  paymentMethod: "CASH" | "PIX" | "CREDIT_CARD" | "DEBIT_CARD" | "OTHER";
  items: Array<{ productId: string; quantity: number }>;
  bottleMonth: string;
  bottleYear: string;
  bottleNotes: string;
}) {
  const bottle = input.bottleMonth && input.bottleYear
    ? {
        month: Number(input.bottleMonth),
        year: Number(input.bottleYear),
        notes: input.bottleNotes.trim() || null,
      }
    : null;

  return createSaleInputSchema.parse({
    customerId: input.customerId,
    paymentMethod: input.paymentMethod,
    items: input.items,
    bottle,
  });
}

export function cancelSalePayload(reason: string) {
  return cancelSaleInputSchema.parse({ reason });
}

export function buildBottleAlerts(alerts: { expired: boolean; mismatch: boolean }) {
  const messages: string[] = [];

  if (alerts.expired) {
    messages.push("Galao acima da validade de 3 anos.");
  }

  if (alerts.mismatch) {
    messages.push("Galao informado difere do ultimo registro do cliente.");
  }

  return messages;
}

export async function fetchSalesHistory(cookieHeader: string) {
  const response = await fetch(`${getServerApiUrl()}/sales`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  return saleHistoryResponseSchema.parse(await response.json());
}

export async function fetchSaleDetail(cookieHeader: string, id: string) {
  const saleId = encodeURIComponent(id);
  const response = await fetch(`${getServerApiUrl()}/sales/${saleId}`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  return saleDetailResponseSchema.parse(await response.json());
}

export async function searchSaleCustomers(cookieHeader: string, query: string) {
  const params = new URLSearchParams({ query });
  const response = await fetch(`${getServerApiUrl()}/sales/customers?${params.toString()}`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  return saleCustomersResponseSchema.parse(await response.json());
}

export async function createSaleCustomer(
  cookieHeader: string,
  input: {
    name: string;
    phone?: string | null;
  },
) {
  const payload = quickCustomerInputSchema.parse(input);
  const response = await fetch(`${getServerApiUrl()}/sales/customers`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookieHeader },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  return saleCustomerResponseSchema.parse(await response.json());
}
