import { NextResponse } from "next/server";

import { getServerApiUrl } from "@/lib/api";

type RouteContext = { params: Promise<{ id: string; bottleId: string }> };

function cookieHeader(request: Request) {
  return request.headers.get("cookie") ?? "";
}

async function jsonResponse(response: Response) {
  if (response.status === 204 || response.status === 205) {
    return new Response(null, { status: response.status });
  }

  const payload = await response.json().catch(() => ({ ok: response.ok }));

  return NextResponse.json(payload, { status: response.status });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id, bottleId } = await context.params;
  const customerId = encodeURIComponent(id);
  const encodedBottleId = encodeURIComponent(bottleId);
  const response = await fetch(`${getServerApiUrl()}/customers/${customerId}/bottles/${encodedBottleId}/deactivate`, {
    method: "PATCH",
    headers: { cookie: cookieHeader(request) },
    cache: "no-store",
  });

  return jsonResponse(response);
}
