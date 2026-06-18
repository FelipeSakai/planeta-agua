# UI Redesign Stage 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable UI foundation and redesign the current app shell, estoque, produtos, dashboard, and login screens for a modern but lightweight operational MVP.

**Architecture:** Keep UI assets local to `apps/web/src/components/ui` and keep feature-specific view logic inside each route folder. Use client-side filtering/sorting only for current in-memory product/stock lists; do not change backend contracts in this stage. Preserve all existing permissions and mutation behavior.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, Vitest with server-side React rendering tests.

## Global Constraints

- No new heavy UI or animation dependency.
- Interface must remain lightweight for weak PCs.
- Animations must be subtle, 150ms to 200ms, CSS-only where possible, and respect `prefers-reduced-motion`.
- UI must be modern and easy to use, not ERP-old, SaaS-decorative, or raw spreadsheet-like.
- Reusable assets/components are required; avoid repeating long Tailwind class strings inside every page.
- Preserve current product and stock business rules, permissions, and API contracts.
- Simple daily/monthly cash reports are in MVP, but implementation is deferred until the sales module exists with real data.
- Before editing Next.js App Router code, read the relevant guide in `node_modules/next/dist/docs/` per `AGENTS.md`.

---

## Scope Decision

This plan implements stage 1: reusable UI assets and redesign of existing screens. It does not implement daily/monthly sales reports yet because there is no completed sales module or sales data source in the current app. Create a separate reports plan after sales exists.

## File Structure

- `DESIGN.md`: root design context for Impeccable and future UI work.
- `apps/web/src/app/globals.css`: shared tokens, base body style, focus ring, reduced-motion behavior.
- `apps/web/src/lib/ui.ts`: small `cx()` helper for class composition.
- `apps/web/src/components/ui/button.tsx`: reusable button variants.
- `apps/web/src/components/ui/form-controls.tsx`: field wrapper plus input, textarea, and select primitives.
- `apps/web/src/components/ui/badge.tsx`: reusable status badges.
- `apps/web/src/components/ui/alert.tsx`: reusable alert messages.
- `apps/web/src/components/ui/panel.tsx`: reusable surface/panel component.
- `apps/web/src/components/ui/page-header.tsx`: page heading and action area.
- `apps/web/src/components/ui/metric-card.tsx`: reusable summary metric.
- `apps/web/src/components/ui/toolbar.tsx`: table search/filter/action toolbar.
- `apps/web/src/components/ui/data-table.tsx`: responsive dense table/list component.
- `apps/web/src/components/ui/empty-state.tsx`: reusable empty state.
- `apps/web/src/components/ui/loading-skeleton.tsx`: lightweight skeleton blocks.
- `apps/web/src/components/ui/ui.test.tsx`: server-render tests for base components.
- `apps/web/src/components/layout/app-shell.tsx`: redesigned app shell and active nav.
- `apps/web/src/components/layout/app-shell.test.tsx`: role and active navigation tests.
- `apps/web/src/app/(app)/estoque/stock-view-model.ts`: stock filtering, sorting, and last movement helpers.
- `apps/web/src/app/(app)/estoque/stock-view-model.test.ts`: tests for stock filters/sorts.
- `apps/web/src/app/(app)/estoque/stock-ui.tsx`: redesigned stock screen.
- `apps/web/src/app/(app)/estoque/stock-ui.test.tsx`: update assertions for table, toolbar, action panel, and permissions.
- `apps/web/src/app/(app)/produtos/product-view-model.ts`: product filtering and status helpers.
- `apps/web/src/app/(app)/produtos/product-view-model.test.ts`: tests for product filters.
- `apps/web/src/app/(app)/produtos/products-ui.tsx`: redesigned products screen.
- `apps/web/src/app/(app)/produtos/products-ui.test.tsx`: update assertions for table/search/admin actions.
- `apps/web/src/app/(app)/dashboard/page.tsx`: redesigned dashboard placeholder using reusable components.
- `apps/web/src/app/(auth)/login/login-form.tsx`: login form using reusable UI controls.

---

### Task 1: UI Foundation And Tokens

**Files:**
- Create: `DESIGN.md`
- Create: `apps/web/src/lib/ui.ts`
- Create: `apps/web/src/components/ui/form-controls.tsx`
- Create: `apps/web/src/components/ui/badge.tsx`
- Create: `apps/web/src/components/ui/alert.tsx`
- Create: `apps/web/src/components/ui/panel.tsx`
- Create: `apps/web/src/components/ui/page-header.tsx`
- Create: `apps/web/src/components/ui/metric-card.tsx`
- Create: `apps/web/src/components/ui/toolbar.tsx`
- Create: `apps/web/src/components/ui/data-table.tsx`
- Create: `apps/web/src/components/ui/empty-state.tsx`
- Create: `apps/web/src/components/ui/loading-skeleton.tsx`
- Create: `apps/web/src/components/ui/ui.test.tsx`
- Modify: `apps/web/src/components/ui/button.tsx`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**
- Produces: `cx(...classes: Array<string | false | null | undefined>): string`.
- Produces: `Button`, `Field`, `TextInput`, `TextArea`, `SelectInput`, `Badge`, `Alert`, `Panel`, `PageHeader`, `MetricCard`, `Toolbar`, `DataTable`, `EmptyState`, `LoadingSkeleton`.
- Consumers: app shell, login, dashboard, stock UI, products UI.

- [ ] **Step 1: Read Next.js App Router docs before edits**

Run: `ls node_modules/next/dist/docs`

Expected: directory exists. Then read the relevant App Router documentation files before changing page/layout code in later tasks.

- [ ] **Step 2: Write failing UI component tests**

Create `apps/web/src/components/ui/ui.test.tsx`:

```tsx
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Alert } from "./alert";
import { Badge } from "./badge";
import { Button } from "./button";
import { DataTable } from "./data-table";
import { EmptyState } from "./empty-state";
import { Field, SelectInput, TextInput } from "./form-controls";
import { MetricCard } from "./metric-card";
import { PageHeader } from "./page-header";
import { Panel } from "./panel";
import { Toolbar } from "./toolbar";

describe("ui foundation", () => {
  it("renders reusable status and feedback assets", () => {
    const html = renderToStaticMarkup(
      <Panel>
        <PageHeader title="Estoque" description="Conferencia rapida" actions={<Button>Registrar</Button>} />
        <Alert variant="warning">Estoque baixo</Alert>
        <Badge variant="danger">Baixo</Badge>
        <MetricCard label="Produtos" value={12} tone="warning" />
      </Panel>,
    );

    expect(html).toContain("Estoque");
    expect(html).toContain("Registrar");
    expect(html).toContain("Estoque baixo");
    expect(html).toContain("Baixo");
    expect(html).toContain("Produtos");
  });

  it("renders accessible form controls", () => {
    const html = renderToStaticMarkup(
      <Field label="Produto" help="Escolha um item" error="Obrigatorio">
        <TextInput name="product" />
      </Field>,
    );

    expect(html).toContain("Produto");
    expect(html).toContain("Escolha um item");
    expect(html).toContain("Obrigatorio");
    expect(html).toContain("name=\"product\"");
  });

  it("renders toolbar and responsive data table", () => {
    const html = renderToStaticMarkup(
      <>
        <Toolbar>
          <TextInput name="search" placeholder="Buscar" />
          <SelectInput name="status" defaultValue="ALL">
            <option value="ALL">Todos</option>
          </SelectInput>
        </Toolbar>
        <DataTable
          rows={[{ id: "1", name: "Galao", stock: 2 }]}
          rowKey={(row) => row.id}
          columns={[
            { key: "name", header: "Produto", cell: (row) => row.name },
            { key: "stock", header: "Estoque", cell: (row) => row.stock },
          ]}
          renderMobileCard={(row) => <strong>{row.name}</strong>}
          empty={<EmptyState title="Nada encontrado" description="Ajuste os filtros." />}
        />
      </>,
    );

    expect(html).toContain("Buscar");
    expect(html).toContain("Produto");
    expect(html).toContain("Galao");
    expect(html).toContain("Estoque");
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run: `pnpm --filter web test -- src/components/ui/ui.test.tsx`

Expected: FAIL because the new UI modules do not exist yet.

- [ ] **Step 4: Add shared class helper**

Create `apps/web/src/lib/ui.ts`:

```ts
export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
```

- [ ] **Step 5: Replace global tokens and base motion rules**

Update `apps/web/src/app/globals.css` with these tokens and base rules while preserving `@import "tailwindcss";`:

```css
@import "tailwindcss";

:root {
  --background: #f4f8fb;
  --foreground: #102033;
  --muted: #5d7086;
  --subtle: #7b8da1;
  --card: #ffffff;
  --card-muted: #edf4f8;
  --border: #d6e2ea;
  --border-soft: #e7eef3;
  --brand: #0877a8;
  --brand-strong: #075f86;
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

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

* {
  box-sizing: border-box;
}

html {
  background: var(--background);
}

body {
  min-height: 100vh;
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-geist-sans), Arial, Helvetica, sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}

:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
  box-shadow: var(--shadow-focus);
}

::selection {
  background: rgb(8 119 168 / 18%);
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 6: Implement UI components**

Create or replace the listed files with these exports:

```tsx
// apps/web/src/components/ui/button.tsx
import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/ui";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; isLoading?: boolean };

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)]",
  secondary: "border border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-[var(--card-muted)]",
  ghost: "text-[var(--foreground)] hover:bg-[var(--card-muted)]",
  danger: "bg-[var(--danger)] text-white hover:bg-[#8f1d15]",
};

export function Button({ className, type = "button", variant = "primary", isLoading = false, disabled, children, ...props }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={cx(
        "inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] px-4 py-2 text-sm font-medium transition duration-150 disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className,
      )}
      {...props}
    >
      {isLoading ? "Carregando..." : children}
    </button>
  );
}
```

Use the same naming and visual language for the remaining primitives:

```tsx
// apps/web/src/components/ui/panel.tsx
import type { HTMLAttributes } from "react";
import { cx } from "@/lib/ui";

export function Panel({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cx("rounded-[var(--radius-panel)] border border-[var(--border)] bg-white", className)} {...props} />;
}
```

```tsx
// apps/web/src/components/ui/badge.tsx
import type { HTMLAttributes } from "react";
import { cx } from "@/lib/ui";

type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info";
const variants: Record<BadgeVariant, string> = {
  neutral: "bg-[var(--card-muted)] text-[var(--foreground)]",
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  info: "bg-[var(--info-soft)] text-[var(--info)]",
};

export function Badge({ className, variant = "neutral", ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", variants[variant], className)} {...props} />;
}
```

```tsx
// apps/web/src/components/ui/form-controls.tsx
import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cx } from "@/lib/ui";

export function Field({ label, help, error, className, children }: { label: string; help?: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cx("block space-y-2", className)}>
      <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
      {children}
      {help ? <span className="block text-xs text-[var(--muted)]">{help}</span> : null}
      {error ? <span className="block text-xs font-medium text-[var(--danger)]">{error}</span> : null}
    </label>
  );
}

const controlClass = "min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] transition duration-150 placeholder:text-[var(--subtle)] hover:border-[var(--brand)] focus:border-[var(--brand)] focus:outline-none disabled:cursor-not-allowed disabled:bg-[var(--card-muted)] disabled:text-[var(--muted)]";

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(controlClass, className)} {...props} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(controlClass, "min-h-24 py-2", className)} {...props} />;
}

export function SelectInput({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(controlClass, className)} {...props} />;
}
```

```tsx
// apps/web/src/components/ui/alert.tsx
import type { HTMLAttributes } from "react";
import { cx } from "@/lib/ui";

type AlertVariant = "info" | "success" | "warning" | "danger";
const variants: Record<AlertVariant, string> = {
  info: "bg-[var(--info-soft)] text-[var(--info)]",
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

export function Alert({ className, variant = "info", ...props }: HTMLAttributes<HTMLParagraphElement> & { variant?: AlertVariant }) {
  return <p role="alert" aria-live="polite" className={cx("rounded-xl px-4 py-3 text-sm font-medium", variants[variant], className)} {...props} />;
}
```

```tsx
// apps/web/src/components/ui/page-header.tsx
import type { ReactNode } from "react";

export function PageHeader({ title, description, eyebrow, actions }: { title: string; description?: string; eyebrow?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        {eyebrow ? <p className="text-sm font-medium text-[var(--muted)]">{eyebrow}</p> : null}
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
```

```tsx
// apps/web/src/components/ui/metric-card.tsx
import { Badge } from "./badge";
import { Panel } from "./panel";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

export function MetricCard({ label, value, detail, tone = "neutral" }: { label: string; value: string | number; detail?: string; tone?: Tone }) {
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">{label}</p>
        {tone !== "neutral" ? <Badge variant={tone}>{tone === "warning" ? "Atenção" : "OK"}</Badge> : null}
      </div>
      <strong className="mt-2 block text-2xl font-semibold tracking-[-0.02em]">{value}</strong>
      {detail ? <p className="mt-1 text-xs text-[var(--subtle)]">{detail}</p> : null}
    </Panel>
  );
}
```

```tsx
// apps/web/src/components/ui/toolbar.tsx
import type { ReactNode } from "react";

export function Toolbar({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-panel)] border border-[var(--border)] bg-white p-3 md:flex-row md:items-center md:justify-between">
      <div className="grid flex-1 gap-2 md:grid-cols-[minmax(220px,1fr)_auto_auto]">{children}</div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
```

```tsx
// apps/web/src/components/ui/data-table.tsx
import type { ReactNode } from "react";

export type DataTableColumn<T> = { key: string; header: string; cell: (row: T) => ReactNode; className?: string };

export function DataTable<T>({ rows, columns, rowKey, empty, renderMobileCard }: { rows: T[]; columns: Array<DataTableColumn<T>>; rowKey: (row: T) => string; empty: ReactNode; renderMobileCard: (row: T) => ReactNode }) {
  if (rows.length === 0) {
    return <>{empty}</>;
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border)] bg-white">
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-[var(--card-muted)] text-xs font-medium text-[var(--muted)]">
            <tr>{columns.map((column) => <th className="px-4 py-3" key={column.key}>{column.header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-soft)]">
            {rows.map((row) => <tr className="transition duration-150 hover:bg-[var(--card-muted)]" key={rowKey(row)}>{columns.map((column) => <td className={column.className ?? "px-4 py-3 align-middle"} key={column.key}>{column.cell(row)}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-[var(--border-soft)] md:hidden">{rows.map((row) => <article className="p-4" key={rowKey(row)}>{renderMobileCard(row)}</article>)}</div>
    </div>
  );
}
```

```tsx
// apps/web/src/components/ui/empty-state.tsx
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return <div className="rounded-[var(--radius-panel)] border border-dashed border-[var(--border)] bg-white p-8 text-center"><h2 className="text-lg font-semibold">{title}</h2>{description ? <p className="mt-2 text-sm text-[var(--muted)]">{description}</p> : null}{action ? <div className="mt-4">{action}</div> : null}</div>;
}
```

```tsx
// apps/web/src/components/ui/loading-skeleton.tsx
import { cx } from "@/lib/ui";

export function LoadingSkeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-md bg-[var(--border-soft)]", className)} />;
}
```

- [ ] **Step 7: Add root design context**

Create `DESIGN.md` with the current product design language:

```md
# Design System

## Register

product

## Direction

Modern operational UI for an internal water store system. Clear surfaces, dense but readable tables, restrained color, strong focus states, and reusable assets over one-off styling.

## Colors

- Background: `#f4f8fb`
- Foreground: `#102033`
- Muted: `#5d7086`
- Surface: `#ffffff`
- Surface muted: `#edf4f8`
- Border: `#d6e2ea`
- Accent: `#0877a8`
- Danger: `#b42318`
- Warning: `#a15c00`
- Success: `#0f7a4f`

## Components

- Button: primary, secondary, ghost, danger.
- Form controls: input, textarea, select, field wrapper.
- Feedback: badge, alert, empty state, loading skeleton.
- Layout: panel, page header, metric card, toolbar, data table.

## Motion

Use 150ms to 200ms CSS transitions for hover, focus, and lightweight state feedback. Respect `prefers-reduced-motion`.
```

- [ ] **Step 8: Run UI tests**

Run: `pnpm --filter web test -- src/components/ui/ui.test.tsx`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add DESIGN.md apps/web/src/app/globals.css apps/web/src/lib/ui.ts apps/web/src/components/ui
git commit -m "feat: add reusable ui foundation"
```

---

### Task 2: App Shell And Login Redesign

**Files:**
- Modify: `apps/web/src/components/layout/app-shell.tsx`
- Create: `apps/web/src/components/layout/app-shell.test.tsx`
- Modify: `apps/web/src/app/(auth)/login/login-form.tsx`

**Interfaces:**
- Consumes: UI foundation from Task 1.
- Produces: `getNavigationItems(role: UserRole, pathname: string)` with active-state metadata.

- [ ] **Step 1: Write failing app shell tests**

Create `apps/web/src/components/layout/app-shell.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";

import { getNavigationItems } from "./app-shell";

describe("app shell navigation", () => {
  it("marks the current route active", () => {
    const items = getNavigationItems("ADMIN", "/estoque");
    expect(items.find((item) => item.href === "/estoque")?.isActive).toBe(true);
    expect(items.find((item) => item.href === "/produtos")?.isActive).toBe(false);
  });

  it("keeps admin-only modules hidden from operators", () => {
    const items = getNavigationItems("OPERATOR", "/financeiro");
    expect(items.map((item) => item.href)).not.toContain("/financeiro");
    expect(items.map((item) => item.href)).not.toContain("/usuarios");
    expect(items.map((item) => item.href)).toContain("/produtos");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm --filter web test -- src/components/layout/app-shell.test.tsx`

Expected: FAIL because `getNavigationItems` does not exist.

- [ ] **Step 3: Implement shell helper and redesign shell**

Modify `apps/web/src/components/layout/app-shell.tsx`:

```tsx
// Add usePathname import from next/navigation.
// Export this helper alongside the existing role visibility behavior.
export function getNavigationItems(role: UserRole, pathname: string) {
  return navigation
    .filter((item) => item.roles.includes(role))
    .map((item) => ({ ...item, isActive: pathname === item.href || pathname.startsWith(`${item.href}/`) }));
}
```

Use `getNavigationItems(user.role, usePathname())` in `AppShell`. Replace repeated hardcoded colors with tokens and UI foundation patterns:

```tsx
<div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
  <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[var(--border)] bg-white p-4 lg:block">
    <div className="rounded-[var(--radius-panel)] bg-[var(--card-muted)] p-4">
      <strong className="block text-lg font-semibold tracking-[-0.02em]">Planeta Agua</strong>
      <span className="mt-1 block text-xs font-medium text-[var(--muted)]">{user.role}</span>
    </div>
    <nav className="mt-5 flex flex-col gap-1">
      {visibleNavigation.map((item) => (
        <a key={item.href} href={item.href} aria-current={item.isActive ? "page" : undefined} className={item.isActive ? "rounded-xl bg-[var(--brand)] px-3 py-2 text-sm font-medium text-white" : "rounded-xl px-3 py-2 text-sm font-medium text-[var(--muted)] transition duration-150 hover:bg-[var(--card-muted)] hover:text-[var(--foreground)]"}>{item.label}</a>
      ))}
    </nav>
  </aside>
</div>
```

Keep logout behavior unchanged.

- [ ] **Step 4: Update login form to use reusable assets**

Modify `apps/web/src/app/(auth)/login/login-form.tsx` to import `Alert`, `Button`, `Field`, `TextInput`, and `Panel`. Keep `handleSubmit` unchanged. Replace the JSX with:

```tsx
<Panel className="p-6 md:p-8">
  <form action={handleSubmit}>
    <div className="space-y-2">
      <p className="text-sm font-medium text-[var(--muted)]">Planeta Agua</p>
      <h2 className="text-2xl font-semibold tracking-[-0.03em]">Entrar no sistema</h2>
      <p className="text-sm text-[var(--muted)]">Use seu e-mail e senha de operador.</p>
    </div>
    <div className="mt-6 space-y-4">
      <Field label="E-mail"><TextInput autoComplete="email" name="email" required type="email" /></Field>
      <Field label="Senha"><TextInput autoComplete="current-password" name="password" required type="password" /></Field>
    </div>
    {error ? <Alert className="mt-4" variant="danger">{error}</Alert> : null}
    <Button className="mt-6 w-full" isLoading={isPending} type="submit">Entrar</Button>
  </form>
</Panel>
```

- [ ] **Step 5: Run shell tests**

Run: `pnpm --filter web test -- src/components/layout/app-shell.test.tsx`

Expected: PASS.

- [ ] **Step 6: Run login and existing web tests**

Run: `pnpm --filter web test`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/layout/app-shell.tsx apps/web/src/components/layout/app-shell.test.tsx apps/web/src/app/(auth)/login/login-form.tsx
git commit -m "feat: redesign app shell and login"
```

---

### Task 3: Stock Dense Table Redesign

**Files:**
- Create: `apps/web/src/app/(app)/estoque/stock-view-model.ts`
- Create: `apps/web/src/app/(app)/estoque/stock-view-model.test.ts`
- Modify: `apps/web/src/app/(app)/estoque/stock-ui.tsx`
- Modify: `apps/web/src/app/(app)/estoque/stock-ui.test.tsx`

**Interfaces:**
- Consumes: `StockPageResponse` from `shared` and UI foundation from Task 1.
- Produces: `filterAndSortStockProducts(products, movements, options)` for client-side stock search/filter/sort.

- [ ] **Step 1: Write failing stock view-model tests**

Create `apps/web/src/app/(app)/estoque/stock-view-model.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { filterAndSortStockProducts, getStockDifference } from "./stock-view-model";

const products = [
  { id: "1", name: "Galao 20L", stockQuantity: 2, minimumStock: 3, isActive: true, isLowStock: true },
  { id: "2", name: "Agua 500ml", stockQuantity: 30, minimumStock: 10, isActive: true, isLowStock: false },
  { id: "3", name: "Copo 200ml", stockQuantity: 0, minimumStock: 5, isActive: false, isLowStock: true },
];

const movements = [
  { id: "m1", productId: "2", productName: "Agua 500ml", userId: "u1", userName: "Admin", type: "IN" as const, quantity: 5, reason: "Compra", createdAt: "2026-06-17T12:00:00.000Z" },
  { id: "m2", productId: "1", productName: "Galao 20L", userId: "u1", userName: "Admin", type: "ADJUSTMENT" as const, quantity: -1, reason: "Conferencia", createdAt: "2026-06-17T10:00:00.000Z" },
];

describe("stock view model", () => {
  it("calculates stock difference against minimum", () => {
    expect(getStockDifference(products[0])).toBe(-1);
    expect(getStockDifference(products[1])).toBe(20);
  });

  it("filters by search and low stock", () => {
    const rows = filterAndSortStockProducts(products, movements, { search: "galao", status: "LOW", sort: "NAME" });
    expect(rows.map((row) => row.name)).toEqual(["Galao 20L"]);
    expect(rows[0].lastMovement?.reason).toBe("Conferencia");
  });

  it("sorts by lowest stock and movement recency", () => {
    expect(filterAndSortStockProducts(products, movements, { search: "", status: "ALL", sort: "LOWEST_STOCK" }).map((row) => row.name)).toEqual(["Copo 200ml", "Galao 20L", "Agua 500ml"]);
    expect(filterAndSortStockProducts(products, movements, { search: "", status: "ALL", sort: "RECENT_MOVEMENT" }).map((row) => row.name)[0]).toBe("Agua 500ml");
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter web test -- src/app/\(app\)/estoque/stock-view-model.test.ts`

Expected: FAIL because `stock-view-model.ts` does not exist.

- [ ] **Step 3: Implement stock view model**

Create `apps/web/src/app/(app)/estoque/stock-view-model.ts`:

```ts
import type { StockPageResponse } from "shared";

export type StockProduct = StockPageResponse["products"][number];
export type StockMovement = StockPageResponse["movements"][number];
export type StockStatusFilter = "ALL" | "LOW" | "OK" | "INACTIVE";
export type StockSort = "NAME" | "LOWEST_STOCK" | "HIGHEST_STOCK" | "RECENT_MOVEMENT";
export type StockProductRow = StockProduct & { difference: number; lastMovement: StockMovement | null };

export function getStockDifference(product: StockProduct) {
  return product.stockQuantity - product.minimumStock;
}

export function filterAndSortStockProducts(products: StockProduct[], movements: StockMovement[], options: { search: string; status: StockStatusFilter; sort: StockSort }): StockProductRow[] {
  const lastMovementByProduct = new Map<string, StockMovement>();

  for (const movement of movements) {
    const current = lastMovementByProduct.get(movement.productId);
    if (!current || new Date(movement.createdAt).getTime() > new Date(current.createdAt).getTime()) {
      lastMovementByProduct.set(movement.productId, movement);
    }
  }

  const normalizedSearch = options.search.trim().toLowerCase();

  return products
    .map((product) => ({ ...product, difference: getStockDifference(product), lastMovement: lastMovementByProduct.get(product.id) ?? null }))
    .filter((product) => product.name.toLowerCase().includes(normalizedSearch))
    .filter((product) => {
      if (options.status === "LOW") return product.isLowStock;
      if (options.status === "OK") return product.isActive && !product.isLowStock;
      if (options.status === "INACTIVE") return !product.isActive;
      return true;
    })
    .sort((a, b) => {
      if (options.sort === "LOWEST_STOCK") return a.stockQuantity - b.stockQuantity || a.name.localeCompare(b.name, "pt-BR");
      if (options.sort === "HIGHEST_STOCK") return b.stockQuantity - a.stockQuantity || a.name.localeCompare(b.name, "pt-BR");
      if (options.sort === "RECENT_MOVEMENT") return (b.lastMovement ? new Date(b.lastMovement.createdAt).getTime() : 0) - (a.lastMovement ? new Date(a.lastMovement.createdAt).getTime() : 0);
      return a.name.localeCompare(b.name, "pt-BR");
    });
}
```

- [ ] **Step 4: Run view-model tests**

Run: `pnpm --filter web test -- src/app/\(app\)/estoque/stock-view-model.test.ts`

Expected: PASS.

- [ ] **Step 5: Update stock UI tests for new behavior**

Modify `apps/web/src/app/(app)/estoque/stock-ui.test.tsx` to keep existing permission and duplicate-submit tests, and add assertions:

```tsx
it("renders dense stock controls and table labels", () => {
  const html = renderToStaticMarkup(createElement(StockUi, { userRole: "ADMIN", data: stockPage }));

  expect(html).toContain("Buscar produto");
  expect(html).toContain("Status");
  expect(html).toContain("Ordenar");
  expect(html).toContain("Diferença");
  expect(html).toContain("Última movimentação");
});
```

- [ ] **Step 6: Redesign stock UI**

Modify `apps/web/src/app/(app)/estoque/stock-ui.tsx`:

- Import UI assets from Task 1.
- Add `useState` for `search`, `status`, `sort`, and `actionMode`.
- Compute `rows = filterAndSortStockProducts(data.products, data.movements, { search, status, sort })`.
- Replace the two always-visible stock forms with buttons that set `actionMode` to `"ENTRY"` or `"ADJUSTMENT"` and render one compact form panel.
- Render `DataTable` with columns: Produto, Status, Atual, Mínimo, Diferença, Última movimentação, Ações.
- Keep `StockForm` props `submitLabel` and `action` so the duplicate-submit test can still locate actions.
- Preserve `submitEntry`, `submitAdjustment`, `mutationInFlight`, and admin-only mutation behavior.

Use these labels exactly so tests and operator copy are stable:

```tsx
<PageHeader title="Estoque" eyebrow="Controle" description="Confira saldos, veja alertas e registre entradas ou ajustes com rastreabilidade." actions={isAdmin ? <><Button onClick={() => setActionMode("ENTRY")}>Registrar entrada</Button><Button variant="secondary" onClick={() => setActionMode("ADJUSTMENT")}>Registrar ajuste</Button></> : null} />
```

```tsx
<Toolbar>
  <TextInput aria-label="Buscar produto" placeholder="Buscar produto" value={search} onChange={(event) => setSearch(event.target.value)} />
  <SelectInput aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value as StockStatusFilter)}>
    <option value="ALL">Todos</option>
    <option value="LOW">Estoque baixo</option>
    <option value="OK">OK</option>
    <option value="INACTIVE">Inativos</option>
  </SelectInput>
  <SelectInput aria-label="Ordenar" value={sort} onChange={(event) => setSort(event.target.value as StockSort)}>
    <option value="LOWEST_STOCK">Menor estoque</option>
    <option value="HIGHEST_STOCK">Maior estoque</option>
    <option value="NAME">Nome</option>
    <option value="RECENT_MOVEMENT">Movimentação recente</option>
  </SelectInput>
</Toolbar>
```

- [ ] **Step 7: Run stock tests**

Run: `pnpm --filter web test -- src/app/\(app\)/estoque/stock-view-model.test.ts src/app/\(app\)/estoque/stock-ui.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/app/(app)/estoque
git commit -m "feat: redesign stock screen"
```

---

### Task 4: Products Dense List Redesign

**Files:**
- Create: `apps/web/src/app/(app)/produtos/product-view-model.ts`
- Create: `apps/web/src/app/(app)/produtos/product-view-model.test.ts`
- Modify: `apps/web/src/app/(app)/produtos/products-ui.tsx`
- Modify: `apps/web/src/app/(app)/produtos/products-ui.test.tsx`

**Interfaces:**
- Consumes: `ProductResponse` from `shared` and UI foundation from Task 1.
- Produces: `filterProducts(products, options)` for client-side product search/status filter.

- [ ] **Step 1: Write failing product view-model tests**

Create `apps/web/src/app/(app)/produtos/product-view-model.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { filterProducts } from "./product-view-model";

const products = [
  { id: "1", name: "Galao 20L", description: "Retornavel", salePriceCents: 1200, stockQuantity: 2, minimumStock: 3, isActive: true, isLowStock: true },
  { id: "2", name: "Agua 500ml", description: null, salePriceCents: 250, stockQuantity: 30, minimumStock: 10, isActive: true, isLowStock: false },
  { id: "3", name: "Copo 200ml", description: null, salePriceCents: 100, stockQuantity: 0, minimumStock: 5, isActive: false, isLowStock: true },
];

describe("product view model", () => {
  it("filters by search", () => {
    expect(filterProducts(products, { search: "galao", status: "ALL" }).map((product) => product.name)).toEqual(["Galao 20L"]);
  });

  it("filters by status", () => {
    expect(filterProducts(products, { search: "", status: "ACTIVE" }).map((product) => product.name)).toEqual(["Agua 500ml", "Galao 20L"]);
    expect(filterProducts(products, { search: "", status: "LOW" }).map((product) => product.name)).toEqual(["Copo 200ml", "Galao 20L"]);
    expect(filterProducts(products, { search: "", status: "INACTIVE" }).map((product) => product.name)).toEqual(["Copo 200ml"]);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter web test -- src/app/\(app\)/produtos/product-view-model.test.ts`

Expected: FAIL because `product-view-model.ts` does not exist.

- [ ] **Step 3: Implement product view model**

Create `apps/web/src/app/(app)/produtos/product-view-model.ts`:

```ts
import type { ProductResponse } from "shared";

export type ProductStatusFilter = "ALL" | "ACTIVE" | "LOW" | "INACTIVE";

export function filterProducts(products: ProductResponse[], options: { search: string; status: ProductStatusFilter }) {
  const normalizedSearch = options.search.trim().toLowerCase();

  return products
    .filter((product) => product.name.toLowerCase().includes(normalizedSearch) || (product.description ?? "").toLowerCase().includes(normalizedSearch))
    .filter((product) => {
      if (options.status === "ACTIVE") return product.isActive;
      if (options.status === "LOW") return product.isLowStock;
      if (options.status === "INACTIVE") return !product.isActive;
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
```

- [ ] **Step 4: Run product view-model tests**

Run: `pnpm --filter web test -- src/app/\(app\)/produtos/product-view-model.test.ts`

Expected: PASS.

- [ ] **Step 5: Redesign products UI using reusable components**

Modify `apps/web/src/app/(app)/produtos/products-ui.tsx`:

- Import `Alert`, `Badge`, `Button`, `DataTable`, `EmptyState`, `Field`, `MetricCard`, `PageHeader`, `Panel`, `SelectInput`, `TextArea`, `TextInput`, `Toolbar`.
- Add state: `search` and `status` with type `ProductStatusFilter`.
- Render `PageHeader`, three `MetricCard`s, one `Toolbar`, and one `DataTable`.
- Keep product create/edit/toggle behavior unchanged.
- Keep stock quantity read-only when editing.
- Use labels exactly: `Buscar produto`, `Status`, `Novo produto`, `Editar`, `Inativar`, `Ativar`.

Use this toolbar shape:

```tsx
<Toolbar actions={isAdmin ? <Button onClick={() => { setEditingProduct(null); setFormOpen(true); }}>Novo produto</Button> : null}>
  <TextInput aria-label="Buscar produto" placeholder="Buscar produto" value={search} onChange={(event) => setSearch(event.target.value)} />
  <SelectInput aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value as ProductStatusFilter)}>
    <option value="ALL">Todos</option>
    <option value="ACTIVE">Ativos</option>
    <option value="LOW">Estoque baixo</option>
    <option value="INACTIVE">Inativos</option>
  </SelectInput>
</Toolbar>
```

- [ ] **Step 6: Update products UI tests**

Extend `apps/web/src/app/(app)/produtos/products-ui.test.tsx` with assertions that server-rendered markup contains `Buscar produto`, `Status`, table labels, admin action buttons, and hides admin controls for `OPERATOR`.

- [ ] **Step 7: Run products tests**

Run: `pnpm --filter web test -- src/app/\(app\)/produtos/product-view-model.test.ts src/app/\(app\)/produtos/products-ui.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/app/(app)/produtos
git commit -m "feat: redesign products screen"
```

---

### Task 5: Dashboard Operational Layout

**Files:**
- Modify: `apps/web/src/app/(app)/dashboard/page.tsx`
- Create: `apps/web/src/app/(app)/dashboard/page.test.tsx`

**Interfaces:**
- Consumes: UI foundation from Task 1.
- Produces: dashboard visual baseline for future sales/finance data.

- [ ] **Step 1: Write failing dashboard render test**

Create `apps/web/src/app/(app)/dashboard/page.test.tsx`:

```tsx
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import DashboardPage from "./page";

describe("DashboardPage", () => {
  it("renders operational sections", () => {
    const html = renderToStaticMarkup(createElement(DashboardPage));

    expect(html).toContain("Resumo operacional");
    expect(html).toContain("Vendas hoje");
    expect(html).toContain("Faturamento hoje");
    expect(html).toContain("Alertas de estoque");
    expect(html).toContain("Atalhos operacionais");
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter web test -- src/app/\(app\)/dashboard/page.test.tsx`

Expected: FAIL because the current page lacks the new sections.

- [ ] **Step 3: Redesign dashboard placeholder**

Modify `apps/web/src/app/(app)/dashboard/page.tsx` to use `PageHeader`, `MetricCard`, `Panel`, `Button`, and `EmptyState`. Keep values mocked/zero until real sales data exists.

Required visible copy:

```tsx
<PageHeader eyebrow="Dashboard" title="Resumo operacional" description="Acompanhe o dia da loja, veja alertas e acesse os fluxos principais." />
```

Include these sections:

- Metrics: `Vendas hoje`, `Faturamento hoje`, `Estoque baixo`.
- `Atalhos operacionais` with actions for `Nova venda`, `Produtos`, `Estoque`.
- `Alertas de estoque` with empty state copy `Nenhum alerta critico por enquanto.`
- `Fechamento de caixa` with copy `Relatorio diario e mensal entrara apos o modulo de vendas alimentar dados reais.`

- [ ] **Step 4: Run dashboard test**

Run: `pnpm --filter web test -- src/app/\(app\)/dashboard/page.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(app)/dashboard/page.tsx apps/web/src/app/(app)/dashboard/page.test.tsx
git commit -m "feat: redesign dashboard shell"
```

---

### Task 6: Final Verification And Cleanup

**Files:**
- Modify only if needed after verification.

**Interfaces:**
- Consumes all previous tasks.
- Produces verified UI redesign stage 1.

- [ ] **Step 1: Run web tests**

Run: `pnpm --filter web test`

Expected: PASS with all web tests.

- [ ] **Step 2: Run shared and api tests to guard workspace regressions**

Run: `pnpm --filter shared test`

Expected: PASS.

Run: `pnpm --filter api test`

Expected: PASS.

- [ ] **Step 3: Run typecheck and lint**

Run: `pnpm typecheck --force`

Expected: PASS.

Run: `pnpm lint --force`

Expected: PASS.

- [ ] **Step 4: Run build**

Run: `pnpm build --force`

Expected: PASS. If Windows/OneDrive locks `.next` files, stop any running `pnpm dev` process and rerun.

- [ ] **Step 5: Inspect final diff**

Run: `git status --short`

Expected: only intended files changed. Do not revert unrelated `apps/web/next-env.d.ts` noise unless the user explicitly approves.

Run: `git diff --stat`

Expected: changes are concentrated in UI foundation, shell, login, stock, products, dashboard, and docs.

- [ ] **Step 6: Commit verification cleanup if needed**

If fixes were needed after verification:

```bash
git add <fixed-files>
git commit -m "fix: stabilize ui redesign"
```

If no fixes were needed, do not create an empty commit.

---

## Deferred Plan: Simple Cash Reports

Create a separate implementation plan after the sales module exists. That plan must cover:

- API endpoint for daily/monthly sales summaries.
- Admin-only permission check.
- Totals by payment method.
- Completed versus canceled sales separation.
- Period filter: today, yesterday, this month, custom period.
- Dense sales table for closing cash.
- Tests for cents-only monetary totals and canceled sale exclusion from real cash totals.

Do not implement fake reports with mocked data in stage 1.
