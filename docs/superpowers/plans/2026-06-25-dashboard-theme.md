# Dashboard Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct dashboard color hierarchy and add a manual light/dark mode for the authenticated web app.

**Architecture:** Theme is global CSS-variable based, controlled by a small client component in the app shell. Dashboard and shared UI components consume tokens instead of hardcoded light surfaces, keeping the change visual-only and avoiding sales/stock/finance business logic.

**Tech Stack:** Next.js App Router, React client component for theme toggle, TypeScript, Tailwind utility classes backed by CSS custom properties, Vitest server-rendered component tests.

## Global Constraints

- Manual dark mode only; no OS auto mode for this delivery.
- Persist theme locally in the browser; do not change database schema.
- Do not add theme, chart, animation, or UI libraries.
- Do not alter sales, stock, delivery, finance, or authentication business rules.
- Dashboard remains a daily workbench with dominant `Comecar venda` CTA at the top.
- All visual colors should go through tokens where practical, not one-off hex values in JSX.
- Text contrast must remain readable in light and dark themes.
- Keep changes small and focused on theme, app shell, base components, and dashboard.

---

## File Structure

- `apps/web/src/app/globals.css`: define light and dark token sets and browser color-scheme.
- `apps/web/src/components/theme/theme-toggle.tsx`: client component that reads/writes localStorage and applies `data-theme`.
- `apps/web/src/components/theme/theme-toggle.test.tsx`: tests for accessible render and persisted toggle behavior.
- `apps/web/src/components/layout/app-shell.tsx`: render the toggle and replace hardcoded white surfaces with tokens.
- `apps/web/src/components/layout/app-shell.test.ts`: assert nav still works and theme toggle is present.
- `apps/web/src/components/ui/panel.tsx`: ensure default surface uses `--card`, while custom backgrounds still work.
- `apps/web/src/components/ui/ui.test.tsx`: extend token/theme and panel regressions.
- `apps/web/src/app/(app)/dashboard/page.tsx`: replace broken hero colors with tokenized surfaces and improve hierarchy.
- `apps/web/src/app/(app)/dashboard/page.test.tsx`: assert dashboard avoids conflicting color classes and keeps CTA/sections.

---

### Task 1: Global Theme Tokens And Panel Surface

**Files:**
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/components/ui/panel.tsx`
- Modify: `apps/web/src/components/ui/ui.test.tsx`

**Interfaces:**
- Consumes: existing CSS token names such as `--background`, `--foreground`, `--card`, `--card-muted`, `--border`, `--brand`, semantic tokens.
- Produces: global `[data-theme="dark"]` token overrides and token-safe `Panel` default surface.

- [ ] **Step 1: Write failing token and panel tests**

In `apps/web/src/components/ui/ui.test.tsx`, add tests inside `describe("ui foundation", () => { ... })`:

```tsx
  it("defines dark theme tokens for the app surface", () => {
    const css = readFileSync("src/app/globals.css", "utf8");

    expect(css).toContain('[data-theme="dark"]');
    expect(css).toContain("--card:");
    expect(css).toContain("--hero-surface:");
    expect(css).toContain("color-scheme: dark");
  });

  it("uses tokenized panel surfaces by default", () => {
    const html = renderToStaticMarkup(<Panel>Conteudo</Panel>);

    expect(html).toContain("bg-[var(--card)]");
    expect(html).not.toContain("bg-white");
  });
```

Keep the existing custom-background regression:

```tsx
  it("does not keep the default white background when a panel receives a custom background", () => {
    const html = renderToStaticMarkup(<Panel className="bg-[var(--foreground)] text-white">Hero</Panel>);

    expect(html).toContain("bg-[var(--foreground)]");
    expect(html).not.toContain("bg-white");
  });
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm --filter web test -- src/components/ui/ui.test.tsx
```

Expected: FAIL because dark tokens do not exist and `Panel` default surface is not tokenized.

- [ ] **Step 3: Implement CSS tokens**

In `apps/web/src/app/globals.css`, update `:root` and add `[data-theme="dark"]`:

```css
:root {
  color-scheme: light;
  --background: #f4f8fb;
  --foreground: #102033;
  --muted: #50667d;
  --subtle: #50667d;
  --card: #ffffff;
  --card-muted: #edf4f8;
  --surface-raised: #ffffff;
  --hero-surface: #0c5f86;
  --hero-surface-muted: #e6f5fb;
  --border: #d6e2ea;
  --border-soft: #e7eef3;
  --brand: #0877a8;
  --brand-strong: #075f86;
  --brand-soft: #e6f5fb;
  --success: #0f7a4f;
  --success-soft: #e8f7ef;
  --warning: #a15c00;
  --warning-soft: #fff3d6;
  --danger: #b42318;
  --danger-soft: #fff0ee;
  --info: #0a6f9f;
  --info-soft: #e6f5fb;
  --radius-control: 10px;
  --radius-panel: 16px;
  --shadow-focus: 0 0 0 3px rgb(8 119 168 / 18%);
}

[data-theme="dark"] {
  color-scheme: dark;
  --background: #07131f;
  --foreground: #edf7ff;
  --muted: #9bb2c7;
  --subtle: #8ba4ba;
  --card: #0e2030;
  --card-muted: #142b3d;
  --surface-raised: #13293b;
  --hero-surface: #07334a;
  --hero-surface-muted: #10283a;
  --border: #274257;
  --border-soft: #1d3548;
  --brand: #4bb8e8;
  --brand-strong: #7fd2f2;
  --brand-soft: #0d2f44;
  --success: #68d69b;
  --success-soft: #123625;
  --warning: #f3bf5b;
  --warning-soft: #3c2b11;
  --danger: #ff9a8f;
  --danger-soft: #3f1717;
  --info: #8ed8ff;
  --info-soft: #123246;
  --shadow-focus: 0 0 0 3px rgb(75 184 232 / 24%);
}
```

- [ ] **Step 4: Tokenize Panel default surface**

In `apps/web/src/components/ui/panel.tsx`, ensure the implementation is:

```tsx
import type { HTMLAttributes } from "react";

import { cx } from "@/lib/ui";

export function Panel({ className, ...props }: HTMLAttributes<HTMLElement>) {
  const hasCustomBackground = typeof className === "string" && /(?:^|\s)bg-/.test(className);

  return (
    <section
      className={cx(
        "rounded-[var(--radius-panel)] border border-[var(--border)]",
        !hasCustomBackground && "bg-[var(--card)]",
        className,
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 5: Run tests and verify pass**

Run:

```bash
pnpm --filter web test -- src/components/ui/ui.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/globals.css apps/web/src/components/ui/panel.tsx apps/web/src/components/ui/ui.test.tsx
git commit -m "feat(web): add theme tokens"
```

---

### Task 2: Manual Theme Toggle In App Shell

**Files:**
- Create: `apps/web/src/components/theme/theme-toggle.tsx`
- Create: `apps/web/src/components/theme/theme-toggle.test.tsx`
- Modify: `apps/web/src/components/layout/app-shell.tsx`
- Modify: `apps/web/src/components/layout/app-shell.test.ts`

**Interfaces:**
- Consumes: `[data-theme="light" | "dark"]` CSS token mechanism from Task 1.
- Produces: `ThemeToggle` React component with no props.

- [ ] **Step 1: Write failing ThemeToggle tests**

Create `apps/web/src/components/theme/theme-toggle.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Update shell test expectations**

In `apps/web/src/components/layout/app-shell.test.ts`, add an assertion to the existing shell render test, or add this test if none renders the shell:

```ts
expect(html).toContain("Tema");
```

- [ ] **Step 3: Run tests and verify failure**

Run:

```bash
pnpm --filter web test -- src/components/theme/theme-toggle.test.tsx src/components/layout/app-shell.test.ts
```

Expected: FAIL because `ThemeToggle` does not exist and shell does not render it.

- [ ] **Step 4: Implement ThemeToggle**

Create `apps/web/src/components/theme/theme-toggle.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

const storageKey = "planeta-agua-theme";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.localStorage.getItem(storageKey) === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const storedTheme = getStoredTheme();
    setTheme(storedTheme);
    applyTheme(storedTheme);
  }, []);

  function handleToggle() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem(storageKey, nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <Button
      type="button"
      variant="secondary"
      className="motion-reduce:transition-none"
      aria-label={`Tema ${theme === "dark" ? "escuro" : "claro"}. Alternar tema.`}
      onClick={handleToggle}
    >
      Tema: {theme === "dark" ? "Escuro" : "Claro"}
    </Button>
  );
}
```

- [ ] **Step 5: Render ThemeToggle and tokenized shell surfaces**

In `apps/web/src/components/layout/app-shell.tsx`:

Add import:

```tsx
import { ThemeToggle } from "@/components/theme/theme-toggle";
```

Change shell surfaces:

```tsx
<aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[var(--border)] bg-[var(--card)] p-4 lg:block">
```

```tsx
<header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--background)]/95 px-5 py-4 backdrop-blur">
```

```tsx
<details className="mt-4 rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--card)] p-2 lg:hidden">
```

Render toggle before logout:

```tsx
<div className="flex items-center gap-2">
  <ThemeToggle />
  <form action={handleLogout}>
    <Button className="motion-reduce:transition-none" variant="secondary" type="submit" disabled={isPending}>
      {isPending ? "Saindo..." : "Sair"}
    </Button>
  </form>
</div>
```

- [ ] **Step 6: Run tests and verify pass**

Run:

```bash
pnpm --filter web test -- src/components/theme/theme-toggle.test.tsx src/components/layout/app-shell.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/theme apps/web/src/components/layout/app-shell.tsx apps/web/src/components/layout/app-shell.test.ts
git commit -m "feat(web): add manual theme toggle"
```

---

### Task 3: Dashboard Color Polish

**Files:**
- Modify: `apps/web/src/app/(app)/dashboard/page.tsx`
- Modify: `apps/web/src/app/(app)/dashboard/page.test.tsx`

**Interfaces:**
- Consumes: `--hero-surface`, `--hero-surface-muted`, `--brand-soft`, `--card`, `--card-muted`, and semantic tokens from Task 1.
- Produces: dashboard markup without conflicting `bg-white`/white-text hero and with light/dark-safe surfaces.

- [ ] **Step 1: Write failing dashboard color regression tests**

In `apps/web/src/app/(app)/dashboard/page.test.tsx`, add tests for rendered `DashboardView`:

```tsx
  it("uses tokenized hero colors instead of foreground-as-background", () => {
    const html = renderToStaticMarkup(
      createElement(DashboardView, {
        data: dashboard,
        userRole: "ADMIN",
        userName: "Admin",
        cashDetails,
      }),
    );

    expect(html).toContain("bg-[var(--hero-surface)]");
    expect(html).not.toContain("bg-[var(--foreground)]");
  });

  it("keeps the sale CTA dominant in the top workbench", () => {
    const html = renderToStaticMarkup(
      createElement(DashboardView, {
        data: dashboard,
        userRole: "ADMIN",
        userName: "Admin",
        cashDetails,
      }),
    );

    expect(html).toContain('href="/vendas"');
    expect(html).toContain("Comecar venda");
    expect(html).toContain("bg-[var(--surface-raised)]");
  });
```

Use existing fixture names in the test file. If fixture names differ, adapt only names, not behavior.

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm --filter web test -- src/app/\(app\)/dashboard/page.test.tsx
```

Expected: FAIL because dashboard currently uses `bg-[var(--foreground)]` and CTA styling does not use `--surface-raised`.

- [ ] **Step 3: Update dashboard hero and status card**

In `apps/web/src/app/(app)/dashboard/page.tsx`, change hero panel class from:

```tsx
<Panel className="flex min-h-56 flex-col justify-between bg-[var(--foreground)] p-6 text-white">
```

to:

```tsx
<Panel className="flex min-h-56 flex-col justify-between bg-[var(--hero-surface)] p-6 text-white">
```

Change primary CTA class to:

```tsx
className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-white/20 bg-[var(--surface-raised)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition duration-150 hover:bg-[var(--card-muted)] motion-reduce:transition-none"
```

Change secondary hero links to include motion-reduce:

```tsx
className="inline-flex min-h-10 items-center rounded-[var(--radius-control)] border border-white/20 px-4 text-sm font-medium text-white transition duration-150 hover:bg-white/10 motion-reduce:transition-none"
```

Change `OperationalStatusRow` content class from `bg-[var(--card-muted)]` to:

```tsx
"flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-[var(--border-soft)] bg-[var(--hero-surface-muted)] px-3 py-2 transition duration-150 hover:border-[var(--brand)] motion-reduce:transition-none"
```

- [ ] **Step 4: Run dashboard tests and verify pass**

Run:

```bash
pnpm --filter web test -- src/app/\(app\)/dashboard/page.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(app\)/dashboard/page.tsx apps/web/src/app/\(app\)/dashboard/page.test.tsx
git commit -m "fix(web): polish dashboard theme colors"
```

---

### Task 4: Verification And Runtime Check

**Files:**
- No required file changes unless verification reveals a defect.

**Interfaces:**
- Consumes: completed Tasks 1-3.
- Produces: verified dashboard/theme implementation ready for review.

- [ ] **Step 1: Run focused tests**

Run:

```bash
pnpm --dir apps/api exec vitest run scripts/seed/sales.test.ts
pnpm --filter web test -- src/components/ui/ui.test.tsx src/components/theme/theme-toggle.test.tsx src/components/layout/app-shell.test.ts src/app/\(app\)/dashboard/page.test.tsx
```

Expected: all focused tests PASS.

- [ ] **Step 2: Run quality checks**

Run:

```bash
pnpm run typecheck
pnpm run lint
```

Expected: both PASS.

- [ ] **Step 3: Check runtime pages**

If dev server is running, check:

```bash
curl -fsS "http://localhost:3333/health"
curl -fsS -b "C:/Users/felip/AppData/Local/Temp/opencode/planeta-agua-cookies.txt" "http://localhost:3000/dashboard" >/dev/null
curl -fsS -b "C:/Users/felip/AppData/Local/Temp/opencode/planeta-agua-cookies.txt" "http://localhost:3000/entregas" >/dev/null
```

Expected: all commands exit 0.

- [ ] **Step 4: Commit verification fix if needed**

If Step 1-3 reveal a code defect, fix the smallest issue, rerun the relevant command, and commit:

```bash
git add <changed-files>
git commit -m "fix(web): finalize dashboard theme"
```

If no defect is found, do not create an empty commit.

---

## Self-Review

- Spec coverage: theme tokens, manual toggle, persistence, dashboard polish, tokenized surfaces, accessibility intent, and tests are covered.
- Placeholder scan: no TBD/TODO placeholders remain.
- Type consistency: `ThemeToggle` has no props; theme values are `"light" | "dark"`; CSS tokens used by dashboard are defined in Task 1.
