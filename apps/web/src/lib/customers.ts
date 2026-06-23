import {
  customerDetailResponseSchema,
  customersListResponseSchema,
  duplicateCheckResponseSchema,
  type CustomerDetailResponse,
  type CustomersListResponse,
  type DuplicateCheckResponse,
} from "shared";

import { getServerApiUrl } from "./api";

const emptyCustomersResponse: CustomersListResponse = {
  customers: [],
  summary: { total: 0, active: 0, withAlert: 0 },
};

export async function fetchCustomers(cookieHeader: string): Promise<CustomersListResponse> {
  const response = await fetch(`${getServerApiUrl()}/customers`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!response.ok) {
    return emptyCustomersResponse;
  }

  return customersListResponseSchema.parse(await response.json());
}

export async function fetchCustomerDetail(id: string, cookieHeader: string): Promise<CustomerDetailResponse | null> {
  const response = await fetch(`${getServerApiUrl()}/customers/${id}`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return customerDetailResponseSchema.parse(await response.json());
}

export async function checkCustomerDuplicates(name: string, phone: string | null, excludeId: string | undefined, cookieHeader: string): Promise<DuplicateCheckResponse> {
  const params = new URLSearchParams({ name });
  if (phone) params.set("phone", phone);
  if (excludeId) params.set("excludeId", excludeId);

  const response = await fetch(`${getServerApiUrl()}/customers/duplicates?${params}`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!response.ok) {
    return { hasDuplicates: false, duplicates: [] };
  }

  return duplicateCheckResponseSchema.parse(await response.json());
}

export function formatBottleExpiration(expiresAt: string): string {
  const date = new Date(expiresAt);
  return date.toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" });
}

export function getBottleAlertVariant(bottle: { isExpired: boolean; isNearExpiration: boolean }): "danger" | "warning" | null {
  if (bottle.isExpired) return "danger";
  if (bottle.isNearExpiration) return "warning";
  return null;
}
