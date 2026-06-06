import { createHash, randomBytes } from "crypto";

export const SESSION_COOKIE_NAME = "planeta_agua_session";
export const SESSION_DURATION_HOURS = 8;

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionExpiry(now = new Date()) {
  return new Date(now.getTime() + SESSION_DURATION_HOURS * 60 * 60 * 1000);
}

export function isProduction() {
  return process.env.NODE_ENV === "production";
}
