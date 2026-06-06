import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("password helpers", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("senha-segura-123");

    expect(hash).not.toBe("senha-segura-123");
    await expect(verifyPassword("senha-segura-123", hash)).resolves.toBe(true);
  });

  it("rejects an invalid password", async () => {
    const hash = await hashPassword("senha-segura-123");

    await expect(verifyPassword("senha-errada", hash)).resolves.toBe(false);
  });
});
