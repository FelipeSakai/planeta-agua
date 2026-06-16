import { describe, expect, it } from "vitest";

import { getBrowserApiUrl, getServerApiUrl } from "./api";

describe("api URL helpers", () => {
  it("falls back to the local Nest API URL", () => {
    expect(getBrowserApiUrl()).toBe("http://localhost:3333");
    expect(getServerApiUrl()).toBe("http://localhost:3333");
  });
});
