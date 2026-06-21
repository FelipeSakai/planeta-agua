import { NextResponse } from "next/server";

import { getServerApiUrl } from "@/lib/api";

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

export async function GET(request: Request) {
  const response = await fetch(`${getServerApiUrl()}/finance/dashboard`, {
    headers: { cookie: cookieHeader(request) },
    cache: "no-store",
  });

  return jsonResponse(response);
}