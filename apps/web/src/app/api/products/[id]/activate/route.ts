import { NextResponse } from "next/server";

import { getServerApiUrl } from "@/lib/api";

type RouteContext = { params: Promise<{ id: string }> };

async function jsonResponse(response: Response) {
  if (response.status === 204 || response.status === 205) {
    return new Response(null, { status: response.status });
  }

  const payload = await response.json().catch(() => ({ ok: response.ok }));

  return NextResponse.json(payload, { status: response.status });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const productId = encodeURIComponent(id);
  const response = await fetch(`${getServerApiUrl()}/products/${productId}/activate`, {
    method: "PATCH",
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
  });

  return jsonResponse(response);
}
