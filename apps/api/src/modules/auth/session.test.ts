import { describe, expect, it } from "vitest";

import {
  createSessionExpiresAt,
  createSessionToken,
  hashSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
} from "./session";

describe("session helpers", () => {
  it("creates the expected cookie name, duration, token, hash, and expiration", () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const token = createSessionToken();

    expect(SESSION_COOKIE_NAME).toBe("planeta_agua_session");
    expect(SESSION_DURATION_MS).toBe(8 * 60 * 60 * 1000);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
    expect(hashSessionToken("token")).toBe(
      "3c469e9d6c5875d37a43f353d4f88e61fcf812c66eee3457465a40b0da4153e0",
    );
    expect(createSessionExpiresAt(now)).toEqual(new Date("2026-06-15T20:00:00.000Z"));
  });
});
