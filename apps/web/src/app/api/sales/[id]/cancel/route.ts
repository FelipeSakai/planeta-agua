import { NextResponse } from "next/server";

import { getServerApiUrl } from "@/lib/api";

type RouteContext = { params: Promise<{ id: string }> };

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

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const saleId = encodeURIComponent(id);
  const response = await fetch(`${getServerApiUrl()}/sales/${saleId}/cancel`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookieHeader(request) },
    body: await request.text(),
    cache: "no-store",
  });

  return jsonResponse(response);
}
