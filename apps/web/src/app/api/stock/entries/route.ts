import { NextResponse } from "next/server";

import { getServerApiUrl } from "@/lib/api";

export async function POST(request: Request) {
  const response = await fetch(`${getServerApiUrl()}/stock/entries`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: request.headers.get("cookie") ?? "",
    },
    body: await request.text(),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}
