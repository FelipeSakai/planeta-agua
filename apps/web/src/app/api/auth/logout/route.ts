import { NextResponse } from "next/server";

import { getServerApiUrl } from "@/lib/api";

function copySetCookieHeaders(from: Headers, to: Headers) {
  const getSetCookie = (from as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const cookies = getSetCookie ? getSetCookie.call(from) : [from.get("set-cookie")];

  for (const cookie of cookies) {
    if (cookie) {
      to.append("set-cookie", cookie);
    }
  }
}

export async function POST(request: Request) {
  const response = await fetch(`${getServerApiUrl()}/auth/logout`, {
    method: "POST",
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({ ok: response.ok }));
  const nextResponse = NextResponse.json(payload, { status: response.status });

  copySetCookieHeaders(response.headers, nextResponse.headers);

  return nextResponse;
}
