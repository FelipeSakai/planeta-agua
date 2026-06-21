import { NextResponse } from "next/server";

import { getServerApiUrl } from "@/lib/api";

function cookieHeader(request: Request) {
  return request.headers.get("cookie") ?? "";
}

function expensesUrl(request: Request) {
  const search = new URL(request.url).search;

  return `${getServerApiUrl()}/expenses${search}`;
}

async function jsonResponse(response: Response) {
  if (response.status === 204 || response.status === 205) {
    return new Response(null, { status: response.status });
  }

  const payload = await response.json().catch(() => ({ ok: response.ok }));

  return NextResponse.json(payload, { status: response.status });
}

export async function GET(request: Request) {
  const response = await fetch(expensesUrl(request), {
    headers: { cookie: cookieHeader(request) },
    cache: "no-store",
  });

  return jsonResponse(response);
}

export async function POST(request: Request) {
  const response = await fetch(`${getServerApiUrl()}/expenses`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookieHeader(request) },
    body: await request.text(),
    cache: "no-store",
  });

  return jsonResponse(response);
}