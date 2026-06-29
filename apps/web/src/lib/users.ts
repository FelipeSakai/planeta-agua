import {
  operatorUserResponseSchema,
  operatorUsersListResponseSchema,
  type CreateOperatorUserInput,
  type OperatorUserResponse,
  type OperatorUsersListResponse,
  type ResetOperatorPasswordInput,
  type UpdateOperatorUserInput,
} from "shared";

import { getServerApiUrl } from "./api";

const emptyUsersResponse: OperatorUsersListResponse = { users: [] };

export async function fetchOperatorUsers(cookieHeader: string): Promise<OperatorUsersListResponse> {
  const response = await fetch(`${getServerApiUrl()}/users`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!response.ok) {
    return emptyUsersResponse;
  }

  return operatorUsersListResponseSchema.parse(await response.json());
}

export async function createOperatorUser(input: CreateOperatorUserInput): Promise<OperatorUserResponse> {
  return mutateOperatorUser("/api/users", "POST", input);
}

export async function updateOperatorUser(id: string, input: UpdateOperatorUserInput): Promise<OperatorUserResponse> {
  return mutateOperatorUser(`/api/users/${id}`, "PATCH", input);
}

export async function toggleOperatorUser(id: string): Promise<OperatorUserResponse> {
  return mutateOperatorUser(`/api/users/${id}/toggle-active`, "POST");
}

export async function resetOperatorPassword(id: string, input: ResetOperatorPasswordInput): Promise<OperatorUserResponse> {
  return mutateOperatorUser(`/api/users/${id}/reset-password`, "POST", input);
}

async function mutateOperatorUser(path: string, method: "POST" | "PATCH", input?: unknown): Promise<OperatorUserResponse> {
  const response = await fetch(path, {
    method,
    headers: input ? { "content-type": "application/json" } : undefined,
    body: input ? JSON.stringify(input) : undefined,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(getErrorMessage(payload));
  }

  return operatorUserResponseSchema.parse(payload);
}

function getErrorMessage(payload: unknown) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message: unknown }).message;
    if (typeof message === "string") return message;
    if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  }
  return "Nao foi possivel salvar o usuario.";
}
