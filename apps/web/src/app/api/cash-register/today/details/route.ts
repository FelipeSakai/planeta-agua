import { NextResponse } from "next/server";

import { getServerApiUrl } from "@/lib/api";

export async function GET(request: Request) {
  const response = await fetch(`${getServerApiUrl()}/cash-register/today/details`, {
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({ ok: response.ok }));
  return NextResponse.json(payload, { status: response.status });
}
