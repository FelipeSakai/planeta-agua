# Dashboard Operacional Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the dashboard into a daily operator workspace with dominant New Sale action, first-fold operational pending items, cleaner team navigation, and reliable receipt item printing.

**Architecture:** Keep all business data on the server. The dashboard page will compose existing dashboard data with cash-register details server-side instead of adding a new API just for UI layout. `Entregadores` moves out of the primary nav into a new `Equipe` area while preserving the existing drivers API and data model.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS v4, NestJS, Drizzle ORM, Zod, Vitest.

## Global Constraints

- Do not add a charting library in this iteration; use simple CSS bars for payment distribution.
- Do not transform delivery drivers into login users or change the database model for users/drivers.
- Keep `Usuarios` restricted to `ADMIN`.
- Keep `Entregadores` accessible to `ADMIN` and `OPERATOR` inside the team area.
- Receipt printing must show product names, quantities, unit values, and totals in all print entry points.
- Keep the dashboard lightweight and useful for the operator opening the system in the morning.
- Use existing UI primitives where possible: `PageHeader`, `Panel`, `MetricCard`, `Button`, `Badge`, `EmptyState`.
- Run `pnpm run typecheck`, `pnpm run lint`, `pnpm run build`, `pnpm --filter shared test -- --run`, and `pnpm --filter web test -- --run` before completion.
- Do not commit unrelated local changes in `.opencode`, `AGENTS.md`, migration journal, or older docs unless explicitly requested.

---

## File Structure

- `apps/web/src/components/recibo/print-recibo.tsx`: reusable print-only receipt component. Must always render item rows when `sale.items` is populated.
- `apps/web/src/components/recibo/print-recibo.test.tsx`: new regression tests for receipt item rendering.
- `apps/web/src/app/(app)/dashboard/page.tsx`: dashboard server page and `DashboardView`; will receive `userName` and cash details in addition to dashboard data.
- `apps/web/src/app/(app)/dashboard/page.test.tsx`: dashboard layout/content tests.
- `apps/web/src/components/layout/app-shell.tsx`: primary navigation; remove standalone `Entregadores`, add `Equipe`.
- `apps/web/src/components/layout/app-shell.test.ts`: navigation role tests.
- `apps/web/src/app/(app)/equipe/page.tsx`: new team landing page with tabs/sections for `Usuarios` and `Entregadores`.
- `apps/web/src/app/(app)/equipe/equipe-ui.tsx`: new UI component for team area.
- `apps/web/src/app/(app)/equipe/equipe-ui.test.tsx`: tests for team page visibility and links.
- `apps/web/src/app/(app)/entregadores/page.tsx`: keep as compatibility route or redirect-style page if desired, but remove from main navigation.

---

### Task 1: Receipt Product Rows Regression

**Files:**
- Test: `apps/web/src/components/recibo/print-recibo.test.tsx`
- Modify: `apps/web/src/components/recibo/print-recibo.tsx`

**Interfaces:**
- Consumes: `PrintRecibo({ sale }: { sale: SaleDetailResponse })`
- Produces: Receipt HTML that includes each `sale.items[]` row with product name, quantity, unit price, and total.

- [ ] **Step 1: Create failing receipt render test**

Create `apps/web/src/components/recibo/print-recibo.test.tsx`:

```tsx
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SaleDetailResponse } from "shared";

import { PrintRecibo } from "./print-recibo";

const saleDetail: SaleDetailResponse = {
  sale: {
    id: "11111111-1111-4111-8111-111111111111",
    customerId: "22222222-2222-4222-8222-222222222222",
    customerName: "Maria Souza",
    customerPhone: "11999999999",
    customerAddress: "Rua A, 10",
    userId: "33333333-3333-4333-8333-333333333333",
    userName: "Operador",
    totalAmountCents: 4200,
    paymentMethod: "CASH",
    status: "PENDING_DELIVERY",
    createdAt: "2026-06-24T10:00:00.000Z",
    canceledAt: null,
    cancellationReason: null,
    deliveredAt: null,
    deliveredByUserId: null,
    driverId: "44444444-4444-4444-8444-444444444444",
    driverName: "Joao Entregador",
    bottle: null,
    previousBottle: null,
  },
  items: [
    {
      id: "55555555-5555-4555-8555-555555555555",
      productId: "66666666-6666-4666-8666-666666666666",
      productNameSnapshot: "Galao 20L",
      quantity: 2,
      unitPriceCents: 2100,
      totalPriceCents: 4200,
      discountCents: null,
      finalUnitPriceCents: null,
    },
  ],
  bottleAlerts: { expired: false, mismatch: false },
};

describe("PrintRecibo", () => {
  it("renders product rows in the printable receipt", () => {
    const html = renderToStaticMarkup(createElement(PrintRecibo, { sale: saleDetail }));

    expect(html).toContain("Galao 20L");
    expect(html).toContain("2");
    expect(html).toContain("R$ 21,00");
    expect(html).toContain("R$ 42,00");
  });

  it("renders delivery customer data when the sale is pending delivery", () => {
    const html = renderToStaticMarkup(createElement(PrintRecibo, { sale: saleDetail }));

    expect(html).toContain("Maria Souza");
    expect(html).toContain("11999999999");
    expect(html).toContain("Rua A, 10");
    expect(html).toContain("Joao Entregador");
  });
});
```

- [ ] **Step 2: Run test and confirm current behavior**

Run: `pnpm --filter web exec vitest run src/components/recibo/print-recibo.test.tsx`

Expected: If it fails, failure should mention missing product or receipt text. If it passes, keep the test as regression coverage and continue to Step 3 to harden print CSS semantics.

- [ ] **Step 3: Replace screen `hidden` dependency with explicit print class if needed**

In `apps/web/src/components/recibo/print-recibo.tsx`, change the wrapper from:

```tsx
<div className="print-area hidden">
```

to:

```tsx
<div className="print-area print-only">
```

In `apps/web/src/app/globals.css`, add a screen-only hiding rule before `@media print`:

```css
.print-only {
  display: none;
}
```

Keep the existing print rule:

```css
@media print {
  .print-area {
    display: block !important;
  }
}
```

- [ ] **Step 4: Verify receipt test passes**

Run: `pnpm --filter web exec vitest run src/components/recibo/print-recibo.test.tsx`

Expected: PASS with 2 tests.

- [ ] **Step 5: Verify existing sales helper tests still pass**

Run: `pnpm --filter web exec vitest run src/lib/sales.test.ts src/app/\(app\)/vendas/sales-ui.test.tsx src/app/\(app\)/vendas/historico/history-ui.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/recibo/print-recibo.test.tsx apps/web/src/components/recibo/print-recibo.tsx apps/web/src/app/globals.css
git commit -m "fix(web): ensure receipt prints product rows"
```

---

### Task 2: Dashboard Data Composition for Cash Status

**Files:**
- Modify: `apps/web/src/app/(app)/dashboard/page.tsx`
- Modify: `apps/web/src/app/(app)/dashboard/page.test.tsx`

**Interfaces:**
- Consumes: `fetchDashboard(cookieHeader): Promise<DashboardResponse>` and `fetchCashRegisterDetails(cookieHeader): Promise<CashRegisterDetailsResponse | null>`.
- Produces: `DashboardView({ data, userRole, userName, cashDetails })` where `cashDetails` may be `null`.

- [ ] **Step 1: Write failing dashboard test for cash panel data**

In `apps/web/src/app/(app)/dashboard/page.test.tsx`, update the render helper signature to pass a user name and cash details:

```tsx
import type { CashRegisterDetailsResponse, DashboardResponse, UserRole } from "shared";

const cashDetails: CashRegisterDetailsResponse = {
  cashRegister: {
    id: "33333333-3333-4333-8333-333333333333",
    date: "2026-06-24",
    openingBalanceCents: 5000,
    openedAt: "2026-06-24T08:00:00.000Z",
    openedByUserId: "11111111-1111-4111-8111-111111111111",
    closedAt: null,
    closedByUserId: null,
    counts: {},
  },
  todaySales: [],
  todayExpenses: [],
  totalsByPaymentMethod: [
    { method: "CASH", salesCents: 4200, expensesCents: 1000 },
    { method: "PIX", salesCents: 8390, expensesCents: 0 },
  ],
  totalSalesCents: 12590,
  totalExpensesCents: 1000,
  expectedCashCents: 8200,
};

function render(role: UserRole, data: DashboardResponse = sampleData, details: CashRegisterDetailsResponse | null = cashDetails) {
  return renderToStaticMarkup(createElement(DashboardView, { data, userRole: role, userName: "Operador", cashDetails: details }));
}
```

Add test:

```tsx
it("shows cash register status in the first dashboard fold", () => {
  const html = render("ADMIN");

  expect(html).toContain("Caixa de hoje");
  expect(html).toContain("Aberto");
  expect(html).toContain("R$ 125,90");
  expect(html).toContain("Saldo esperado");
  expect(html).toContain("R$ 82,00");
});
```

- [ ] **Step 2: Run dashboard test and verify it fails**

Run: `pnpm --filter web exec vitest run src/app/\(app\)/dashboard/page.test.tsx`

Expected: FAIL because `DashboardView` does not accept `cashDetails` or render `Caixa de hoje` yet.

- [ ] **Step 3: Fetch cash details in dashboard page**

Modify imports in `apps/web/src/app/(app)/dashboard/page.tsx`:

```ts
import { fetchCashRegisterDetails, fetchDashboard } from "@/lib/finance";
```

Modify `DashboardPage`:

```tsx
  const [data, cashDetails] = await Promise.all([
    fetchDashboard(cookieHeader),
    fetchCashRegisterDetails(cookieHeader),
  ]);

  return <DashboardView data={data} userRole={user.role} userName={user.name} cashDetails={cashDetails} />;
```

Modify `DashboardView` props:

```tsx
export function DashboardView({
  data,
  userRole,
  userName,
  cashDetails,
}: Readonly<{
  data: DashboardResponse;
  userRole: UserRole;
  userName: string | null;
  cashDetails: CashRegisterDetailsResponse | null;
}>) {
```

Add `CashRegisterDetailsResponse` to the shared type import.

- [ ] **Step 4: Add cash summary calculations**

Inside `DashboardView`, add:

```tsx
  const cashRegisterStatus = cashDetails?.cashRegister?.closedAt
    ? "Fechado"
    : cashDetails?.cashRegister
      ? "Aberto"
      : "Nao aberto";
  const cashStatusTone = cashRegisterStatus === "Aberto" ? ("success" as const) : ("warning" as const);
  const cashSalesCents = cashDetails?.totalSalesCents ?? 0;
  const cashExpensesCents = cashDetails?.totalExpensesCents ?? 0;
  const expectedCashCents = cashDetails?.expectedCashCents ?? 0;
```

- [ ] **Step 5: Render a temporary cash panel to satisfy the test**

Add this panel near the top after the metric row; Task 3 will reorganize the full layout:

```tsx
<Panel className="p-4">
  <div className="flex items-start justify-between gap-3">
    <div>
      <h2 className="text-base font-semibold text-[var(--foreground)]">Caixa de hoje</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Vendas {formatCentsToBRL(cashSalesCents)} · Despesas {formatCentsToBRL(cashExpensesCents)}
      </p>
    </div>
    <Badge variant={cashStatusTone}>{cashRegisterStatus}</Badge>
  </div>
  <p className="mt-3 text-sm font-medium text-[var(--foreground)]">
    Saldo esperado: {formatCentsToBRL(expectedCashCents)}
  </p>
</Panel>
```

Import `Badge` if not already imported.

- [ ] **Step 6: Verify dashboard test passes**

Run: `pnpm --filter web exec vitest run src/app/\(app\)/dashboard/page.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/\(app\)/dashboard/page.tsx apps/web/src/app/\(app\)/dashboard/page.test.tsx
git commit -m "feat(web): add cash status data to dashboard"
```

---

### Task 3: Redesign Dashboard as Daily Workbench

**Files:**
- Modify: `apps/web/src/app/(app)/dashboard/page.tsx`
- Modify: `apps/web/src/app/(app)/dashboard/page.test.tsx`

**Interfaces:**
- Consumes: `DashboardView({ data, userRole, userName, cashDetails })` from Task 2.
- Produces: First-fold dashboard layout with dominant New Sale CTA, pending deliveries, cash status, critical stock, and secondary payment/recent-sales sections.

- [ ] **Step 1: Add failing tests for first-fold operational hierarchy**

In `apps/web/src/app/(app)/dashboard/page.test.tsx`, add:

```tsx
it("renders the daily workbench greeting and dominant sale action", () => {
  const html = render("ADMIN");

  expect(html).toContain("Bom dia, Operador");
  expect(html).toContain("Comecar venda");
  expect(html).toContain('href="/vendas"');
});

it("keeps operational secondary actions visible near the top", () => {
  const html = render("ADMIN");

  expect(html).toContain("Ver entregas");
  expect(html).toContain("Abrir caixa");
  expect(html).toContain("Produtos");
});

it("renders payment distribution as simple CSS bars", () => {
  const html = render("ADMIN");

  expect(html).toContain("Resumo por pagamento");
  expect(html).toContain("payment-bar");
});
```

- [ ] **Step 2: Run dashboard tests and verify failure**

Run: `pnpm --filter web exec vitest run src/app/\(app\)/dashboard/page.test.tsx`

Expected: FAIL on missing `Bom dia`, `Comecar venda`, and `payment-bar`.

- [ ] **Step 3: Replace PageHeader with operational top section**

In `DashboardView`, replace the current `PageHeader` block with:

```tsx
<div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
  <Panel className="flex min-h-56 flex-col justify-between bg-[var(--foreground)] p-6 text-white">
    <div>
      <p className="text-sm text-white/70">{userName ? `Bom dia, ${userName}` : "Resumo do dia"}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">Pronto para vender</h1>
      <p className="mt-2 max-w-xl text-sm text-white/75">
        Inicie a venda, acompanhe entregas e confira o caixa sem procurar pelos atalhos.
      </p>
    </div>
    <div className="mt-6 flex flex-wrap gap-2">
      <Link href="/vendas">
        <Button type="button" variant="secondary">Comecar venda</Button>
      </Link>
      <Link href="/entregas" className="inline-flex min-h-10 items-center rounded-[var(--radius-control)] border border-white/20 px-4 text-sm font-medium text-white transition hover:bg-white/10">
        Ver entregas
      </Link>
      <Link href="/caixa" className="inline-flex min-h-10 items-center rounded-[var(--radius-control)] border border-white/20 px-4 text-sm font-medium text-white transition hover:bg-white/10">
        Abrir caixa
      </Link>
      <Link href="/produtos" className="inline-flex min-h-10 items-center rounded-[var(--radius-control)] border border-white/20 px-4 text-sm font-medium text-white transition hover:bg-white/10">
        Produtos
      </Link>
    </div>
  </Panel>

  <Panel className="p-4">
    <h2 className="text-base font-semibold text-[var(--foreground)]">Pendencias agora</h2>
    <div className="mt-4 grid gap-3">
      <OperationalStatusRow label="Entregas pendentes" value={data.pendingDeliveries.length} href="/entregas" />
      <OperationalStatusRow label="Estoque critico" value={lowStockCount} href={canOpenStock ? "/estoque" : undefined} />
      <OperationalStatusRow label="Caixa" value={cashRegisterStatus} href="/caixa" />
    </div>
  </Panel>
</div>
```

- [ ] **Step 4: Add local helper component in dashboard file**

At the bottom of `apps/web/src/app/(app)/dashboard/page.tsx`, before `formatTimeOfDay`, add:

```tsx
function OperationalStatusRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const content = (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-[var(--border-soft)] bg-[var(--card-muted)] px-3 py-2">
      <span className="text-sm text-[var(--muted)]">{label}</span>
      <strong className="text-sm text-[var(--foreground)]">{value}</strong>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
```

- [ ] **Step 5: Reorganize first-fold cards**

After the top workbench section, render a compact three-column row:

```tsx
<div className="grid gap-4 md:grid-cols-3">
  <MetricCard label="Vendas hoje" value={data.todaySalesCount} detail={formatCentsToBRL(data.todayRevenueCents)} />
  <MetricCard label="Entregas pendentes" value={data.pendingDeliveries.length} detail="Aguardando confirmacao" tone={data.pendingDeliveries.length > 0 ? "warning" : "success"} />
  <MetricCard label="Estoque critico" value={lowStockCount} detail={lowStockDetail} tone={lowStockTone} />
</div>
```

Remove the old duplicated `Faturamento hoje`, `Vendas hoje`, `Estoque baixo` row if it creates repeated information.

- [ ] **Step 6: Replace payment list with CSS bars**

Before the return, compute:

```tsx
  const maxPaymentAmount = Math.max(...data.totalsByPaymentMethod.map((total) => total.amountCents), 0);
```

In the `Total por pagamento` panel, replace each list row body with:

```tsx
<li key={total.method} className="py-3">
  <div className="flex items-center justify-between gap-3">
    <div>
      <p className="text-sm font-medium text-[var(--foreground)]">{paymentMethodLabels[total.method]}</p>
      <p className="text-xs text-[var(--muted)]">{total.salesCount} venda{total.salesCount !== 1 ? "s" : ""}</p>
    </div>
    <span className="text-sm font-semibold text-[var(--foreground)]">{formatCentsToBRL(total.amountCents)}</span>
  </div>
  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--card-muted)]">
    <div
      className="payment-bar h-full rounded-full bg-[var(--brand)]"
      style={{ width: `${maxPaymentAmount > 0 ? Math.max(8, (total.amountCents / maxPaymentAmount) * 100) : 0}%` }}
    />
  </div>
</li>
```

- [ ] **Step 7: Remove bottom shortcuts panel**

Delete the `Atalhos operacionais` panel at the bottom because those actions are now top-level.

- [ ] **Step 8: Verify dashboard tests**

Run: `pnpm --filter web exec vitest run src/app/\(app\)/dashboard/page.test.tsx`

Expected: PASS.

- [ ] **Step 9: Verify typecheck for dashboard changes**

Run: `pnpm run typecheck`

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/app/\(app\)/dashboard/page.tsx apps/web/src/app/\(app\)/dashboard/page.test.tsx
git commit -m "feat(web): redesign dashboard as daily workbench"
```

---

### Task 4: Move Drivers Into Team Navigation

**Files:**
- Modify: `apps/web/src/components/layout/app-shell.tsx`
- Modify: `apps/web/src/components/layout/app-shell.test.ts`
- Create: `apps/web/src/app/(app)/equipe/page.tsx`
- Create: `apps/web/src/app/(app)/equipe/equipe-ui.tsx`
- Test: `apps/web/src/app/(app)/equipe/equipe-ui.test.tsx`

**Interfaces:**
- Consumes: existing drivers route `/entregadores` and existing admin users route placeholder `/usuarios`.
- Produces: primary nav item `{ label: "Equipe", href: "/equipe" }`; team page with visible `Usuarios` and `Entregadores` sections.

- [ ] **Step 1: Write failing navigation tests**

In `apps/web/src/components/layout/app-shell.test.ts`, update expectations:

```ts
expect(items).toEqual(["Dashboard", "Nova Venda", "Historico", "Entregas", "Caixa", "Produtos", "Clientes", "Equipe", "Financeiro"]);
```

for operators, and:

```ts
expect(items).toEqual(["Dashboard", "Nova Venda", "Historico", "Entregas", "Caixa", "Produtos", "Clientes", "Equipe", "Estoque", "Financeiro", "Usuarios"]);
```

for admins if keeping `Usuarios` visible separately temporarily. If the implementation removes standalone `Usuarios`, use:

```ts
expect(items).toEqual(["Dashboard", "Nova Venda", "Historico", "Entregas", "Caixa", "Produtos", "Clientes", "Equipe", "Estoque", "Financeiro"]);
```

The preferred final state is to remove standalone `Usuarios` and use `Equipe` only.

- [ ] **Step 2: Run navigation test and verify failure**

Run: `pnpm --filter web exec vitest run src/components/layout/app-shell.test.ts`

Expected: FAIL because current nav still includes `Entregadores` and `Usuarios` separately.

- [ ] **Step 3: Update navigation**

In `apps/web/src/components/layout/app-shell.tsx`, replace:

```ts
{ label: "Entregadores", href: "/entregadores", roles: ["ADMIN", "OPERATOR"] },
```

and remove standalone:

```ts
{ label: "Usuarios", href: "/usuarios", roles: ["ADMIN"] },
```

Add:

```ts
{ label: "Equipe", href: "/equipe", roles: ["ADMIN", "OPERATOR"] },
```

- [ ] **Step 4: Create team UI test**

Create `apps/web/src/app/(app)/equipe/equipe-ui.test.tsx`:

```tsx
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EquipeUi } from "./equipe-ui";

describe("EquipeUi", () => {
  it("shows users and drivers as team sections for admins", () => {
    const html = renderToStaticMarkup(createElement(EquipeUi, { userRole: "ADMIN" }));

    expect(html).toContain("Equipe");
    expect(html).toContain("Usuarios");
    expect(html).toContain("Entregadores");
    expect(html).toContain('href="/entregadores"');
  });

  it("shows drivers but not user management to operators", () => {
    const html = renderToStaticMarkup(createElement(EquipeUi, { userRole: "OPERATOR" }));

    expect(html).toContain("Entregadores");
    expect(html).not.toContain('href="/usuarios"');
  });
});
```

- [ ] **Step 5: Run team UI test and verify failure**

Run: `pnpm --filter web exec vitest run src/app/\(app\)/equipe/equipe-ui.test.tsx`

Expected: FAIL because `EquipeUi` does not exist.

- [ ] **Step 6: Create `EquipeUi` component**

Create `apps/web/src/app/(app)/equipe/equipe-ui.tsx`:

```tsx
import Link from "next/link";
import type { UserRole } from "shared";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";

export function EquipeUi({ userRole }: { userRole: UserRole }) {
  const isAdmin = userRole === "ADMIN";

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Operacao"
        title="Equipe"
        description="Gerencie quem opera o sistema e quem realiza entregas."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {isAdmin ? (
          <Panel className="p-4">
            <h2 className="text-base font-semibold text-[var(--foreground)]">Usuarios</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Acesso ao sistema, perfis e usuarios ativos.
            </p>
            <Link className="mt-4 inline-flex" href="/usuarios">
              <Button type="button" variant="secondary">Abrir usuarios</Button>
            </Link>
          </Panel>
        ) : null}

        <Panel className="p-4">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Entregadores</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Cadastro simples de entregadores usados nas vendas com entrega.
          </p>
          <Link className="mt-4 inline-flex" href="/entregadores">
            <Button type="button" variant="secondary">Abrir entregadores</Button>
          </Link>
        </Panel>
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Create team page**

Create `apps/web/src/app/(app)/equipe/page.tsx`:

```tsx
import { requireUser } from "@/lib/auth";

import { EquipeUi } from "./equipe-ui";

export default async function EquipePage() {
  const user = await requireUser();

  return <EquipeUi userRole={user.role} />;
}
```

- [ ] **Step 8: Run navigation and team tests**

Run: `pnpm --filter web exec vitest run src/components/layout/app-shell.test.ts src/app/\(app\)/equipe/equipe-ui.test.tsx`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components/layout/app-shell.tsx apps/web/src/components/layout/app-shell.test.ts apps/web/src/app/\(app\)/equipe
git commit -m "feat(web): move drivers into team area"
```

---

### Task 5: Final Verification and Cleanup

**Files:**
- Modify only files needed to fix verification failures from Tasks 1-4.

**Interfaces:**
- Consumes: all changes from Tasks 1-4.
- Produces: verified implementation ready for review, merge, or push.

- [ ] **Step 1: Run full typecheck**

Run: `pnpm run typecheck`

Expected: PASS.

- [ ] **Step 2: Run full lint**

Run: `pnpm run lint`

Expected: PASS.

- [ ] **Step 3: Run production build**

Run: `pnpm run build`

Expected: PASS. If Next.js fails with `EPERM` under `apps/web/.next`, remove only the generated directory with `rm -rf apps/web/.next` and rerun `pnpm run build`.

- [ ] **Step 4: Run shared tests**

Run: `pnpm --filter shared test -- --run`

Expected: PASS.

- [ ] **Step 5: Run web tests**

Run: `pnpm --filter web test -- --run`

Expected: PASS.

- [ ] **Step 6: Inspect git status**

Run: `git status --short`

Expected: Only intended task files are staged/modified. Do not stage unrelated `.opencode`, `AGENTS.md`, migration journal, `.cbmignore`, or older docs unless explicitly requested.

- [ ] **Step 7: Commit final cleanup if needed**

Only if verification required source/test adjustments not already committed:

```bash
git add <only-intended-files>
git commit -m "chore: finalize dashboard operational polish"
```

---

## Self-Review

- Spec coverage: Dashboard first-fold CTA, pending deliveries, cash status, critical stock, payment bars, team navigation, and receipt product rendering are covered by Tasks 1-4.
- Placeholder scan: No TBD/TODO placeholders remain. Each task has concrete files, expected commands, and expected outcomes.
- Type consistency: `DashboardView({ data, userRole, userName, cashDetails })`, `EquipeUi({ userRole })`, and `PrintRecibo({ sale })` are consistently named across tests and implementation steps.
