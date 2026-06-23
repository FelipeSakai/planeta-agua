import { describe, expect, it } from "vitest";

import { calculateBottleExpiresAt, isBottleNearExpiration, isBottleExpired } from "./customers";

describe("calculateBottleExpiresAt", () => {
  it("returns the last day of the month 3 years after the given month/year", () => {
    const result = calculateBottleExpiresAt(6, 2024);
    expect(result).toEqual(new Date("2027-06-30T23:59:59.999Z"));
  });

  it("handles February in a leap year", () => {
    const result = calculateBottleExpiresAt(2, 2024);
    expect(result).toEqual(new Date("2027-02-28T23:59:59.999Z"));
  });

  it("handles December", () => {
    const result = calculateBottleExpiresAt(12, 2025);
    expect(result).toEqual(new Date("2028-12-31T23:59:59.999Z"));
  });
});

describe("isBottleNearExpiration", () => {
  it("returns true when bottle expires within 30 days", () => {
    const expiresAt = new Date("2026-07-15T00:00:00.000Z");
    const now = new Date("2026-06-20T00:00:00.000Z");
    expect(isBottleNearExpiration(expiresAt, now)).toBe(true);
  });

  it("returns false when bottle expires after 30 days", () => {
    const expiresAt = new Date("2026-08-20T00:00:00.000Z");
    const now = new Date("2026-06-20T00:00:00.000Z");
    expect(isBottleNearExpiration(expiresAt, now)).toBe(false);
  });

  it("returns false when bottle already expired", () => {
    const expiresAt = new Date("2026-06-01T00:00:00.000Z");
    const now = new Date("2026-06-20T00:00:00.000Z");
    expect(isBottleNearExpiration(expiresAt, now)).toBe(false);
  });
});

describe("isBottleExpired", () => {
  it("returns true when bottle already expired", () => {
    const expiresAt = new Date("2026-06-01T00:00:00.000Z");
    const now = new Date("2026-06-20T00:00:00.000Z");
    expect(isBottleExpired(expiresAt, now)).toBe(true);
  });

  it("returns false when bottle not expired", () => {
    const expiresAt = new Date("2027-06-30T00:00:00.000Z");
    const now = new Date("2026-06-20T00:00:00.000Z");
    expect(isBottleExpired(expiresAt, now)).toBe(false);
  });
});
