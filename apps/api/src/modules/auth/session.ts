import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE_NAME = "planeta_agua_session";
export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionExpiresAt(now = new Date()) {
  return new Date(now.getTime() + SESSION_DURATION_MS);
}
