import { describe, expect, it } from "vitest";

import { createSessionExpiry, createSessionToken, hashSessionToken, SESSION_COOKIE_NAME } from "./session";

describe("session helpers", () => {
  it("uses the expected cookie name", () => {
    expect(SESSION_COOKIE_NAME).toBe("planeta_agua_session");
  });

  it("creates opaque random tokens", () => {
    const first = createSessionToken();
    const second = createSessionToken();

    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(43);
  });

  it("hashes tokens deterministically without returning the raw token", () => {
    const token = "raw-token";

    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
    expect(hashSessionToken(token)).not.toBe(token);
  });

  it("creates an expiry eight hours in the future", () => {
    const now = new Date("2026-06-05T12:00:00.000Z");
    const expiresAt = createSessionExpiry(now);

    expect(expiresAt.toISOString()).toBe("2026-06-05T20:00:00.000Z");
  });
});
