import {
  cashRegisterDetailsResponseSchema,
  cashRegisterResponseSchema,
  closeCashRegisterInputSchema,
  createExpenseInputSchema,
  dashboardResponseSchema,
  expenseListResponseSchema,
  expenseResponseSchema,
  financeSummaryResponseSchema,
  updateExpenseInputSchema,
  updateOpeningBalanceInputSchema,
  type CashRegisterDetailsResponse,
} from "shared";

import { getServerApiUrl } from "./api";

type FinanceRequestOptions = {
  cookieHeader?: string;
};

function buildFinanceUrl(path: string, cookieHeader?: string) {
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

export async function fetchDashboard(cookieHeader: string) {
  const response = await fetch(`${getServerApiUrl()}/finance/dashboard`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  ensureResponseOk(response, "Nao foi possivel carregar o dashboard.");

  return dashboardResponseSchema.parse(await response.json());
}

export async function fetchCashRegisterToday(cookieHeader: string) {
  const response = await fetch(`${getServerApiUrl()}/cash-register/today`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  ensureResponseOk(response, "Nao foi possivel carregar o caixa do dia.");

  const text = await response.text();
  if (!text) {
    return null;
  }

  return cashRegisterResponseSchema.parse(JSON.parse(text));
}

export async function fetchCashRegisterDetails(
  cookieHeader: string,
): Promise<CashRegisterDetailsResponse | null> {
  const response = await fetch(`${getServerApiUrl()}/cash-register/today/details`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return cashRegisterDetailsResponseSchema.parse(await response.json());
}

export async function fetchFinanceSummary(
  cookieHeader: string,
  startDate?: string,
  endDate?: string,
) {
  const params = new URLSearchParams();
  if (startDate) {
    params.set("startDate", startDate);
  }
  if (endDate) {
    params.set("endDate", endDate);
  }
  const qs = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${getServerApiUrl()}/finance/summary${qs}`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  ensureResponseOk(response, "Nao foi possivel carregar o resumo financeiro.");

  return financeSummaryResponseSchema.parse(await response.json());
}

export async function updateOpeningBalance(openingBalanceCents: number) {
  const payload = updateOpeningBalanceInputSchema.parse({ openingBalanceCents });
  const response = await fetch("/api/cash-register/today/opening-balance", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? "Nao foi possivel atualizar o saldo de abertura.");
  }

  return cashRegisterResponseSchema.parse(await response.json());
}

export async function closeCashRegister(
  counts: Record<string, { counted: number }>,
) {
  const payload = closeCashRegisterInputSchema.parse({ counts });
  const response = await fetch("/api/cash-register/today/close", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? "Nao foi possivel fechar o caixa.");
  }

  return cashRegisterResponseSchema.parse(await response.json());
}

export async function fetchExpenses(
  options?: FinanceRequestOptions & { startDate?: string; endDate?: string },
) {
  const params = new URLSearchParams();
  if (options?.startDate) {
    params.set("startDate", options.startDate);
  }
  if (options?.endDate) {
    params.set("endDate", options.endDate);
  }
  const qs = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(buildFinanceUrl(`/expenses${qs}`, options?.cookieHeader), {
    headers: buildHeaders({}, options?.cookieHeader),
    cache: "no-store",
  });

  ensureResponseOk(response, "Nao foi possivel carregar as despesas.");

  return expenseListResponseSchema.parse(await response.json());
}

export async function createExpense(
  input: {
    description: string;
    amountCents: number;
    category: "MARMITA" | "GASOLINA" | "MANUTENCAO" | "OUTRO";
    paymentMethod: "CASH" | "PIX" | "CREDIT_CARD" | "DEBIT_CARD" | "OTHER";
    date: string;
  },
) {
  const payload = createExpenseInputSchema.parse(input);
  const response = await fetch("/api/expenses", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? "Nao foi possivel criar a despesa.");
  }

  return expenseResponseSchema.parse(await response.json());
}

export async function updateExpense(
  id: string,
  input: Partial<{
    description: string;
    amountCents: number;
    category: "MARMITA" | "GASOLINA" | "MANUTENCAO" | "OUTRO";
    paymentMethod: "CASH" | "PIX" | "CREDIT_CARD" | "DEBIT_CARD" | "OTHER";
    date: string;
  }>,
) {
  const payload = updateExpenseInputSchema.parse(input);
  const response = await fetch(`/api/expenses/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? "Nao foi possivel atualizar a despesa.");
  }

  return expenseResponseSchema.parse(await response.json());
}

export async function deleteExpense(id: string) {
  const response = await fetch(`/api/expenses/${encodeURIComponent(id)}`, {
    method: "DELETE",
    cache: "no-store",
  });

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? "Nao foi possivel excluir a despesa.");
  }

  return null;
}