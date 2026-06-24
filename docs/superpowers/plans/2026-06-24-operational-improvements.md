# Operational Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce font sizes to ~15%, add deliveries page, printable receipts, dashboard improvements, and cash closing print.

**Architecture:** CSS token adjustments for fonts. New `/entregas` page with individual delivery confirmation. Receipt component using `window.print()` with `@media print` CSS. Dashboard API extended with pending deliveries.

**Tech Stack:** Next.js App Router, Tailwind CSS v4, NestJS, Drizzle ORM, TypeScript

## Global Constraints

- Monorepo: `apps/web` (Next), `apps/api` (Nest), `packages/shared`
- Next does not access DB directly; all DB operations go through API
- Follow existing patterns: repository/service/controller/module per feature
- Use `window.print()` for printing (no PDF generation)
- Receipt formatted for A4 paper
- Run `pnpm run typecheck && pnpm run lint && pnpm run build` after implementation
- Tailwind CSS v4 uses `@theme inline` in globals.css

---

### Task 1: Reduce Font Sizes to ~15%

**Files:**
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/components/ui/page-header.tsx`
- Modify: `apps/web/src/components/ui/metric-card.tsx`
- Modify: `apps/web/src/components/layout/app-shell.tsx`

**Interfaces:**
- Consumes: existing CSS tokens
- Produces: moderate font sizes (~15% increase from original)

- [ ] **Step 1: Update globals.css text tokens**

In `apps/web/src/app/globals.css`, replace the `@theme inline` text tokens:

```css
  --text-xs: 13px;
  --text-sm: 15px;
  --text-base: 18px;
  --text-lg: 20px;
  --text-xl: 24px;
  --text-2xl: 30px;
  --text-3xl: 46px;
```

Update the `body` rule:

```css
body {
  min-height: 100vh;
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-geist-sans), Arial, Helvetica, sans-serif;
  font-size: 18px;
  line-height: 1.5;
}
```

- [ ] **Step 2: Revert PageHeader text sizes**

In `apps/web/src/components/ui/page-header.tsx`, revert the text classes to one step above the original (not two):
- `text-4xl` -> `text-3xl` (was `text-2xl` originally, now `text-3xl` = ~15% up)
- `text-3xl` -> `text-2xl` (was `text-xl` originally)
- `text-base` -> `text-sm` (was `text-xs` originally)
- `text-2xl` -> `text-xl` (was `text-lg` originally)

- [ ] **Step 3: Revert MetricCard text sizes**

In `apps/web/src/components/ui/metric-card.tsx`:
- Value `text-3xl` -> `text-2xl`
- Label `text-sm` -> `text-xs` (back to original)
- Detail `text-sm` -> `text-xs` (back to original)

- [ ] **Step 4: Revert nav link font size**

In `apps/web/src/components/layout/app-shell.tsx`:

```ts
const navLinkBaseClassName = "rounded-xl px-3 py-2 text-sm font-medium";
```

- [ ] **Step 5: Verify typecheck and lint**

Run: `pnpm run typecheck && pnpm run lint`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/globals.css apps/web/src/components/
git commit -m "fix(ui): reduce font sizes from 30% to ~15% increase"
```

---

### Task 2: Add Print CSS and Receipt Component

**Files:**
- Modify: `apps/web/src/app/globals.css`
- Create: `apps/web/src/components/recibo/print-recibo.tsx`

**Interfaces:**
- Consumes: sale detail data (items, customer, payment, driver)
- Produces: `PrintRecibo` component that renders a printable receipt, `printRecibo()` function

- [ ] **Step 1: Add print CSS to globals.css**

Add at the end of `apps/web/src/app/globals.css`:

```css
@media print {
  body * {
    visibility: hidden;
  }

  .print-area,
  .print-area * {
    visibility: visible;
  }

  .print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    padding: 20px;
  }

  .no-print {
    display: none !important;
  }
}
```

- [ ] **Step 2: Create PrintRecibo component**

Create `apps/web/src/components/recibo/print-recibo.tsx`:

```tsx
"use client";

import { formatCentsToBRL, type SaleDetailResponse } from "shared";

const paymentMethodLabels: Record<string, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  CREDIT_CARD: "Credito",
  DEBIT_CARD: "Debito",
  OTHER: "Outro",
};

export function PrintRecibo({ sale }: { sale: SaleDetailResponse }) {
  const isDelivery = sale.sale.status === "PENDING_DELIVERY" || Boolean(sale.sale.driverName);
  const customerName = sale.sale.customerName ?? "Consumidor";
  const now = new Date().toLocaleString("pt-BR");

  return (
    <div className="print-area hidden">
      <div className="mx-auto max-w-md space-y-4 font-mono text-sm text-black">
        <div className="text-center">
          <h1 className="text-lg font-bold">Planeta Agua</h1>
          <p className="text-xs">Recibo de Venda</p>
        </div>

        <div className="border-t border-b border-black py-2 space-y-1">
          <p>Data: {now}</p>
          <p>Venda: {sale.sale.id.slice(0, 8).toUpperCase()}</p>
          <p>Cliente: {customerName}</p>
          {isDelivery && sale.sale.driverName ? (
            <>
              <p>Entregador: {sale.sale.driverName}</p>
              <p>Status: {sale.sale.status === "PENDING_DELIVERY" ? "Pendente de entrega" : "Entregue"}</p>
            </>
          ) : null}
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-black">
              <th className="text-left">Produto</th>
              <th className="text-right">Qtd</th>
              <th className="text-right">Unit</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={item.id} className="border-b border-dashed border-black">
                <td className="text-left">{item.productNameSnapshot}</td>
                <td className="text-right">{item.quantity}</td>
                <td className="text-right">{formatCentsToBRL(item.unitPriceCents)}</td>
                <td className="text-right">{formatCentsToBRL(item.totalPriceCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-black pt-2 space-y-1">
          <p className="font-bold text-right">Total: {formatCentsToBRL(sale.sale.totalAmountCents)}</p>
          <p>Forma de pagamento: {paymentMethodLabels[sale.sale.paymentMethod] ?? sale.sale.paymentMethod}</p>
        </div>

        {isDelivery ? (
          <div className="border-t border-black pt-2 space-y-1">
            <p>Endereco de entrega:</p>
            <p>{customerName}</p>
          </div>
        ) : null}

        <div className="text-center text-xs pt-4">
          <p>Obrigado pela preferencia!</p>
        </div>
      </div>
    </div>
  );
}

export function printRecibo() {
  window.print();
}
```

Note: The `SaleDetailResponse` type needs `driverName` and `customerName` fields. Check `packages/shared/src/sales.ts` for `saleDetailResponseSchema` and add `driverName: z.string().nullable()` and ensure `customerName` exists.

- [ ] **Step 3: Update saleDetailResponseSchema if needed**

In `packages/shared/src/sales.ts`, check if `saleDetailResponseSchema` already has `customerName` and `driverName`. If `driverName` is missing, add it:

```ts
driverId: z.string().uuid().nullable(),
driverName: z.string().nullable(),
```

Add to the sale object in `saleDetailResponseSchema`.

- [ ] **Step 4: Rebuild shared and verify typecheck**

Run: `pnpm --filter shared build && pnpm run typecheck`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/globals.css apps/web/src/components/recibo/ packages/shared/src/sales.ts
git commit -m "feat(web): add print CSS and receipt component for sales"
```

---

### Task 3: Add Print Button to Sales Success Banner

**Files:**
- Modify: `apps/web/src/app/(app)/vendas/sales-ui.tsx`

**Interfaces:**
- Consumes: `PrintRecibo` component, `printRecibo` function
- Produces: print button in the success banner after sale completion

- [ ] **Step 1: Add print button to success banner**

In `apps/web/src/app/(app)/vendas/sales-ui.tsx`:

1. Import the receipt component and function:
```ts
import { PrintRecibo, printRecibo } from "@/components/recibo/print-recibo";
```

2. Add state for the last completed sale detail:
```ts
const [lastSaleDetail, setLastSaleDetail] = useState<SaleDetailResponse | null>(null);
```

3. After a successful sale, fetch the sale detail and store it:
```ts
// After successful sale response, fetch the detail
const detailResponse = await fetch(`/api/sales/${saleId}`);
if (detailResponse.ok) {
  const detail = await detailResponse.json();
  setLastSaleDetail(detail);
}
```

4. Update the success banner to include a print button:
```tsx
{successMessage && lastSaleDetail ? (
  <div className="space-y-2">
    <Alert variant="success">
      <div className="flex items-center justify-between gap-4">
        <span>{successMessage}</span>
        <Button variant="secondary" onClick={() => printRecibo()}>
          Imprimir recibo
        </Button>
      </div>
    </Alert>
    <PrintRecibo sale={lastSaleDetail} />
  </div>
) : successMessage ? (
  <Alert variant="success">{successMessage}</Alert>
) : null}
```

5. Clear `lastSaleDetail` when starting a new sale:
```ts
setLastSaleDetail(null);
```

- [ ] **Step 2: Verify typecheck and lint**

Run: `pnpm run typecheck && pnpm run lint`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/\(app\)/vendas/sales-ui.tsx
git commit -m "feat(web): add print receipt button to sale success banner"
```

---

### Task 4: Add Pending Deliveries to Dashboard API

**Files:**
- Modify: `apps/api/src/modules/finance/finance.repository.ts`
- Modify: `apps/api/src/modules/finance/finance.service.ts`

**Interfaces:**
- Consumes: existing dashboard data method
- Produces: `pendingDeliveries` field in dashboard response

- [ ] **Step 1: Add repository method for pending deliveries**

In `apps/api/src/modules/finance/finance.repository.ts`, add to `getDashboardData` method or create a new method:

```ts
async getPendingDeliveries() {
  return db.query.sales.findMany({
    where: eq(sales.status, "PENDING_DELIVERY"),
    orderBy: [desc(sales.createdAt)],
    limit: 10,
    with: {
      customer: { columns: { id: true, name: true, phone: true, address: true } },
      driver: { columns: { id: true, name: true } },
    },
  });
}
```

Make sure `eq` is imported.

- [ ] **Step 2: Add pending deliveries to dashboard response**

In `apps/api/src/modules/finance/finance.service.ts`, update `getDashboardData`:

```ts
async getDashboardData() {
  const data = await this.financeRepository.getDashboardData(new Date());
  const pendingDeliveries = await this.financeRepository.getPendingDeliveries();

  return {
    ...data,
    pendingDeliveries: pendingDeliveries.map((s) => ({
      id: s.id,
      customerName: s.customer?.name ?? null,
      customerPhone: s.customer?.phone ?? null,
      customerAddress: s.customer?.address ?? null,
      driverName: s.driver?.name ?? null,
      totalAmountCents: s.totalAmountCents,
      paymentMethod: s.paymentMethod,
      createdAt: s.createdAt.toISOString(),
    })),
  };
}
```

- [ ] **Step 3: Update shared dashboard schema**

In `packages/shared/src/finance.ts`, add `pendingDeliveries` to the dashboard response schema:

```ts
export const pendingDeliveryItemSchema = z.object({
  id: z.string().uuid(),
  customerName: z.string().nullable(),
  customerPhone: z.string().nullable(),
  customerAddress: z.string().nullable(),
  driverName: z.string().nullable(),
  totalAmountCents: z.number().int().min(0),
  paymentMethod: z.enum(paymentMethodValues),
  createdAt: isoDatetimeStringSchema,
});

export const dashboardResponseSchema = z.object({
  // ... existing fields ...
  pendingDeliveries: z.array(pendingDeliveryItemSchema),
});
```

- [ ] **Step 4: Rebuild shared and verify**

Run: `pnpm --filter shared build && pnpm run typecheck`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/finance/ packages/shared/src/finance.ts
git commit -m "feat(api): add pending deliveries to dashboard data"
```

---

### Task 5: Update Dashboard UI with New Sale Button and Pending Deliveries

**Files:**
- Modify: `apps/web/src/app/(app)/dashboard/page.tsx`
- Modify: `apps/web/src/app/(app)/dashboard/page.test.tsx` (if exists)

**Interfaces:**
- Consumes: dashboard API with pendingDeliveries
- Produces: dashboard with "Nova Venda" button and pending deliveries section

- [ ] **Step 1: Add Nova Venda button and pending deliveries section**

In `apps/web/src/app/(app)/dashboard/page.tsx` (or the dashboard UI component), add:

1. A "Nova Venda" button at the top linking to `/vendas`:

```tsx
import Link from "next/link";

// In the JSX, after the PageHeader:
<Link href="/vendas" className="inline-flex items-center rounded-xl bg-[var(--brand)] px-6 py-3 text-base font-medium text-white hover:bg-[var(--brand-strong)]">
  Nova Venda
</Link>
```

2. A pending deliveries section:

```tsx
{dashboard.pendingDeliveries && dashboard.pendingDeliveries.length > 0 ? (
  <Panel>
    <h2 className="text-xl font-medium">Entregas Pendentes</h2>
    <div className="mt-4 space-y-3">
      {dashboard.pendingDeliveries.map((delivery) => (
        <div key={delivery.id} className="flex items-center justify-between border-b border-[var(--border-soft)] pb-3">
          <div>
            <p className="font-medium">{delivery.customerName ?? "Sem cliente"}</p>
            <p className="text-sm text-[var(--muted)]">
              {delivery.customerAddress ?? "Sem endereco"} - {delivery.driverName ?? "Sem entregador"}
            </p>
          </div>
          <div className="text-right">
            <p className="font-medium">{formatCentsToBRL(delivery.totalAmountCents)}</p>
            <Link href="/entregas" className="text-sm text-[var(--brand)] hover:underline">
              Ver entregas
            </Link>
          </div>
        </div>
      ))}
    </div>
  </Panel>
) : null}
```

- [ ] **Step 2: Update dashboard fetcher to handle pendingDeliveries**

In `apps/web/src/lib/finance.ts`, update the dashboard fetcher to parse the new `pendingDeliveries` field.

- [ ] **Step 3: Verify typecheck and lint**

Run: `pnpm run typecheck && pnpm run lint`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(app\)/dashboard/ apps/web/src/lib/finance.ts
git commit -m "feat(web): add Nova Venda button and pending deliveries to dashboard"
```

---

### Task 6: Create Deliveries Page

**Files:**
- Modify: `apps/web/src/components/layout/app-shell.tsx` (add "Entregas" nav item)
- Create: `apps/web/src/app/(app)/entregas/page.tsx`
- Create: `apps/web/src/app/(app)/entregas/deliveries-ui.tsx`

**Interfaces:**
- Consumes: sales API with PENDING_DELIVERY filter
- Produces: deliveries page with individual confirmation and print

- [ ] **Step 1: Add Entregas to navigation**

In `apps/web/src/components/layout/app-shell.tsx`, add after "Historico":

```ts
{ label: "Entregas", href: "/entregas", roles: ["ADMIN", "OPERATOR"] },
```

- [ ] **Step 2: Create deliveries page**

Create `apps/web/src/app/(app)/entregas/page.tsx`:

```tsx
import { cookies } from "next/headers";

import { requireUser } from "@/lib/auth";
import { fetchSalesHistory } from "@/lib/sales";

import { DeliveriesUi } from "./deliveries-ui";

export default async function EntregasPage() {
  await requireUser();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  const history = await fetchSalesHistory(cookieHeader, { status: "PENDING_DELIVERY" });

  return <DeliveriesUi history={history} />;
}
```

- [ ] **Step 3: Create deliveries UI component**

Create `apps/web/src/app/(app)/entregas/deliveries-ui.tsx`. This should:
- Show a table of pending deliveries with: cliente, endereco, telefone, entregador, itens, total, forma de pagamento
- "Confirmar Entrega" button per row (calls POST `/api/sales/:id/deliver`)
- "Imprimir Recibo" button per row (fetches sale detail, then prints)
- After confirmation, `router.refresh()`
- Use existing components: PageHeader, DataTable, Button, Badge, Alert, EmptyState

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCentsToBRL, type SaleHistoryResponse } from "shared";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { PrintRecibo, printRecibo } from "@/components/recibo/print-recibo";
import type { SaleDetailResponse } from "shared";

type DeliveriesUiProps = {
  history: SaleHistoryResponse;
};

export function DeliveriesUi({ history }: DeliveriesUiProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [printSale, setPrintSale] = useState<SaleDetailResponse | null>(null);

  async function confirmDelivery(saleId: string) {
    setError(null);
    const response = await fetch(`/api/sales/${saleId}/deliver`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });

    if (!response.ok) {
      setError("Nao foi possivel confirmar a entrega.");
      return;
    }

    startTransition(() => router.refresh());
  }

  async function handlePrint(saleId: string) {
    setError(null);
    const response = await fetch(`/api/sales/${saleId}`);
    if (!response.ok) {
      setError("Nao foi possivel carregar o recibo.");
      return;
    }
    const detail = await response.json();
    setPrintSale(detail);
    setTimeout(() => printRecibo(), 100);
  }

  return (
    <section className="space-y-6">
      <PageHeader title="Entregas Pendentes" eyebrow="Operacao" description="Confirmar entregas e imprimir recibos." />

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {printSale ? <PrintRecibo sale={printSale} /> : null}

      {history.length === 0 ? (
        <EmptyState title="Nenhuma entrega pendente" description="Todas as entregas foram confirmadas." />
      ) : (
        <Panel>
          <div className="space-y-4">
            {history.map((sale) => (
              <div key={sale.id} className="flex items-start justify-between border-b border-[var(--border-soft)] pb-4">
                <div className="space-y-1">
                  <p className="font-medium">{sale.customerName ?? "Sem cliente"}</p>
                  <p className="text-sm text-[var(--muted)]">
                    Entregador: {sale.driverName ?? "Sem entregador"}
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    {formatCentsToBRL(sale.totalAmountCents)} - {sale.paymentMethod}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => void handlePrint(sale.id)} disabled={isPending}>
                    Imprimir
                  </Button>
                  <Button onClick={() => void confirmDelivery(sale.id)} disabled={isPending}>
                    Confirmar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Verify typecheck and lint**

Run: `pnpm run typecheck && pnpm run lint`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/layout/app-shell.tsx apps/web/src/app/\(app\)/entregas/
git commit -m "feat(web): add deliveries page with individual confirmation and print"
```

---

### Task 7: Add Print Button to Sales History

**Files:**
- Modify: `apps/web/src/app/(app)/vendas/historico/history-ui.tsx`

**Interfaces:**
- Consumes: `PrintRecibo` component, `printRecibo` function
- Produces: print button per sale in history

- [ ] **Step 1: Add print button to history**

In `apps/web/src/app/(app)/vendas/historico/history-ui.tsx`:

1. Import the receipt component:
```ts
import { PrintRecibo, printRecibo } from "@/components/recibo/print-recibo";
import type { SaleDetailResponse } from "shared";
```

2. Add state for the sale being printed:
```ts
const [printSale, setPrintSale] = useState<SaleDetailResponse | null>(null);
```

3. Add a print handler:
```ts
async function handlePrint(saleId: string) {
  const response = await fetch(`/api/sales/${saleId}`);
  if (!response.ok) return;
  const detail = await response.json();
  setPrintSale(detail);
  setTimeout(() => printRecibo(), 100);
}
```

4. Add a "Imprimir" button in each sale row's actions area:
```tsx
<Button variant="secondary" onClick={() => void handlePrint(sale.id)}>
  Imprimir
</Button>
```

5. Render the PrintRecibo component at the end of the JSX:
```tsx
{printSale ? <PrintRecibo sale={printSale} /> : null}
```

- [ ] **Step 2: Verify typecheck and lint**

Run: `pnpm run typecheck && pnpm run lint`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/\(app\)/vendas/historico/
git commit -m "feat(web): add print receipt button to sales history"
```

---

### Task 8: Add Print Closing Button to Cash Register

**Files:**
- Modify: `apps/web/src/app/(app)/caixa/cash-ui.tsx`

**Interfaces:**
- Consumes: existing cash register details data
- Produces: printable closing report

- [ ] **Step 1: Add print closing area and button**

In `apps/web/src/app/(app)/caixa/cash-ui.tsx`:

1. Add a "Imprimir Fechamento" button (only visible on screen, not in print):

```tsx
<Button variant="secondary" onClick={() => window.print()} className="no-print">
  Imprimir Fechamento
</Button>
```

2. Add a print area at the end of the component that shows only when printing:

```tsx
<div className="print-area hidden">
  <div className="mx-auto max-w-md space-y-4 font-mono text-sm text-black">
    <div className="text-center">
      <h1 className="text-lg font-bold">Planeta Agua</h1>
      <p className="text-xs">Fechamento do Caixa - {new Date().toLocaleDateString("pt-BR")}</p>
    </div>

    <div className="border-t border-black py-2 space-y-1">
      <p>Fundo de caixa: {formatCentsToBRL(details.cashRegister?.openingBalanceCents ?? 0)}</p>
      <p className="font-bold">Total Vendas: {formatCentsToBRL(details.totalSalesCents)}</p>
      <p>Total Despesas: {formatCentsToBRL(details.totalExpensesCents)}</p>
      <p className="font-bold">Saldo Esperado: {formatCentsToBRL(details.expectedCashCents)}</p>
    </div>

    <div className="border-t border-black pt-2">
      <p className="font-bold mb-2">Vendas do Dia:</p>
      {details.todaySales.map((sale) => (
        <div key={sale.id} className="flex justify-between text-xs">
          <span>{new Date(sale.createdAt).toLocaleTimeString("pt-BR")} - {sale.customerName ?? "Sem cliente"} - {sale.paymentMethod}</span>
          <span>{formatCentsToBRL(sale.totalAmountCents)}</span>
        </div>
      ))}
    </div>

    <div className="border-t border-black pt-2">
      <p className="font-bold mb-2">Despesas do Dia:</p>
      {details.todayExpenses.map((expense) => (
        <div key={expense.id} className="flex justify-between text-xs">
          <span>{expense.description} - {expense.paymentMethod ?? "-"}</span>
          <span>{formatCentsToBRL(expense.amountCents)}</span>
        </div>
      ))}
    </div>
  </div>
</div>
```

Make sure `formatCentsToBRL` is imported from `shared`.

- [ ] **Step 2: Verify typecheck and lint**

Run: `pnpm run typecheck && pnpm run lint`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/\(app\)/caixa/cash-ui.tsx
git commit -m "feat(web): add print closing button to cash register page"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Run full typecheck**

Run: `pnpm run typecheck`
Expected: No errors

- [ ] **Step 2: Run full lint**

Run: `pnpm run lint`
Expected: No errors

- [ ] **Step 3: Run full build**

Run: `pnpm run build`
Expected: Success

- [ ] **Step 4: Run all tests**

Run: `pnpm --filter shared test -- --run && pnpm --filter web test -- --run`
Expected: All pass

- [ ] **Step 5: Final commit if needed**

```bash
git add -A
git commit -m "chore: final cleanup for operational improvements"
```
