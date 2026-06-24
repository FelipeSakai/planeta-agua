# UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase font sizes by 30%, separate sales history from checkout, improve cash register with daily details + sale feedback, and add driver management with sale assignment.

**Architecture:** CSS token changes for fonts. Navigation/layout changes for history separation. New API endpoint for cash details. New `drivers` table and module following existing patterns. Integration of `driverId` into sales.

**Tech Stack:** Next.js App Router, Tailwind CSS v4, NestJS, Drizzle ORM, Zod, TypeScript

## Global Constraints

- Monorepo: `apps/web` (Next), `apps/api` (Nest), `packages/shared`
- Next does not access DB directly; all DB operations go through API
- Follow existing patterns: repository/service/controller/module per feature
- Use existing Drizzle schema and database connection
- Run `pnpm run typecheck && pnpm run lint && pnpm run build` after implementation
- Tailwind CSS v4 uses `@theme inline` in globals.css
- All money values in integer cents
- Never physically delete records with operational history

---

### Task 1: Increase Font Sizes by 30%

**Files:**
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/components/layout/app-shell.tsx` (nav link font size)
- Modify: `apps/web/src/components/ui/page-header.tsx`
- Modify: `apps/web/src/components/ui/metric-card.tsx`

**Interfaces:**
- Consumes: existing CSS variables and Tailwind classes
- Produces: larger typography across all pages

- [ ] **Step 1: Update globals.css with base font size**

Read `apps/web/src/app/globals.css`. Add a base font-size to the `body` rule and update the `@theme inline` block with larger font sizes.

Replace the `body` rule (line 42-47) with:

```css
body {
  min-height: 100vh;
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-geist-sans), Arial, Helvetica, sans-serif;
  font-size: 21px;
  line-height: 1.5;
}
```

Add to the `@theme inline` block (after `--font-mono` line):

```css
  --text-xs: 16px;
  --text-sm: 18px;
  --text-base: 21px;
  --text-lg: 23px;
  --text-xl: 28px;
  --text-2xl: 36px;
  --text-3xl: 52px;
```

- [ ] **Step 2: Update navigation link font size**

In `apps/web/src/components/layout/app-shell.tsx`, change the nav link base class from `text-sm` to `text-base`:

```ts
const navLinkBaseClassName = "rounded-xl px-3 py-2 text-base font-medium";
```

- [ ] **Step 3: Update PageHeader component**

Read `apps/web/src/components/ui/page-header.tsx`. Increase all `text-*` classes by one step:
- `text-sm` -> `text-base`
- `text-xl` -> `text-2xl`
- `text-2xl` -> `text-3xl`
- `text-3xl` -> `text-4xl` (if exists)

- [ ] **Step 4: Update MetricCard component**

Read `apps/web/src/components/ui/metric-card.tsx`. Increase:
- Label `text-xs` -> `text-sm`
- Value `text-2xl` -> `text-3xl`
- Detail `text-xs` -> `text-sm`

- [ ] **Step 5: Verify typecheck and lint**

Run: `pnpm run typecheck && pnpm run lint`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/globals.css apps/web/src/components/
git commit -m "feat(ui): increase font sizes by 30% across all pages"
```

---

### Task 2: Separate Sales History Navigation

**Files:**
- Modify: `apps/web/src/components/layout/app-shell.tsx`
- Modify: `apps/web/src/app/(app)/vendas/sales-ui.tsx`

**Interfaces:**
- Consumes: existing navigation array
- Produces: two nav items instead of one, cleaner sales page

- [ ] **Step 1: Update navigation items**

In `apps/web/src/components/layout/app-shell.tsx`, replace the Vendas entry with two entries:

```ts
const navigation: readonly NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard", roles: ["ADMIN", "OPERATOR"] },
  { label: "Nova Venda", href: "/vendas", roles: ["ADMIN", "OPERATOR"] },
  { label: "Historico", href: "/vendas/historico", roles: ["ADMIN", "OPERATOR"] },
  { label: "Caixa", href: "/caixa", roles: ["ADMIN", "OPERATOR"] },
  { label: "Produtos", href: "/produtos", roles: ["ADMIN", "OPERATOR"] },
  { label: "Clientes", href: "/clientes", roles: ["ADMIN", "OPERATOR"] },
  { label: "Entregadores", href: "/entregadores", roles: ["ADMIN", "OPERATOR"] },
  { label: "Estoque", href: "/estoque", roles: ["ADMIN"] },
  { label: "Financeiro", href: "/financeiro/despesas", roles: ["ADMIN", "OPERATOR"] },
  { label: "Usuarios", href: "/usuarios", roles: ["ADMIN"] },
] as const;
```

- [ ] **Step 2: Remove history section from sales-ui.tsx**

Read `apps/web/src/app/(app)/vendas/sales-ui.tsx`. Find the history-related JSX (the section that shows recent sales/history in the sales page) and remove it. Also remove the `Link` import if it was only used for the history link.

Add a "Ver Historico" button in the PageHeader area. Find the PageHeader usage and add an action:

```tsx
<PageHeader
  title="Nova Venda"
  eyebrow="Operacao"
  description="Registre vendas de balcao com checkout rapido."
/>
```

Add a link button below or next to the header:

```tsx
<div className="flex justify-end">
  <Link href="/vendas/historico" className="text-base text-[var(--brand)] hover:underline">
    Ver historico ->
  </Link>
</div>
```

Make sure `Link` is imported from `next/link` (it already is in the current file).

- [ ] **Step 3: Update app-shell test**

Read `apps/web/src/components/layout/app-shell.test.ts`. Update the test to expect the new navigation items count (should be 10 items for ADMIN, adjust accordingly). Update any assertions that check for "Vendas" label to check for "Nova Venda" and "Historico" instead.

- [ ] **Step 4: Verify typecheck and lint**

Run: `pnpm run typecheck && pnpm run lint`
Expected: No errors

- [ ] **Step 5: Run web tests**

Run: `pnpm --filter web test -- --run`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/layout/ apps/web/src/app/\(app\)/vendas/
git commit -m "feat(web): separate sales history navigation from checkout"
```

---

### Task 3: Add Cash Register Details Endpoint

**Files:**
- Modify: `apps/api/src/modules/finance/finance.controller.ts`
- Modify: `apps/api/src/modules/finance/finance.service.ts`
- Modify: `apps/api/src/modules/finance/finance.repository.ts`
- Modify: `packages/shared/src/finance.ts`

**Interfaces:**
- Consumes: existing finance repository methods
- Produces: `GET /cash-register/today/details` endpoint returning sales + expenses of the day

- [ ] **Step 1: Add shared types for cash register details**

Add to `packages/shared/src/finance.ts` (after the existing `cashRegisterResponseSchema`):

```ts
export const cashRegisterSaleItemSchema = z.object({
  id: z.string().uuid(),
  customerName: z.string().nullable(),
  totalAmountCents: z.number().int().min(0),
  paymentMethod: z.enum(paymentMethodValues),
  createdAt: isoDatetimeStringSchema,
});

export const cashRegisterExpenseItemSchema = z.object({
  id: z.string().uuid(),
  description: z.string(),
  amountCents: z.number().int().min(0),
  paymentMethod: z.enum(paymentMethodValues).nullable(),
  category: z.enum(expenseCategoryValues).nullable(),
});

export const cashRegisterDetailsResponseSchema = z.object({
  cashRegister: cashRegisterResponseSchema.nullable(),
  todaySales: z.array(cashRegisterSaleItemSchema),
  todayExpenses: z.array(cashRegisterExpenseItemSchema),
  totalsByPaymentMethod: z.array(
    z.object({
      method: z.enum(paymentMethodValues),
      salesCents: z.number().int().min(0),
      expensesCents: z.number().int().min(0),
    }),
  ),
  totalSalesCents: z.number().int().min(0),
  totalExpensesCents: z.number().int().min(0),
  expectedCashCents: z.number().int(),
});

export type CashRegisterDetailsResponse = z.infer<typeof cashRegisterDetailsResponseSchema>;
export type CashRegisterSaleItem = z.infer<typeof cashRegisterSaleItemSchema>;
export type CashRegisterExpenseItem = z.infer<typeof cashRegisterExpenseItemSchema>;
```

- [ ] **Step 2: Add repository method for daily sales and expenses**

In `apps/api/src/modules/finance/finance.repository.ts`, add a method to fetch today's sales and expenses with details:

```ts
async getTodaySalesDetailed(date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);

  return db.query.sales.findMany({
    where: and(
      gte(sales.createdAt, startOfDay),
      lte(sales.createdAt, endOfDay),
      eq(sales.status, "COMPLETED"),
    ),
    orderBy: [desc(sales.createdAt)],
    with: { customer: { columns: { name: true } } },
  });
}

async getTodayExpensesDetailed(date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);

  return db.query.expenses.findMany({
    where: and(
      gte(expenses.date, startOfDay),
      lte(expenses.date, endOfDay),
      eq(expenses.isDeleted, false),
    ),
    orderBy: [desc(expenses.date)],
  });
}
```

- [ ] **Step 3: Add service method for cash register details**

In `apps/api/src/modules/finance/finance.service.ts`, add:

```ts
async getCashRegisterDetailsForToday() {
  const now = new Date();
  const today = todayDateString();
  const cashRegister = await this.financeRepository.getCashRegisterForDate(today);

  const todaySales = await this.financeRepository.getTodaySalesDetailed(now);
  const todayExpenses = await this.financeRepository.getTodayExpensesDetailed(now);

  const totalsByPaymentMethod = paymentMethodValues.map((method) => {
    const methodSales = todaySales.filter((s) => s.paymentMethod === method);
    const methodExpenses = todayExpenses.filter((e) => e.paymentMethod === method);
    return {
      method,
      salesCents: methodSales.reduce((sum, s) => sum + s.totalAmountCents, 0),
      expensesCents: methodExpenses.reduce((sum, e) => sum + e.amountCents, 0),
    };
  });

  const totalSalesCents = todaySales.reduce((sum, s) => sum + s.totalAmountCents, 0);
  const totalExpensesCents = todayExpenses.reduce((sum, e) => sum + e.amountCents, 0);
  const openingBalance = cashRegister?.openingBalanceCents ?? 0;
  const cashSales = totalsByPaymentMethod.find((t) => t.method === "CASH")?.salesCents ?? 0;
  const cashExpenses = totalsByPaymentMethod.find((t) => t.method === "CASH")?.expensesCents ?? 0;
  const expectedCashCents = openingBalance + cashSales - cashExpenses;

  return {
    cashRegister: cashRegister ? this.toCashRegisterResponse(cashRegister) : null,
    todaySales: todaySales.map((s) => ({
      id: s.id,
      customerName: s.customer?.name ?? null,
      totalAmountCents: s.totalAmountCents,
      paymentMethod: s.paymentMethod,
      createdAt: s.createdAt.toISOString(),
    })),
    todayExpenses: todayExpenses.map((e) => ({
      id: e.id,
      description: e.description,
      amountCents: e.amountCents,
      paymentMethod: e.paymentMethod,
      category: e.category,
    })),
    totalsByPaymentMethod,
    totalSalesCents,
    totalExpensesCents,
    expectedCashCents,
  };
}
```

Make sure `paymentMethodValues` is imported from `shared`.

- [ ] **Step 4: Add controller endpoint**

In `apps/api/src/modules/finance/finance.controller.ts`, add after the `cashRegisterToday` method:

```ts
@Get("cash-register/today/details")
async cashRegisterDetails(@Req() request: Request) {
  await requireRequestUser(request, this.authService);
  return this.financeService.getCashRegisterDetailsForToday();
}
```

- [ ] **Step 5: Rebuild shared and verify typecheck**

Run: `pnpm --filter shared build && pnpm run typecheck`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/finance.ts apps/api/src/modules/finance/
git commit -m "feat(api): add cash register details endpoint with daily sales and expenses"
```

---

### Task 4: Improve Cash Register UI with Daily Details

**Files:**
- Modify: `apps/web/src/lib/finance.ts`
- Modify: `apps/web/src/app/(app)/caixa/page.tsx`
- Modify: `apps/web/src/app/(app)/caixa/cash-ui.tsx`
- Create: `apps/web/src/app/api/cash-register/today/details/route.ts`

**Interfaces:**
- Consumes: `CashRegisterDetailsResponse` from shared
- Produces: enriched cash register page showing sales and expenses of the day

- [ ] **Step 1: Add web API proxy for details**

Create `apps/web/src/app/api/cash-register/today/details/route.ts`:

```ts
import { NextResponse } from "next/server";

import { getServerApiUrl } from "@/lib/api";

function cookieHeader(request: Request) {
  return request.headers.get("cookie") ?? "";
}

export async function GET(request: Request) {
  const response = await fetch(`${getServerApiUrl()}/cash-register/today/details`, {
    headers: { cookie: cookieHeader(request) },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({ ok: response.ok }));
  return NextResponse.json(payload, { status: response.status });
}
```

- [ ] **Step 2: Add fetcher in web lib**

In `apps/web/src/lib/finance.ts`, add:

```ts
export async function fetchCashRegisterDetails(cookieHeader: string): Promise<CashRegisterDetailsResponse | null> {
  const response = await fetch(`${getServerApiUrl()}/cash-register/today/details`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return cashRegisterDetailsResponseSchema.parse(await response.json());
}
```

Make sure to import `CashRegisterDetailsResponse` and `cashRegisterDetailsResponseSchema` from `shared`.

- [ ] **Step 3: Update caixa page to fetch details**

In `apps/web/src/app/(app)/caixa/page.tsx`, replace the data fetching to use `fetchCashRegisterDetails` instead of separate calls:

```tsx
import { cookies } from "next/headers";

import { requireUser } from "@/lib/auth";
import { fetchCashRegisterDetails } from "@/lib/finance";

import { CashUi } from "./cash-ui";

export default async function CaixaPage() {
  const user = await requireUser();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  const details = await fetchCashRegisterDetails(cookieHeader);

  if (!details) {
    return (
      <section className="space-y-6">
        <p className="text-base text-[var(--muted)]">Nao foi possivel carregar o caixa.</p>
      </section>
    );
  }

  return <CashUi details={details} />;
}
```

- [ ] **Step 4: Update CashUi component**

In `apps/web/src/app/(app)/caixa/cash-ui.tsx`, update the props to accept `details` (type `CashRegisterDetailsResponse`) instead of the current props. Keep the existing fundo de caixa, resumo por forma, and fechamento. Add:

1. **Vendas do dia** section — table with: horario, cliente, forma, valor
2. **Despesas do dia** section — table with: descricao, forma, valor
3. **Totais do dia** — 3 MetricCards: Total Vendas, Total Despesas, Saldo Esperado

The existing `summary` prop (PaymentSummary[]) should be derived from `details.totalsByPaymentMethod`.

- [ ] **Step 5: Verify typecheck and lint**

Run: `pnpm run typecheck && pnpm run lint`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/api/cash-register/ apps/web/src/lib/finance.ts apps/web/src/app/\(app\)/caixa/
git commit -m "feat(web): improve cash register page with daily sales and expenses"
```

---

### Task 5: Add Sale Success Feedback Banner

**Files:**
- Modify: `apps/web/src/app/(app)/vendas/sales-ui.tsx`

**Interfaces:**
- Consumes: existing sale creation flow
- Produces: green success banner after sale is finalized

- [ ] **Step 1: Add success banner state**

In `apps/web/src/app/(app)/vendas/sales-ui.tsx`, add state for success message:

```ts
const [successMessage, setSuccessMessage] = useState<string | null>(null);
```

- [ ] **Step 2: Set success message after sale**

In the `handleSubmit` function (or wherever the sale is finalized), after a successful response, set the success message:

```ts
const paymentLabel = paymentMethodLabels[paymentMethod];
const totalFormatted = formatCentsToBRL(totalAmountCents);
const cashNote = paymentMethod === "CASH" ? " Entrou no caixa de hoje." : "";
setSuccessMessage(`Venda registrada! Total: ${totalFormatted} - Forma: ${paymentLabel}.${cashNote}`);
```

- [ ] **Step 3: Clear success on new sale**

When the user starts a new sale (clears the cart or adds a new product), clear the success message:

```ts
setSuccessMessage(null);
```

- [ ] **Step 4: Add auto-dismiss with useEffect**

Add a `useEffect` that clears the success message after 5 seconds:

```ts
useEffect(() => {
  if (!successMessage) return;
  const timer = setTimeout(() => setSuccessMessage(null), 5000);
  return () => clearTimeout(timer);
}, [successMessage]);
```

Make sure `useEffect` is imported from `react`.

- [ ] **Step 5: Render the banner**

Add the banner in the JSX, above the checkout area:

```tsx
{successMessage ? (
  <Alert variant="success">{successMessage}</Alert>
) : null}
```

Make sure `Alert` is imported (it already is).

- [ ] **Step 6: Verify typecheck and lint**

Run: `pnpm run typecheck && pnpm run lint`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/\(app\)/vendas/sales-ui.tsx
git commit -m "feat(web): add success feedback banner after sale completion"
```

---

### Task 6: Add Drivers Table + Migration

**Files:**
- Create: `apps/api/src/db/migrations/0006_drivers.sql`
- Modify: `apps/api/src/db/schema.ts`

**Interfaces:**
- Consumes: existing schema
- Produces: `drivers` table and `driverId` on `sales`

- [ ] **Step 1: Create migration SQL**

Create `apps/api/src/db/migrations/0006_drivers.sql`:

```sql
CREATE TABLE drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sales ADD COLUMN driver_id uuid REFERENCES drivers(id);
```

- [ ] **Step 2: Update Drizzle schema**

In `apps/api/src/db/schema.ts`, add the `drivers` table after `cashRegisters`:

```ts
export const drivers = pgTable("drivers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});
```

Add `driverId` to the `sales` table:

```ts
driverId: uuid("driver_id").references(() => drivers.id),
```

Add relations:

```ts
export const driversRelations = relations(drivers, ({ many }) => ({
  sales: many(sales, { relationName: "saleDriver" }),
}));
```

Update `salesRelations` to include:

```ts
driver: one(drivers, {
  fields: [sales.driverId],
  references: [drivers.id],
  relationName: "saleDriver",
}),
```

- [ ] **Step 3: Push schema to database**

Run: `pnpm db:push`
Expected: Changes applied

- [ ] **Step 4: Verify typecheck**

Run: `pnpm run typecheck`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/db/migrations/0006_drivers.sql apps/api/src/db/schema.ts
git commit -m "feat(db): add drivers table and driver_id on sales"
```

---

### Task 7: Add Shared Contracts for Drivers

**Files:**
- Create: `packages/shared/src/drivers.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/src/sales.ts` (add driverId to createSaleInputSchema)

**Interfaces:**
- Consumes: existing shared patterns
- Produces: `createDriverSchema`, `driverResponseSchema`, `driversListResponseSchema`, `DriverResponse`, etc.

- [ ] **Step 1: Create drivers shared contracts**

Create `packages/shared/src/drivers.ts`:

```ts
import { z } from "zod";

const phoneSchema = z
  .string()
  .trim()
  .min(8)
  .max(20)
  .nullable()
  .optional()
  .transform((value) => {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

export const createDriverSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: phoneSchema,
});

export const updateDriverSchema = createDriverSchema.partial().strict().refine((value) => Object.keys(value).length > 0);

export const driverResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  phone: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const driversListResponseSchema = z.object({
  drivers: z.array(driverResponseSchema),
  summary: z.object({
    total: z.number().int().min(0),
    active: z.number().int().min(0),
  }),
});

export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;
export type DriverResponse = z.infer<typeof driverResponseSchema>;
export type DriversListResponse = z.infer<typeof driversListResponseSchema>;
```

- [ ] **Step 2: Add driverId to sale input schema**

In `packages/shared/src/sales.ts`, add `driverId` to `createSaleInputSchema`:

```ts
export const createSaleInputSchema = z.object({
  customerId: z.string().uuid().nullable(),
  paymentMethod: z.enum(paymentMethodValues),
  items: z.array(saleItemInputSchema).min(1),
  bottle: customerBottleRecordSchema,
  deliveryPending: z.boolean().default(false),
  driverId: z.string().uuid().nullable().optional(),
});
```

Also add `driverId` and `driverName` to `saleHistoryEntrySchema`:

```ts
driverId: z.string().uuid().nullable(),
driverName: z.string().nullable(),
```

- [ ] **Step 3: Update index exports**

In `packages/shared/src/index.ts`, add:

```ts
export * from "./drivers";
```

But since `isBottleExpired` conflicts exist, use named export for drivers:

```ts
export {
  createDriverSchema,
  updateDriverSchema,
  driverResponseSchema,
  driversListResponseSchema,
  type CreateDriverInput,
  type UpdateDriverInput,
  type DriverResponse,
  type DriversListResponse,
} from "./drivers";
```

- [ ] **Step 4: Build shared and verify**

Run: `pnpm --filter shared build && ppm --filter shared test -- --run`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/drivers.ts packages/shared/src/index.ts packages/shared/src/sales.ts
git commit -m "feat(shared): add driver contracts and driverId in sale input"
```

---

### Task 8: Create Drivers Module (API)

**Files:**
- Create: `apps/api/src/modules/drivers/drivers.repository.ts`
- Create: `apps/api/src/modules/drivers/drivers.service.ts`
- Create: `apps/api/src/modules/drivers/drivers.controller.ts`
- Create: `apps/api/src/modules/drivers/drivers.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: Drizzle schema, shared contracts
- Produces: CRUD endpoints for drivers

- [ ] **Step 1: Create drivers repository**

Create `apps/api/src/modules/drivers/drivers.repository.ts`:

```ts
import { Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";

import { db } from "../../db";
import { drivers } from "../../db/schema";
import type { CreateDriverInput, UpdateDriverInput } from "shared";

@Injectable()
export class DriversRepository {
  findMany() {
    return db.query.drivers.findMany({
      orderBy: [asc(drivers.name)],
    });
  }

  findById(id: string) {
    return db.query.drivers.findFirst({
      where: eq(drivers.id, id),
    });
  }

  async create(input: CreateDriverInput) {
    const [driver] = await db.insert(drivers).values(input).returning();
    return driver;
  }

  async update(id: string, input: UpdateDriverInput) {
    const [driver] = await db
      .update(drivers)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(drivers.id, id))
      .returning();
    return driver;
  }

  async setActive(id: string, isActive: boolean) {
    const [driver] = await db
      .update(drivers)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(drivers.id, id))
      .returning();
    return driver;
  }
}
```

- [ ] **Step 2: Create drivers service**

Create `apps/api/src/modules/drivers/drivers.service.ts`:

```ts
import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateDriverInput, DriverResponse, DriversListResponse, UpdateDriverInput } from "shared";

import { DriversRepository } from "./drivers.repository";

type DriverRow = NonNullable<Awaited<ReturnType<DriversRepository["findById"]>>>;

@Injectable()
export class DriversService {
  constructor(private readonly driversRepository: DriversRepository) {}

  async listDrivers(): Promise<DriversListResponse> {
    const drivers = await this.driversRepository.findMany();
    const driverResponses = drivers.map((d) => this.toResponse(d));

    return {
      drivers: driverResponses,
      summary: {
        total: driverResponses.length,
        active: driverResponses.filter((d) => d.isActive).length,
      },
    };
  }

  async createDriver(input: CreateDriverInput): Promise<DriverResponse> {
    const driver = await this.driversRepository.create(input);
    return this.toResponse(driver);
  }

  async updateDriver(id: string, input: UpdateDriverInput): Promise<DriverResponse> {
    await this.ensureDriverExists(id);
    const driver = await this.driversRepository.update(id, input);
    return this.toResponse(driver);
  }

  async toggleActive(id: string): Promise<DriverResponse> {
    const driver = await this.ensureDriverExists(id);
    const toggled = await this.driversRepository.setActive(id, !driver.isActive);
    return this.toResponse(toggled);
  }

  private async ensureDriverExists(id: string): Promise<DriverRow> {
    const driver = await this.driversRepository.findById(id);
    if (!driver) {
      throw new NotFoundException("Entregador nao encontrado.");
    }
    return driver;
  }

  private toResponse(driver: DriverRow): DriverResponse {
    return {
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      isActive: driver.isActive,
      createdAt: driver.createdAt.toISOString(),
      updatedAt: driver.updatedAt.toISOString(),
    };
  }
}
```

- [ ] **Step 3: Create drivers controller**

Create `apps/api/src/modules/drivers/drivers.controller.ts`:

```ts
import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";

import { requireRequestUser } from "../auth/current-user";
import { AuthService } from "../auth/auth.service";
import { DriversService } from "./drivers.service";
import { createDriverSchema, updateDriverSchema } from "shared";

const idSchema = z.string().uuid();

function parseBody<T>(schema: z.ZodType<T>, body: unknown, message: string): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(message);
  }
  return result.data;
}

function parseId(id: string) {
  const result = idSchema.safeParse(id);
  if (!result.success) {
    throw new BadRequestException("Id invalido.");
  }
  return result.data;
}

@Controller("drivers")
export class DriversController {
  constructor(
    private readonly authService: AuthService,
    private readonly driversService: DriversService,
  ) {}

  @Get()
  async list(@Req() request: Request) {
    await requireRequestUser(request, this.authService);
    return this.driversService.listDrivers();
  }

  @Post()
  async create(@Req() request: Request, @Body() body: unknown) {
    await requireRequestUser(request, this.authService);
    const input = parseBody(createDriverSchema, body, "Dados do entregador invalidos.");
    return this.driversService.createDriver(input);
  }

  @Patch(":id")
  async update(@Req() request: Request, @Param("id") id: string, @Body() body: unknown) {
    await requireRequestUser(request, this.authService);
    const input = parseBody(updateDriverSchema, body, "Dados do entregador invalidos.");
    return this.driversService.updateDriver(parseId(id), input);
  }

  @Patch(":id/toggle-active")
  async toggle(@Req() request: Request, @Param("id") id: string) {
    await requireRequestUser(request, this.authService);
    return this.driversService.toggleActive(parseId(id));
  }
}
```

- [ ] **Step 4: Create drivers module**

Create `apps/api/src/modules/drivers/drivers.module.ts`:

```ts
import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DriversController } from "./drivers.controller";
import { DriversRepository } from "./drivers.repository";
import { DriversService } from "./drivers.service";

@Module({
  imports: [AuthModule],
  controllers: [DriversController],
  providers: [DriversRepository, DriversService],
})
export class DriversModule {}
```

- [ ] **Step 5: Register in AppModule**

In `apps/api/src/app.module.ts`, add `DriversModule` to imports:

```ts
import { DriversModule } from "./modules/drivers/drivers.module";

@Module({
  imports: [HealthModule, AuthModule, ProductsModule, StockModule, SalesModule, FinanceModule, CustomersModule, DriversModule],
})
export class AppModule {}
```

- [ ] **Step 6: Verify typecheck**

Run: `pnpm run typecheck`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/drivers/ apps/api/src/app.module.ts
git commit -m "feat(api): add drivers module with CRUD endpoints"
```

---

### Task 9: Create Drivers Web Page + Proxies

**Files:**
- Create: `apps/web/src/app/api/drivers/route.ts`
- Create: `apps/web/src/app/api/drivers/[id]/route.ts`
- Create: `apps/web/src/lib/drivers.ts`
- Create: `apps/web/src/app/(app)/entregadores/page.tsx`
- Create: `apps/web/src/app/(app)/entregadores/drivers-ui.tsx`

**Interfaces:**
- Consumes: DriversModule API endpoints
- Produces: drivers management page

- [ ] **Step 1: Create API proxy routes**

Create `apps/web/src/app/api/drivers/route.ts` (GET + POST, following the products proxy pattern).

Create `apps/web/src/app/api/drivers/[id]/route.ts` (PATCH for update, PATCH for toggle-active sub-route).

Create `apps/web/src/app/api/drivers/[id]/toggle-active/route.ts` (PATCH).

- [ ] **Step 2: Create web lib**

Create `apps/web/src/lib/drivers.ts`:

```ts
import { driversListResponseSchema, type DriversListResponse } from "shared";

import { getServerApiUrl } from "./api";

const emptyResponse: DriversListResponse = {
  drivers: [],
  summary: { total: 0, active: 0 },
};

export async function fetchDrivers(cookieHeader: string): Promise<DriversListResponse> {
  const response = await fetch(`${getServerApiUrl()}/drivers`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!response.ok) {
    return emptyResponse;
  }

  return driversListResponseSchema.parse(await response.json());
}
```

- [ ] **Step 3: Create drivers page**

Create `apps/web/src/app/(app)/entregadores/page.tsx` (follow the products page pattern):

```tsx
import { cookies } from "next/headers";

import { requireUser } from "@/lib/auth";
import { fetchDrivers } from "@/lib/drivers";

import { DriversUi } from "./drivers-ui";

export default async function DriversPage() {
  const user = await requireUser();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  const data = await fetchDrivers(cookieHeader);

  return <DriversUi userRole={user.role} drivers={data.drivers} summary={data.summary} />;
}
```

- [ ] **Step 4: Create drivers UI component**

Create `apps/web/src/app/(app)/entregadores/drivers-ui.tsx`. Follow the pattern from `products-ui.tsx`:
- Dense table with: Nome, Telefone, Status (badge), Ações
- Toolbar with "Novo entregador" button
- Drawer for create/edit (nome + telefone)
- Toggle active/inactive

- [ ] **Step 5: Verify typecheck and lint**

Run: `pnpm run typecheck && pnpm run lint`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/api/drivers/ apps/web/src/lib/drivers.ts apps/web/src/app/\(app\)/entregadores/
git commit -m "feat(web): add drivers management page with CRUD"
```

---

### Task 10: Integrate Driver Selection in Sales

**Files:**
- Modify: `apps/api/src/modules/sales/sales.repository.ts` (save driverId)
- Modify: `apps/api/src/modules/sales/sales.service.ts` (pass driverId)
- Modify: `apps/web/src/app/(app)/vendas/sales-ui.tsx` (add driver select)
- Modify: `apps/web/src/app/(app)/vendas/page.tsx` (fetch drivers)
- Modify: `apps/web/src/lib/sales.ts` (add driverId to payload)

**Interfaces:**
- Consumes: drivers list, sale input with driverId
- Produces: driver selection in checkout, driverId saved on sale

- [ ] **Step 1: Update sales repository to save driverId**

In `apps/api/src/modules/sales/sales.repository.ts`, in the `createSale` method, add `driverId` to the sale insert:

```ts
const [sale] = await tx
  .insert(sales)
  .values({
    customerId: input.customerId,
    userId: input.userId,
    totalAmountCents,
    paymentMethod: input.paymentMethod,
    status: saleStatus,
    bottleMonth: input.bottle?.month ?? null,
    bottleYear: input.bottle?.year ?? null,
    bottleNotes: input.bottle?.notes ?? null,
    driverId: input.driverId ?? null,
  })
  .returning();
```

Also update `listSales` and `getSaleDetail` to include the driver relation:

```ts
with: {
  customer: { columns: { id: true, name: true } },
  user: { columns: { id: true, name: true } },
  canceledByUser: { columns: { id: true, name: true } },
  deliveredByUser: { columns: { id: true, name: true } },
  driver: { columns: { id: true, name: true } },
},
```

- [ ] **Step 2: Update sales service to pass driverId**

In `apps/api/src/modules/sales/sales.service.ts`, ensure `driverId` is passed through from input to repository. The `createSale` method already passes `parsedInput.data` which now includes `driverId`.

Update the `toHistoryResponse` method to include `driverId` and `driverName`:

```ts
driverId: sale.driverId ?? null,
driverName: sale.driver?.name ?? null,
```

- [ ] **Step 3: Update sales types**

In `apps/api/src/modules/sales/sales.types.ts`, add `driverId` to `CreateSaleRepositoryInput`:

```ts
driverId?: string | null;
```

- [ ] **Step 4: Fetch drivers in sales page**

In `apps/web/src/app/(app)/vendas/page.tsx`, fetch drivers and pass to SalesUi:

```tsx
import { fetchDrivers } from "@/lib/drivers";

const [productsData, customers, driversData] = await Promise.all([
  fetchProducts(cookieHeader),
  searchSaleCustomers("", { cookieHeader }),
  fetchDrivers(cookieHeader),
]);

return (
  <SalesUi
    userRole={user.role}
    products={productsData.products.filter((product) => product.isActive)}
    customers={customers}
    drivers={driversData.drivers.filter((d) => d.isActive)}
  />
);
```

- [ ] **Step 5: Add driver select in sales-ui**

In `apps/web/src/app/(app)/vendas/sales-ui.tsx`:
1. Add `drivers` to props (type `DriverResponse[]`)
2. Add `selectedDriverId` state
3. Add a `SelectInput` for "Entregador" in the checkout area (after payment method, before the finalize button)
4. If `deliveryPending` is true and no driver is selected, show an error
5. Include `driverId` in the sale payload

```tsx
<Field label="Entregador">
  <SelectInput
    value={selectedDriverId}
    onChange={(e) => setSelectedDriverId(e.target.value)}
  >
    <option value="">Sem entregador</option>
    {drivers.map((driver) => (
      <option key={driver.id} value={driver.id}>
        {driver.name}
      </option>
    ))}
  </SelectInput>
</Field>
```

- [ ] **Step 6: Update sale payload to include driverId**

In `apps/web/src/lib/sales.ts`, update `saleFormToPayload` to accept and include `driverId`:

```ts
export function saleFormToPayload(formData: FormData, driverId: string | null) {
  return createSaleInputSchema.parse({
    // ...existing fields...
    driverId: driverId || null,
  });
}
```

- [ ] **Step 7: Show driver name in history**

In `apps/web/src/app/(app)/vendas/historico/history-ui.tsx`, add a column for "Entregador" showing `sale.driverName` when present.

- [ ] **Step 8: Verify typecheck and lint**

Run: `pnpm run typecheck && pnpm run lint`
Expected: No errors

- [ ] **Step 9: Run all tests**

Run: `pnpm --filter shared test -- --run && pnpm --filter web test -- --run`
Expected: All pass

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/modules/sales/ apps/web/src/app/\(app\)/vendas/ apps/web/src/lib/sales.ts
git commit -m "feat: integrate driver selection in sales checkout and history"
```

---

### Task 11: Final Verification

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

- [ ] **Step 5: Re-run seed to include drivers**

Run: `ALLOW_SEED=true pnpm db:seed`
Expected: Seed completes (may need to add drivers to seed)

- [ ] **Step 6: Final commit if needed**

```bash
git add -A
git commit -m "chore: final cleanup for UX improvements"
```
