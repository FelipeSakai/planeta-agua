import { NextResponse } from "next/server";

import { getServerApiUrl } from "@/lib/api";

function cookieHeader(request: Request) {
  return request.headers.get("cookie") ?? "";
}

async function jsonResponse(response: Response) {
  const payload = await response.json().catch(() => ({ ok: response.ok }));
  return NextResponse.json(payload, { status: response.status });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const response = await fetch(`${getServerApiUrl()}/users/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: cookieHeader(request) },
    body: await request.text(),
    cache: "no-store",
  });
  return jsonResponse(response);
}
