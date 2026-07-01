import { describe, expect, it } from "vitest";

import { buildCustomerSearchTerms } from "./sales.repository";

describe("buildCustomerSearchTerms", () => {
  it("splits one operational customer search into terms across fields", () => {
    expect(buildCustomerSearchTerms("Maria Rua Flores", "")).toEqual(["Maria", "Rua", "Flores"]);
  });
});
