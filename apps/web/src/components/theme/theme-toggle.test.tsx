import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle", () => {
  it("renders an accessible manual theme control", () => {
    const html = renderToStaticMarkup(createElement(ThemeToggle));

    expect(html).toContain("button");
    expect(html).toContain("Tema");
    expect(html).toContain("aria-label");
  });
});
