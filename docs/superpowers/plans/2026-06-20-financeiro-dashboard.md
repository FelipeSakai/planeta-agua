# Financeiro Basico + Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar dashboard com dados reais do dia, controle de caixa diario com abertura automatica e fechamento por forma de pagamento, despesas com exclusao logica, e resumo financeiro por periodo para ADMIN.

**Architecture:** Alteracoes descem do shared (contratos zod) -> schema/migration Drizzle -> FinanceModule Nest (repository/service/controller) -> helpers web -> proxy routes -> UI. O caixa abre automaticamente na primeira venda do dia via hook no SalesRepository. Dashboard vira Server Component buscando dados reais.

**Tech Stack:** Next.js App Router, NestJS, Drizzle ORM, PostgreSQL, Zod, Vitest, Tailwind CSS.

## Global Constraints

- Dinheiro em centavos inteiros, nunca number decimal/float para persistir.
- Validacao no servidor para despesas e fechamento de caixa.
- Nao deletar despesas fisicamente; usar exclusao logica (`is_deleted`).
- `OPERATOR` registra despesas e fecha caixa; `ADMIN` acessa financeiro completo (resumo por periodo).
- Reutilizar componentes UI existentes (Panel, Button, TextInput, SelectInput, Field, Badge, Alert, DataTable, EmptyState, MetricCard, PageHeader).
- Apos alterar `packages/shared`, rodar `pnpm --filter shared build` para consumers verem novos exports.
- Testes de repository da API exigem Postgres vivo e migrado (`docker compose up -d && pnpm db:migrate`).
- Rodar verificacoes sequenciais: `pnpm --filter shared test` -> `pnpm --filter web test` -> `pnpm --filter api test` -> `pnpm typecheck` -> `pnpm lint` -> `pnpm build`.
- Nao commitar `next-env.d.ts` ou `packages/shared/dist`.
- Idioma: mensagens em portugues sem acentos ASCII nos testes (o codigo atual usa sem acentos).
- Categorias de despesa fixas: `MARMITA`, `GASOLINA`, `MANUTENCAO`, `OUTRO`.
- Uma sessao de caixa por dia (unique em `date`).
- Caixa abre automaticamente na primeira venda do dia com `opening_balance_cents = 0`.
- Esperado por pagamento: CASH = fundo + vendas_dinheiro - despesas_dinheiro; demais = vendas_metodo - despesas_metodo.
- Vendas canceladas nao entram no caixa. Despesas excluidas logicamente nao entram no caixa.

---

## File Structure

**Shared:**
- Create: `packages/shared/src/finance.ts` — contratos de dashboard, caixa e despesas.
- Modify: `packages/shared/src/index.ts` — exporta finance.

**API:**
- Modify: `apps/api/src/db/schema.ts` — tabela `cash_registers`, soft-delete em `expenses`.
- Create: `apps/api/src/db/migrations/0004_financeiro_dashboard.sql` — migration.
- Create: `apps/api/src/modules/finance/finance.module.ts`
- Create: `apps/api/src/modules/finance/finance.types.ts`
- Create: `apps/api/src/modules/finance/finance.errors.ts`
- Create: `apps/api/src/modules/finance/finance.repository.ts`
- Create: `apps/api/src/modules/finance/finance.service.ts`
- Create: `apps/api/src/modules/finance/finance.controller.ts`
- Create: `apps/api/src/modules/finance/finance.repository.test.ts`
- Create: `apps/api/src/modules/finance/finance.service.test.ts`
- Create: `apps/api/src/modules/finance/finance.controller.test.ts`
- Modify: `apps/api/src/app.module.ts` — registra `FinanceModule`.
- Modify: `apps/api/src/modules/sales/sales.repository.ts` — hook para abrir caixa na primeira venda.

**Web:**
- Create: `apps/web/src/lib/finance.ts` — helpers e fetchers.
- Create: `apps/web/src/app/api/finance/dashboard/route.ts` — proxy.
- Create: `apps/web/src/app/api/cash-register/today/route.ts` — proxy.
- Create: `apps/web/src/app/api/cash-register/today/opening-balance/route.ts` — proxy.
- Create: `apps/web/src/app/api/cash-register/today/close/route.ts` — proxy.
- Create: `apps/web/src/app/api/expenses/route.ts` — proxy.
- Create: `apps/web/src/app/api/expenses/[id]/route.ts` — proxy.
- Rewrite: `apps/web/src/app/(app)/dashboard/page.tsx` — Server Component com dados reais.
- Modify: `apps/web/src/app/(app)/dashboard/page.test.tsx` — atualiza testes.
- Create: `apps/web/src/app/(app)/caixa/page.tsx`
- Create: `apps/web/src/app/(app)/caixa/cash-ui.tsx`
- Create: `apps/web/src/app/(app)/caixa/cash-ui.test.tsx`
- Create: `apps/web/src/app/(app)/financeiro/despesas/page.tsx`
- Create: `apps/web/src/app/(app)/financeiro/despesas/expenses-ui.tsx`
- Create: `apps/web/src/app/(app)/financeiro/despesas/expenses-ui.test.tsx`
- Create: `apps/web/src/app/(app)/financeiro/resumo/page.tsx`
- Create: `apps/web/src/app/(app)/financeiro/resumo/summary-ui.tsx`
- Create: `apps/web/src/app/(app)/financeiro/resumo/summary-ui.test.tsx`
- Modify: `apps/web/src/components/layout/app-shell.tsx` — adiciona "Caixa" na navegacao.

---

### Task 1: Shared contracts (zod schemas + tipos)

**Files:**
- Create: `packages/shared/src/finance.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/finance.test.ts`

**Interfaces:**
- Produces: `expenseCategoryValues` (`MARMITA`, `GASOLINA`, `MANUTENCAO`, `OUTRO`); `createExpenseInputSchema`; `updateExpenseInputSchema`; `expenseResponseSchema`; `expenseListResponseSchema`; `dashboardResponseSchema` (faturamento, qtd vendas, totais por pagamento, estoque baixo, ultimas vendas); `cashRegisterResponseSchema`; `cashRegisterCountsSchema`; `updateOpeningBalanceInputSchema`; `closeCashRegisterInputSchema`; `financeSummaryResponseSchema`.

- [ ] **Step 1: Write failing tests for shared contracts**

Create `packages/shared/src/finance.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  closeCashRegisterInputSchema,
  createExpenseInputSchema,
  cashRegisterResponseSchema,
  dashboardResponseSchema,
  expenseCategoryValues,
  expenseResponseSchema,
  financeSummaryResponseSchema,
  updateExpenseInputSchema,
  updateOpeningBalanceInputSchema,
} from "./finance";

describe("shared finance contracts", () => {
  it("exposes the four fixed expense categories", () => {
    expect(expenseCategoryValues).toEqual(["MARMITA", "GASOLINA", "MANUTENCAO", "OUTRO"]);
  });

  it("validates a create expense input with all fields", () => {
    const parsed = createExpenseInputSchema.parse({
      description: "Marmita entregador",
      amountCents: 2000,
      category: "MARMITA",
      paymentMethod: "CASH",
      date: "2026-06-20",
    });

    expect(parsed.amountCents).toBe(2000);
    expect(parsed.category).toBe("MARMITA");
  });

  it("rejects negative expense amount", () => {
    expect(createExpenseInputSchema.safeParse({ description: "x", amountCents: -1, category: "OUTRO", paymentMethod: "CASH", date: "2026-06-20" }).success).toBe(false);
  });

  it("rejects unknown category", () => {
    expect(createExpenseInputSchema.safeParse({ description: "x", amountCents: 100, category: "WEIRD", paymentMethod: "CASH", date: "2026-06-20" }).success).toBe(false);
  });

  it("allows partial update expense input", () => {
    const parsed = updateExpenseInputSchema.parse({ description: "Nova descricao" });
    expect(parsed.description).toBe("Nova descricao");
  });

  it("validates an expense response with id and metadata", () => {
    const parsed = expenseResponseSchema.parse({
      id: "99999999-9999-4999-8999-999999999999",
      description: "Gasolina",
      amountCents: 5000,
      category: "GASOLINA",
      paymentMethod: "CASH",
      date: "2026-06-20T00:00:00.000Z",
      createdBy: "11111111-1111-4111-8111-111111111111",
      isDeleted: false,
      createdAt: "2026-06-20T10:00:00.000Z",
      updatedAt: "2026-06-20T10:00:00.000Z",
    });

    expect(parsed.isDeleted).toBe(false);
  });

  it("validates a dashboard response with daily metrics", () => {
    const parsed = dashboardResponseSchema.parse({
      todayRevenueCents: 18000,
      todaySalesCount: 5,
      totalsByPaymentMethod: [
        { method: "CASH", salesCount: 2, amountCents: 6000 },
        { method: "PIX", salesCount: 3, amountCents: 12000 },
      ],
      lowStockProducts: [
        { id: "p1", name: "Galao 20L", stockQuantity: 1, minimumStock: 3 },
      ],
      recentSales: [
        { id: "s1", customerName: "Maria", totalAmountCents: 1800, paymentMethod: "PIX", status: "COMPLETED", createdAt: "2026-06-20T10:00:00.000Z" },
      ],
    });

    expect(parsed.todayRevenueCents).toBe(18000);
    expect(parsed.lowStockProducts).toHaveLength(1);
  });

  it("validates a cash register response", () => {
    const parsed = cashRegisterResponseSchema.parse({
      id: "c1",
      date: "2026-06-20",
      openingBalanceCents: 5000,
      openedAt: "2026-06-20T08:00:00.000Z",
      openedByUserId: "u1",
      closedAt: null,
      closedByUserId: null,
      counts: {},
    });

    expect(parsed.openingBalanceCents).toBe(5000);
    expect(parsed.closedAt).toBeNull();
  });

  it("validates opening balance update input", () => {
    const parsed = updateOpeningBalanceInputSchema.parse({ openingBalanceCents: 5000 });
    expect(parsed.openingBalanceCents).toBe(5000);
  });

  it("validates close cash register input with counts per method", () => {
    const parsed = closeCashRegisterInputSchema.parse({
      counts: {
        CASH: { counted: 11500 },
        PIX: { counted: 30000 },
        DEBIT_CARD: { counted: 0 },
        CREDIT_CARD: { counted: 0 },
        OTHER: { counted: 0 },
      },
    });

    expect(parsed.counts.CASH.counted).toBe(11500);
  });

  it("validates a finance summary response", () => {
    const parsed = financeSummaryResponseSchema.parse({
      totalRevenueCents: 18000,
      totalExpensesCents: 5000,
      balanceCents: 13000,
      totalsByPaymentMethod: [
        { method: "CASH", revenueCents: 6000, expensesCents: 2000, balanceCents: 4000 },
      ],
    });

    expect(parsed.balanceCents).toBe(13000);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter shared test`
Expected: FAIL — exports nao existem.

- [ ] **Step 3: Implement shared finance contracts**

Create `packages/shared/src/finance.ts`:

```ts
import { z } from "zod";

import { paymentMethodValues } from "./sales";

export const expenseCategoryValues = ["MARMITA", "GASOLINA", "MANUTENCAO", "OUTRO"] as const;

const nonNegativeAmountCentsSchema = z.number().int().min(0);
const isoDatetimeStringSchema = z.string().datetime({ offset: true });
const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const createExpenseInputSchema = z.object({
  description: z.string().trim().min(2).max(200),
  amountCents: nonNegativeAmountCentsSchema,
  category: z.enum(expenseCategoryValues),
  paymentMethod: z.enum(paymentMethodValues),
  date: dateStringSchema,
});

export const updateExpenseInputSchema = z.object({
  description: z.string().trim().min(2).max(200).optional(),
  amountCents: nonNegativeAmountCentsSchema.optional(),
  category: z.enum(expenseCategoryValues).optional(),
  paymentMethod: z.enum(paymentMethodValues).optional(),
  date: dateStringSchema.optional(),
});

export const expenseResponseSchema = z.object({
  id: z.string().uuid(),
  description: z.string(),
  amountCents: nonNegativeAmountCentsSchema,
  category: z.enum(expenseCategoryValues).nullable(),
  paymentMethod: z.enum(paymentMethodValues).nullable(),
  date: isoDatetimeStringSchema,
  createdBy: z.string().uuid(),
  isDeleted: z.boolean(),
  createdAt: isoDatetimeStringSchema,
  updatedAt: isoDatetimeStringSchema,
});

export const expenseListResponseSchema = z.array(expenseResponseSchema);

const paymentMethodTotalSchema = z.object({
  method: z.enum(paymentMethodValues),
  salesCount: z.number().int().min(0),
  amountCents: nonNegativeAmountCentsSchema,
});

const lowStockProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  stockQuantity: z.number().int(),
  minimumStock: z.number().int(),
});

const recentSaleSchema = z.object({
  id: z.string().uuid(),
  customerName: z.string().nullable(),
  totalAmountCents: nonNegativeAmountCentsSchema,
  paymentMethod: z.enum(paymentMethodValues),
  status: z.enum(["COMPLETED", "CANCELED", "PENDING_DELIVERY"]),
  createdAt: isoDatetimeStringSchema,
});

export const dashboardResponseSchema = z.object({
  todayRevenueCents: nonNegativeAmountCentsSchema,
  todaySalesCount: z.number().int().min(0),
  totalsByPaymentMethod: z.array(paymentMethodTotalSchema),
  lowStockProducts: z.array(lowStockProductSchema),
  recentSales: z.array(recentSaleSchema),
});

export const cashRegisterCountsSchema = z.object({
  expected: nonNegativeAmountCentsSchema,
  counted: nonNegativeAmountCentsSchema,
  difference: z.number().int(),
});

export const cashRegisterResponseSchema = z.object({
  id: z.string().uuid(),
  date: dateStringSchema,
  openingBalanceCents: nonNegativeAmountCentsSchema,
  openedAt: isoDatetimeStringSchema,
  openedByUserId: z.string().uuid(),
  closedAt: isoDatetimeStringSchema.nullable(),
  closedByUserId: z.string().uuid().nullable(),
  counts: z.record(z.string(), cashRegisterCountsSchema),
});

export const updateOpeningBalanceInputSchema = z.object({
  openingBalanceCents: nonNegativeAmountCentsSchema,
});

export const closeCashRegisterInputSchema = z.object({
  counts: z.record(
    z.enum(paymentMethodValues),
    z.object({ counted: nonNegativeAmountCentsSchema }),
  ),
});

const paymentMethodSummarySchema = z.object({
  method: z.enum(paymentMethodValues),
  revenueCents: nonNegativeAmountCentsSchema,
  expensesCents: nonNegativeAmountCentsSchema,
  balanceCents: z.number().int(),
});

export const financeSummaryResponseSchema = z.object({
  totalRevenueCents: nonNegativeAmountCentsSchema,
  totalExpensesCents: nonNegativeAmountCentsSchema,
  balanceCents: z.number().int(),
  totalsByPaymentMethod: z.array(paymentMethodSummarySchema),
});

export type CreateExpenseInput = z.infer<typeof createExpenseInputSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseInputSchema>;
export type ExpenseResponse = z.infer<typeof expenseResponseSchema>;
export type ExpenseListResponse = z.infer<typeof expenseListResponseSchema>;
export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;
export type CashRegisterResponse = z.infer<typeof cashRegisterResponseSchema>;
export type CashRegisterCounts = z.infer<typeof cashRegisterCountsSchema>;
export type UpdateOpeningBalanceInput = z.infer<typeof updateOpeningBalanceInputSchema>;
export type CloseCashRegisterInput = z.infer<typeof closeCashRegisterInputSchema>;
export type FinanceSummaryResponse = z.infer<typeof financeSummaryResponseSchema>;
```

Update `packages/shared/src/index.ts` to add:
```ts
export * from "./finance";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter shared test`
Expected: PASS (all tests green).

- [ ] **Step 5: Build shared and commit**

Run: `pnpm --filter shared build`
```bash
git add packages/shared/src/finance.ts packages/shared/src/finance.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): add finance contracts for dashboard, cash register, expenses, summary"
```

---

### Task 2: DB schema + migration (cash_registers + expenses soft-delete)

**Files:**
- Modify: `apps/api/src/db/schema.ts`
- Create: `apps/api/src/db/migrations/0004_financeiro_dashboard.sql`

**Interfaces:**
- Produces: `cashRegisters` table, `expenses.isDeleted`/`deletedAt`/`deletedBy` columns, relations.

- [ ] **Step 1: Update schema.ts**

Edit `apps/api/src/db/schema.ts`:

1. Add `cashRegisters` table after `expenses`:
```ts
export const cashRegisters = pgTable("cash_registers", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: date("date").notNull().unique(),
  openingBalanceCents: integer("opening_balance_cents").notNull().default(0),
  openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
  openedByUserId: uuid("opened_by_user_id").notNull().references(() => users.id),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  closedByUserId: uuid("closed_by_user_id").references(() => users.id),
  counts: jsonb("counts").notNull().default({}),
  ...timestamps,
});
```

2. Add soft-delete columns to `expenses`:
```ts
export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  description: text("description").notNull(),
  amountCents: integer("amount_cents").notNull(),
  category: text("category"),
  paymentMethod: paymentMethodEnum("payment_method"),
  date: timestamp("date", { withTimezone: true }).notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: uuid("deleted_by").references(() => users.id),
  ...timestamps,
});
```

3. Add relations for `cashRegisters`:
```ts
export const cashRegistersRelations = relations(cashRegisters, ({ one }) => ({
  openedByUser: one(users, { fields: [cashRegisters.openedByUserId], references: [users.id], relationName: "cashRegisterOpenedBy" }),
  closedByUser: one(users, { fields: [cashRegisters.closedByUserId], references: [users.id], relationName: "cashRegisterClosedBy" }),
}));
```

4. Add `deletedExpenses` and `cashRegistersOpened`/`cashRegistersClosed` to `usersRelations`:
```ts
  deletedExpenses: many(expenses, { relationName: "expenseDeletedBy" }),
  openedCashRegisters: many(cashRegisters, { relationName: "cashRegisterOpenedBy" }),
  closedCashRegisters: many(cashRegisters, { relationName: "cashRegisterClosedBy" }),
```

5. Add `expenseDeletedBy` relation to `expensesRelations` (create if not exists):
```ts
export const expensesRelations = relations(expenses, ({ one }) => ({
  createdByUser: one(users, { fields: [expenses.createdBy], references: [users.id], relationName: "expenseCreatedBy" }),
  deletedByUser: one(users, { fields: [expenses.deletedBy], references: [users.id], relationName: "expenseDeletedBy" }),
}));
```
Atualize tambem `createdExpenses` em `usersRelations` para usar `relationName: "expenseCreatedBy"`.

Import `date`, `jsonb`, `boolean` from `drizzle-orm/pg-core` (adicione ao import existente).

- [ ] **Step 2: Generate migration**

Run: `pnpm --filter api db:generate`
Expected: Drizzle cria `apps/api/src/db/migrations/0004_*.sql`. Verifique se contem: `CREATE TABLE "cash_registers"`, `ALTER TABLE "expenses" ADD COLUMN "is_deleted"`, `"deleted_at"`, `"deleted_by"`.

- [ ] **Step 3: Apply migration locally**

Run: `pnpm db:migrate`
Expected: `migrations applied successfully!`

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/db/schema.ts apps/api/src/db/migrations/0004_*.sql apps/api/src/db/migrations/meta/
git commit -m "feat(api): add cash_registers table and expenses soft-delete columns"
```

---

### Task 3: Finance repository — dashboard, cash register, expenses, summary

**Files:**
- Create: `apps/api/src/modules/finance/finance.types.ts`
- Create: `apps/api/src/modules/finance/finance.errors.ts`
- Create: `apps/api/src/modules/finance/finance.repository.ts`
- Test: `apps/api/src/modules/finance/finance.repository.test.ts`

**Interfaces:**
- Consumes: schema de Task 2, shared contracts de Task 1.
- Produces: `FinanceRepository.getDashboardData(date)`, `getCashRegisterForDate(date)`, `createCashRegister(input)`, `updateOpeningBalance(id, cents)`, `closeCashRegister(id, userId, counts)`, `listExpenses(filter)`, `createExpense(input)`, `updateExpense(id, input)`, `softDeleteExpense(id, userId)`, `getFinanceSummary(startDate, endDate)`.

- [ ] **Step 1: Create finance.types.ts**

Create `apps/api/src/modules/finance/finance.types.ts`:
```ts
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { cashRegisters, expenses } from "../../db/schema";
import type { paymentMethodValues, expenseCategoryValues } from "shared";

export type CashRegisterRow = InferSelectModel<typeof cashRegisters>;
export type NewCashRegisterRow = InferInsertModel<typeof cashRegisters>;
export type ExpenseRow = InferSelectModel<typeof expenses>;
export type NewExpenseRow = InferInsertModel<typeof expenses>;
export type PaymentMethod = (typeof paymentMethodValues)[number];
export type ExpenseCategory = (typeof expenseCategoryValues)[number];

export type CreateExpenseRepositoryInput = {
  description: string;
  amountCents: number;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  date: Date;
  createdBy: string;
};

export type UpdateExpenseRepositoryInput = Partial<Omit<CreateExpenseRepositoryInput, "createdBy">>;

export type ListExpensesFilter = {
  startDate?: Date;
  endDate?: Date;
  includeDeleted?: boolean;
};

export type CloseCashRegisterRepositoryInput = {
  id: string;
  userId: string;
  counts: Record<string, { expected: number; counted: number; difference: number }>;
};

export type CreateCashRegisterInput = {
  date: string;
  openingBalanceCents: number;
  userId: string;
};
```

- [ ] **Step 2: Create finance.errors.ts**

Create `apps/api/src/modules/finance/finance.errors.ts`:
```ts
export type FinanceRepositoryErrorCode =
  | "CASH_REGISTER_NOT_FOUND"
  | "CASH_REGISTER_ALREADY_CLOSED"
  | "CASH_REGISTER_CLOSED"
  | "EXPENSE_NOT_FOUND"
  | "EXPENSE_ALREADY_DELETED";

export class FinanceRepositoryError extends Error {
  readonly code: FinanceRepositoryErrorCode;

  constructor(code: FinanceRepositoryErrorCode, message: string) {
    super(message);
    this.name = "FinanceRepositoryError";
    this.code = code;
  }
}
```

- [ ] **Step 3: Write failing repository tests**

Create `apps/api/src/modules/finance/finance.repository.test.ts`:
```ts
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { closeDb, db } from "../../db";
import { cashRegisters, expenses, products, sales, saleItems, sessions, stockMovements, users } from "../../db/schema";
import { FinanceRepositoryError } from "./finance.errors";
import { FinanceRepository } from "./finance.repository";

describe("FinanceRepository", () => {
  const repository = new FinanceRepository();

  beforeEach(async () => {
    await db.delete(sessions);
    await db.delete(stockMovements);
    await db.delete(saleItems);
    await db.delete(sales);
    await db.delete(expenses);
    await db.delete(cashRegisters);
    await db.delete(products);
    await db.delete(users);
  });

  afterAll(async () => {
    await closeDb();
  });

  it("creates and retrieves a cash register for today", async () => {
    const [user] = await db.insert(users).values({ name: "Op", email: "op@p.local", passwordHash: "h", role: "OPERATOR" }).returning();
    const created = await repository.createCashRegister({ date: "2026-06-20", openingBalanceCents: 5000, userId: user.id });
    const found = await repository.getCashRegisterForDate("2026-06-20");

    expect(found?.id).toBe(created.id);
    expect(found?.openingBalanceCents).toBe(5000);
  });

  it("updates opening balance on an open cash register", async () => {
    const [user] = await db.insert(users).values({ name: "Op", email: "op2@p.local", passwordHash: "h", role: "OPERATOR" }).returning();
    const created = await repository.createCashRegister({ date: "2026-06-21", openingBalanceCents: 0, userId: user.id });
    const updated = await repository.updateOpeningBalance(created.id, 3000);

    expect(updated.openingBalanceCents).toBe(3000);
  });

  it("rejects opening balance update on a closed cash register", async () => {
    const [user] = await db.insert(users).values({ name: "Op", email: "op3@p.local", passwordHash: "h", role: "OPERATOR" }).returning();
    const created = await repository.createCashRegister({ date: "2026-06-22", openingBalanceCents: 0, userId: user.id });
    await repository.closeCashRegister({
      id: created.id,
      userId: user.id,
      counts: { CASH: { expected: 0, counted: 0, difference: 0 }, PIX: { expected: 0, counted: 0, difference: 0 }, DEBIT_CARD: { expected: 0, counted: 0, difference: 0 }, CREDIT_CARD: { expected: 0, counted: 0, difference: 0 }, OTHER: { expected: 0, counted: 0, difference: 0 } },
    });

    await expect(repository.updateOpeningBalance(created.id, 5000)).rejects.toMatchObject({ code: "CASH_REGISTER_CLOSED" });
  });

  it("closes a cash register with counts and computes difference", async () => {
    const [user] = await db.insert(users).values({ name: "Op", email: "op4@p.local", passwordHash: "h", role: "OPERATOR" }).returning();
    const created = await repository.createCashRegister({ date: "2026-06-23", openingBalanceCents: 1000, userId: user.id });
    const closed = await repository.closeCashRegister({
      id: created.id,
      userId: user.id,
      counts: { CASH: { expected: 1000, counted: 900, difference: -100 }, PIX: { expected: 0, counted: 0, difference: 0 }, DEBIT_CARD: { expected: 0, counted: 0, difference: 0 }, CREDIT_CARD: { expected: 0, counted: 0, difference: 0 }, OTHER: { expected: 0, counted: 0, difference: 0 } },
    });

    expect(closed.closedAt).not.toBeNull();
    expect(closed.counts.CASH.difference).toBe(-100);
  });

  it("rejects closing an already closed cash register", async () => {
    const [user] = await db.insert(users).values({ name: "Op", email: "op5@p.local", passwordHash: "h", role: "OPERATOR" }).returning();
    const created = await repository.createCashRegister({ date: "2026-06-24", openingBalanceCents: 0, userId: user.id });
    const counts = { CASH: { expected: 0, counted: 0, difference: 0 }, PIX: { expected: 0, counted: 0, difference: 0 }, DEBIT_CARD: { expected: 0, counted: 0, difference: 0 }, CREDIT_CARD: { expected: 0, counted: 0, difference: 0 }, OTHER: { expected: 0, counted: 0, difference: 0 } };
    await repository.closeCashRegister({ id: created.id, userId: user.id, counts });

    await expect(repository.closeCashRegister({ id: created.id, userId: user.id, counts })).rejects.toMatchObject({ code: "CASH_REGISTER_ALREADY_CLOSED" });
  });

  it("creates, lists, updates, and soft-deletes expenses", async () => {
    const [user] = await db.insert(users).values({ name: "Op", email: "op6@p.local", passwordHash: "h", role: "OPERATOR" }).returning();

    const created = await repository.createExpense({
      description: "Marmita",
      amountCents: 2000,
      category: "MARMITA",
      paymentMethod: "CASH",
      date: new Date("2026-06-20T00:00:00Z"),
      createdBy: user.id,
    });

    const listed = await repository.listExpenses({});
    expect(listed).toHaveLength(1);

    const updated = await repository.updateExpense(created.id, { description: "Marmita e agua" });
    expect(updated.description).toBe("Marmita e agua");

    const deleted = await repository.softDeleteExpense(created.id, user.id);
    expect(deleted.isDeleted).toBe(true);

    const activeOnly = await repository.listExpenses({ includeDeleted: false });
    expect(activeOnly).toHaveLength(0);
  });

  it("rejects soft-deleting an already deleted expense", async () => {
    const [user] = await db.insert(users).values({ name: "Op", email: "op7@p.local", passwordHash: "h", role: "OPERATOR" }).returning();
    const created = await repository.createExpense({ description: "x", amountCents: 100, category: "OUTRO", paymentMethod: "CASH", date: new Date("2026-06-20T00:00:00Z"), createdBy: user.id });
    await repository.softDeleteExpense(created.id, user.id);

    await expect(repository.softDeleteExpense(created.id, user.id)).rejects.toMatchObject({ code: "EXPENSE_ALREADY_DELETED" });
  });

  it("returns dashboard data with revenue, counts, low stock and recent sales", async () => {
    const [user] = await db.insert(users).values({ name: "Op", email: "op8@p.local", passwordHash: "h", role: "OPERATOR" }).returning();
    const [product] = await db.insert(products).values({ name: "Galao 20L", salePriceCents: 1800, stockQuantity: 1, minimumStock: 5 }).returning();
    const [sale] = await db.insert(sales).values({ userId: user.id, totalAmountCents: 1800, paymentMethod: "PIX", status: "COMPLETED" }).returning();
    await db.insert(saleItems).values({ saleId: sale.id, productId: product.id, productNameSnapshot: "Galao 20L", quantity: 1, unitPriceCents: 1800, totalPriceCents: 1800 });

    const data = await repository.getDashboardData(new Date("2026-06-20T00:00:00Z"));

    expect(data.todayRevenueCents).toBe(1800);
    expect(data.todaySalesCount).toBe(1);
    expect(data.lowStockProducts).toHaveLength(1);
    expect(data.recentSales).toHaveLength(1);
  });

  it("returns finance summary for a period", async () => {
    const [user] = await db.insert(users).values({ name: "Op", email: "op9@p.local", passwordHash: "h", role: "OPERATOR" }).returning();
    await db.insert(sales).values({ userId: user.id, totalAmountCents: 5000, paymentMethod: "CASH", status: "COMPLETED" });
    await db.insert(expenses).values({ description: "Gas", amountCents: 1000, category: "GASOLINA", paymentMethod: "CASH", date: new Date(), createdBy: user.id });

    const summary = await repository.getFinanceSummary(new Date("2026-01-01T00:00:00Z"), new Date("2026-12-31T23:59:59Z"));

    expect(summary.totalRevenueCents).toBe(5000);
    expect(summary.totalExpensesCents).toBe(1000);
    expect(summary.balanceCents).toBe(4000);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx vitest run apps/api/src/modules/finance/finance.repository.test.ts`
Expected: FAIL — modulo nao existe.

- [ ] **Step 5: Implement finance.repository.ts**

Create `apps/api/src/modules/finance/finance.repository.ts`:

```ts
import { Injectable } from "@nestjs/common";
import { and, asc, desc, eq, gte, lte, isNull, sql, inArray } from "drizzle-orm";

import { db } from "../../db";
import { cashRegisters, expenses, products, sales } from "../../db/schema";
import { paymentMethodValues } from "shared";
import { FinanceRepositoryError } from "./finance.errors";
import type {
  CashRegisterRow,
  CloseCashRegisterRepositoryInput,
  CreateCashRegisterInput,
  CreateExpenseRepositoryInput,
  ListExpensesFilter,
  UpdateExpenseRepositoryInput,
} from "./finance.types";

const completedStatus = "COMPLETED" as const;

@Injectable()
export class FinanceRepository {
  async getDashboardData(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const todaySales = await db.query.sales.findMany({
      where: and(gte(sales.createdAt, startOfDay), lte(sales.createdAt, endOfDay), eq(sales.status, completedStatus)),
    });

    const todayRevenueCents = todaySales.reduce((sum, s) => sum + s.totalAmountCents, 0);
    const totalsByPaymentMethod = paymentMethodValues.map((method) => {
      const methodSales = todaySales.filter((s) => s.paymentMethod === method);
      return { method, salesCount: methodSales.length, amountCents: methodSales.reduce((sum, s) => sum + s.totalAmountCents, 0) };
    });

    const lowStockProducts = await db.query.products.findMany({
      where: sql`${products.stockQuantity} <= ${products.minimumStock}`,
      limit: 10,
    });

    const recentSales = await db.query.sales.findMany({
      where: eq(sales.status, completedStatus),
      orderBy: [desc(sales.createdAt)],
      limit: 10,
      with: { customer: { columns: { name: true } } },
    });

    return {
      todayRevenueCents,
      todaySalesCount: todaySales.length,
      totalsByPaymentMethod,
      lowStockProducts: lowStockProducts.map((p) => ({ id: p.id, name: p.name, stockQuantity: p.stockQuantity, minimumStock: p.minimumStock })),
      recentSales: recentSales.map((s) => ({
        id: s.id,
        customerName: s.customer?.name ?? null,
        totalAmountCents: s.totalAmountCents,
        paymentMethod: s.paymentMethod,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
      })),
    };
  }

  async getCashRegisterForDate(date: string): Promise<CashRegisterRow | undefined> {
    const [row] = await db.select().from(cashRegisters).where(eq(cashRegisters.date, date)).limit(1);
    return row;
  }

  async createCashRegister(input: CreateCashRegisterInput): Promise<CashRegisterRow> {
    const [row] = await db.insert(cashRegisters).values({
      date: input.date,
      openingBalanceCents: input.openingBalanceCents,
      openedByUserId: input.userId,
    }).returning();
    return row;
  }

  async updateOpeningBalance(id: string, openingBalanceCents: number): Promise<CashRegisterRow> {
    const [existing] = await db.select().from(cashRegisters).where(eq(cashRegisters.id, id)).for("update");
    if (!existing) throw new FinanceRepositoryError("CASH_REGISTER_NOT_FOUND", "Caixa nao encontrado.");
    if (existing.closedAt) throw new FinanceRepositoryError("CASH_REGISTER_CLOSED", "Caixa fechado nao pode ter fundo alterado.");

    const [updated] = await db.update(cashRegisters).set({ openingBalanceCents, updatedAt: new Date() }).where(eq(cashRegisters.id, id)).returning();
    return updated;
  }

  async closeCashRegister(input: CloseCashRegisterRepositoryInput): Promise<CashRegisterRow> {
    const [existing] = await db.select().from(cashRegisters).where(eq(cashRegisters.id, input.id)).for("update");
    if (!existing) throw new FinanceRepositoryError("CASH_REGISTER_NOT_FOUND", "Caixa nao encontrado.");
    if (existing.closedAt) throw new FinanceRepositoryError("CASH_REGISTER_ALREADY_CLOSED", "Caixa ja fechado.");

    const [updated] = await db.update(cashRegisters).set({
      closedAt: new Date(),
      closedByUserId: input.userId,
      counts: input.counts,
      updatedAt: new Date(),
    }).where(eq(cashRegisters.id, input.id)).returning();
    return updated;
  }

  async listExpenses(filter: ListExpensesFilter = {}) {
    const conditions = [];
    if (!filter.includeDeleted) conditions.push(eq(expenses.isDeleted, false));
    if (filter.startDate) conditions.push(gte(expenses.date, filter.startDate));
    if (filter.endDate) conditions.push(lte(expenses.date, filter.endDate));

    return db.query.expenses.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(expenses.date)],
    });
  }

  async createExpense(input: CreateExpenseRepositoryInput) {
    const [row] = await db.insert(expenses).values(input).returning();
    return row;
  }

  async updateExpense(id: string, input: UpdateExpenseRepositoryInput) {
    const [existing] = await db.select().from(expenses).where(eq(expenses.id, id)).for("update");
    if (!existing) throw new FinanceRepositoryError("EXPENSE_NOT_FOUND", "Despesa nao encontrada.");
    const [updated] = await db.update(expenses).set({ ...input, updatedAt: new Date() }).where(eq(expenses.id, id)).returning();
    return updated;
  }

  async softDeleteExpense(id: string, userId: string) {
    const [existing] = await db.select().from(expenses).where(eq(expenses.id, id)).for("update");
    if (!existing) throw new FinanceRepositoryError("EXPENSE_NOT_FOUND", "Despesa nao encontrada.");
    if (existing.isDeleted) throw new FinanceRepositoryError("EXPENSE_ALREADY_DELETED", "Despesa ja excluida.");
    const [updated] = await db.update(expenses).set({ isDeleted: true, deletedAt: new Date(), deletedBy: userId, updatedAt: new Date() }).where(eq(expenses.id, id)).returning();
    return updated;
  }

  async getFinanceSummary(startDate: Date, endDate: Date) {
    const periodSales = await db.query.sales.findMany({
      where: and(gte(sales.createdAt, startDate), lte(sales.createdAt, endDate), eq(sales.status, completedStatus)),
    });
    const periodExpenses = await db.query.expenses.findMany({
      where: and(gte(expenses.date, startDate), lte(expenses.date, endDate), eq(expenses.isDeleted, false)),
    });

    const totalRevenueCents = periodSales.reduce((sum, s) => sum + s.totalAmountCents, 0);
    const totalExpensesCents = periodExpenses.reduce((sum, e) => sum + e.amountCents, 0);

    const totalsByPaymentMethod = paymentMethodValues.map((method) => {
      const revenueCents = periodSales.filter((s) => s.paymentMethod === method).reduce((sum, s) => sum + s.totalAmountCents, 0);
      const expensesCents = periodExpenses.filter((e) => e.paymentMethod === method).reduce((sum, e) => sum + e.amountCents, 0);
      return { method, revenueCents, expensesCents, balanceCents: revenueCents - expensesCents };
    });

    return { totalRevenueCents, totalExpensesCents, balanceCents: totalRevenueCents - totalExpensesCents, totalsByPaymentMethod };
  }

  async getExpectedCashTotals(date: string, openingBalanceCents: number) {
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const daySales = await db.query.sales.findMany({
      where: and(gte(sales.createdAt, startOfDay), lte(sales.createdAt, endOfDay), eq(sales.status, completedStatus)),
    });
    const dayExpenses = await db.query.expenses.findMany({
      where: and(gte(expenses.date, startOfDay), lte(expenses.date, endOfDay), eq(expenses.isDeleted, false)),
    });

    return paymentMethodValues.map((method) => {
      const salesCents = daySales.filter((s) => s.paymentMethod === method).reduce((sum, s) => sum + s.totalAmountCents, 0);
      const expensesCents = dayExpenses.filter((e) => e.paymentMethod === method).reduce((sum, e) => sum + e.amountCents, 0);
      const expected = method === "CASH" ? openingBalanceCents + salesCents - expensesCents : salesCents - expensesCents;
      return { method, expected: Math.max(0, expected), salesCents, expensesCents };
    });
  }
}
```

- [ ] **Step 6: Run repository tests to verify they pass**

Run: `npx vitest run apps/api/src/modules/finance/finance.repository.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/finance/finance.types.ts apps/api/src/modules/finance/finance.errors.ts apps/api/src/modules/finance/finance.repository.ts apps/api/src/modules/finance/finance.repository.test.ts
git commit -m "feat(api): finance repository with dashboard, cash register, expenses, summary"
```

---

### Task 4: Finance service + controller + module

**Files:**
- Create: `apps/api/src/modules/finance/finance.service.ts`
- Create: `apps/api/src/modules/finance/finance.controller.ts`
- Create: `apps/api/src/modules/finance/finance.module.ts`
- Test: `apps/api/src/modules/finance/finance.service.test.ts`
- Test: `apps/api/src/modules/finance/finance.controller.test.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: `FinanceRepository` de Task 3, shared contracts de Task 1.
- Produces: endpoints `GET /finance/dashboard`, `GET /cash-register/today`, `POST /cash-register/today/opening-balance`, `POST /cash-register/today/close`, `GET /expenses`, `POST /expenses`, `PATCH /expenses/:id`, `DELETE /expenses/:id`, `GET /finance/summary`.

- [ ] **Step 1: Write failing service tests**

Create `apps/api/src/modules/finance/finance.service.test.ts` com testes para:
- `getDashboardData()` delega ao repository.
- `getCashRegisterForToday()` retorna null se nao existe.
- `updateOpeningBalance()` valida input e mapeia `CASH_REGISTER_CLOSED` para `BadRequestException`.
- `closeCashRegister()` valida input, calcula esperado via `getExpectedCashTotals`, mapeia erros.
- `listExpenses()`, `createExpense()`, `updateExpense()`, `softDeleteExpense()` delegam e mapeiam erros.
- `getFinanceSummary()` delega ao repository.
- `ensureCashRegisterForToday()` cria caixa se nao existe (usado pelo hook de vendas).

Use o padrao do `sales.service.test.ts`: mock factory com `vi.fn()`, `new FinanceService(repository as never)`.

- [ ] **Step 2: Run service tests to verify they fail**

Run: `npx vitest run apps/api/src/modules/finance/finance.service.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement finance.service.ts**

Create `apps/api/src/modules/finance/finance.service.ts`. O service:
- Recebe `FinanceRepository` no constructor.
- `getDashboardData()` -> repository.getDashboardData(new Date()).
- `getCashRegisterForToday()` -> busca caixa de hoje (formato YYYY-MM-DD); retorna null se nao existe.
- `ensureCashRegisterForToday(userId)` -> busca caixa de hoje; se nao existe, cria com fundo 0. Retorna o caixa.
- `updateOpeningBalance(user, input)` -> valida com `updateOpeningBalanceInputSchema`, busca caixa de hoje, atualiza fundo. Mapeia `CASH_REGISTER_NOT_FOUND` -> `NotFoundException`, `CASH_REGISTER_CLOSED` -> `BadRequestException`.
- `closeCashRegister(user, input)` -> valida com `closeCashRegisterInputSchema`, busca caixa de hoje, calcula esperado via `getExpectedCashTotals`, monta counts com difference = counted - expected, fecha. Mapeia erros.
- `listExpenses(filter)` -> repository.listExpenses(filter), mapeia para response.
- `createExpense(user, input)` -> valida com `createExpenseInputSchema`, cria.
- `updateExpense(user, id, input)` -> valida com `updateExpenseInputSchema`, atualiza. Mapeia `EXPENSE_NOT_FOUND` -> `NotFoundException`.
- `softDeleteExpense(user, id)` -> repository.softDeleteExpense. Mapeia erros.
- `getFinanceSummary(startDate, endDate)` -> repository.getFinanceSummary.
- `toExpenseResponse(row)` -> mapeia ExpenseRow para ExpenseResponse.

Siga o padrao de `sales.service.ts` para mapeamento de erros.

- [ ] **Step 4: Implement finance.controller.ts**

Create `apps/api/src/modules/finance/finance.controller.ts` com os endpoints listados. Cada endpoint chama `requireRequestUser(request, this.authService)` e delega ao service. Use o padrao de `sales.controller.ts`.

```ts
import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";

import { requireRequestUser } from "../auth/current-user";
import { AuthService } from "../auth/auth.service";
import { FinanceService } from "./finance.service";

const idSchema = z.string().uuid();

function parseBody<T>(schema: z.ZodType<T>, body: unknown, message: string): T {
  const result = schema.safeParse(body);
  if (!result.success) throw new BadRequestException(message);
  return result.data;
}

function parseId(id: string) {
  const result = idSchema.safeParse(id);
  if (!result.success) throw new BadRequestException("ID invalido.");
  return result.data;
}

@Controller()
export class FinanceController {
  constructor(
    private readonly authService: AuthService,
    private readonly financeService: FinanceService,
  ) {}

  @Get("finance/dashboard")
  async dashboard(@Req() request: Request) {
    await requireRequestUser(request, this.authService);
    return this.financeService.getDashboardData();
  }

  @Get("cash-register/today")
  async cashRegisterToday(@Req() request: Request) {
    await requireRequestUser(request, this.authService);
    return this.financeService.getCashRegisterForToday();
  }

  @Post("cash-register/today/opening-balance")
  async updateOpeningBalance(@Req() request: Request, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    return this.financeService.updateOpeningBalance(user, body);
  }

  @Post("cash-register/today/close")
  async closeCashRegister(@Req() request: Request, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    return this.financeService.closeCashRegister(user, body);
  }

  @Get("expenses")
  async listExpenses(@Req() request: Request, @Query("startDate") startDate?: string, @Query("endDate") endDate?: string) {
    await requireRequestUser(request, this.authService);
    return this.financeService.listExpenses({ startDate: startDate ? new Date(startDate) : undefined, endDate: endDate ? new Date(endDate) : undefined });
  }

  @Post("expenses")
  async createExpense(@Req() request: Request, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    return this.financeService.createExpense(user, body);
  }

  @Patch("expenses/:id")
  async updateExpense(@Param("id") id: string, @Req() request: Request, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    return this.financeService.updateExpense(user, parseId(id), body);
  }

  @Delete("expenses/:id")
  async deleteExpense(@Param("id") id: string, @Req() request: Request) {
    const user = await requireRequestUser(request, this.authService);
    return this.financeService.softDeleteExpense(user, parseId(id));
  }

  @Get("finance/summary")
  async summary(@Req() request: Request, @Query("startDate") startDate?: string, @Query("endDate") endDate?: string) {
    const user = await requireRequestUser(request, this.authService);
    if (user.role !== "ADMIN") throw new BadRequestException("Acesso restrito ao ADMIN.");
    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = endDate ? new Date(endDate) : new Date(new Date().setHours(23, 59, 59, 999));
    return this.financeService.getFinanceSummary(start, end);
  }
}
```

- [ ] **Step 5: Create finance.module.ts**

```ts
import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { FinanceController } from "./finance.controller";
import { FinanceRepository } from "./finance.repository";
import { FinanceService } from "./finance.service";

@Module({
  imports: [AuthModule],
  controllers: [FinanceController],
  providers: [FinanceRepository, FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
```

Verifique se `AuthModule` exporta `AuthService`. Se nao, ajuste o import para seguir o padrao de `SalesModule`.

- [ ] **Step 6: Register FinanceModule in app.module.ts**

Edit `apps/api/src/app.module.ts`:
```ts
import { FinanceModule } from "./modules/finance/finance.module";
// ...
  imports: [HealthModule, AuthModule, ProductsModule, StockModule, SalesModule, FinanceModule],
```

- [ ] **Step 7: Write controller tests**

Create `apps/api/src/modules/finance/finance.controller.test.ts` seguindo o padrao de `sales.controller.test.ts`. Teste:
- `GET /finance/dashboard` exige auth.
- `POST /cash-register/today/close` exige auth e valida body.
- `GET /finance/summary` exige role ADMIN.
- `POST /expenses` exige auth e valida body.

- [ ] **Step 8: Run all API tests**

Run: `pnpm --filter api test`
Expected: PASS (todos os testes, antigos e novos).

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/finance/finance.service.ts apps/api/src/modules/finance/finance.service.test.ts apps/api/src/modules/finance/finance.controller.ts apps/api/src/modules/finance/finance.controller.test.ts apps/api/src/modules/finance/finance.module.ts apps/api/src/app.module.ts
git commit -m "feat(api): finance service, controller, module with dashboard, cash register, expenses, summary endpoints"
```

---

### Task 5: Hook caixa automatico na primeira venda

**Files:**
- Modify: `apps/api/src/modules/sales/sales.repository.ts`
- Modify: `apps/api/src/modules/sales/sales.module.ts`
- Test: `apps/api/src/modules/sales/sales.repository.test.ts`

**Interfaces:**
- Consumes: `FinanceService.ensureCashRegisterForToday(userId)` de Task 4.
- Produces: `createSale` abre caixa automaticamente antes de registrar a venda se nao existir para hoje.

- [ ] **Step 1: Write failing test**

Em `apps/api/src/modules/sales/sales.repository.test.ts`, adicione teste que verifica que apos `createSale`, existe um `cash_register` para a data de hoje. Como o repository atual nao tem dependencia de FinanceService, a integracao real sera testada no service ou e2e. Para o teste de repository, voce pode testar que o hook e chamado mockando.

Alternativa mais simples: mover o hook para o `SalesService` em vez do repository, para manter o repository focado em DB. Assim o service chama `financeService.ensureCashRegisterForToday(user.id)` antes de `salesRepository.createSale`.

**Decisao:** mover o hook para o `SalesService`. Isso mantem o repository limpo e o service orquestra.

- [ ] **Step 2: Modify SalesService to call FinanceService**

Edit `apps/api/src/modules/sales/sales.service.ts`:
1. Adicione `FinanceService` no constructor.
2. Em `createSale()`, antes de `salesRepository.createSale()`, chame `this.financeService.ensureCashRegisterForToday(user.id)`.
3. Nao espere erro do caixa bloquear a venda — se falhar, loga mas continua (ou deixa propagar se preferir; recomendo propagar pois caixa e critico).

Edit `apps/api/src/modules/sales/sales.module.ts`:
1. Importe `FinanceModule`.
2. Adicione `FinanceModule` em `imports`.

- [ ] **Step 3: Write service test for the hook**

Em `apps/api/src/modules/sales/sales.service.test.ts`, adicione teste:
```ts
  it("ensures cash register exists before creating a sale", async () => {
    const repository = createRepository();
    const financeService = { ensureCashRegisterForToday: vi.fn().mockResolvedValue(undefined) };
    const service = new SalesService(repository as never, financeService as never);
    const input = { customerId: null, paymentMethod: "PIX" as const, items: [{ productId: "33333333-3333-4333-8333-333333333333", quantity: 1 }], bottle: null, deliveryPending: false };

    repository.createSale.mockResolvedValueOnce({ id: "s1" });
    await service.createSale(operatorUser, input);

    expect(financeService.ensureCashRegisterForToday).toHaveBeenCalledWith(operatorUser.id);
  });
```

- [ ] **Step 4: Run API tests**

Run: `pnpm --filter api test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/sales/sales.service.ts apps/api/src/modules/sales/sales.service.test.ts apps/api/src/modules/sales/sales.module.ts
git commit -m "feat(api): auto-open cash register on first sale of the day"
```

---

### Task 6: Web lib helpers + proxy routes

**Files:**
- Create: `apps/web/src/lib/finance.ts`
- Create: `apps/web/src/app/api/finance/dashboard/route.ts`
- Create: `apps/web/src/app/api/cash-register/today/route.ts`
- Create: `apps/web/src/app/api/cash-register/today/opening-balance/route.ts`
- Create: `apps/web/src/app/api/cash-register/today/close/route.ts`
- Create: `apps/web/src/app/api/expenses/route.ts`
- Create: `apps/web/src/app/api/expenses/[id]/route.ts`

**Interfaces:**
- Consumes: contracts de Task 1.
- Produces: `fetchDashboard(cookieHeader)`, `fetchCashRegisterToday(cookieHeader)`, `updateOpeningBalance(cents)`, `closeCashRegister(counts)`, `fetchExpenses(filter)`, `createExpense(input)`, `updateExpense(id, input)`, `deleteExpense(id)`; proxies same-origin.

- [ ] **Step 1: Create web finance lib**

Create `apps/web/src/lib/finance.ts` seguindo o padrao de `apps/web/src/lib/sales.ts`:
- `fetchDashboard(cookieHeader)` -> GET `/finance/dashboard` no server API.
- `fetchCashRegisterToday(cookieHeader)` -> GET `/cash-register/today`.
- `fetchFinanceSummary(cookieHeader, startDate?, endDate?)` -> GET `/finance/summary`.
- `updateOpeningBalance(openingBalanceCents)` -> POST `/api/cash-register/today/opening-balance` (client).
- `closeCashRegister(counts)` -> POST `/api/cash-register/today/close` (client).
- `fetchExpenses(options?)` -> GET `/api/expenses` (client) ou server com cookie.
- `createExpense(input)` -> POST `/api/expenses` (client).
- `updateExpense(id, input)` -> PATCH `/api/expenses/:id` (client).
- `deleteExpense(id)` -> DELETE `/api/expenses/:id` (client).
- Valide inputs com `createExpenseInputSchema`/`updateExpenseInputSchema`/`closeCashRegisterInputSchema`/`updateOpeningBalanceInputSchema` antes de enviar.

- [ ] **Step 2: Create proxy routes**

Cada proxy segue o padrao de `apps/web/src/app/api/sales/route.ts`:
- `apps/web/src/app/api/finance/dashboard/route.ts` — GET proxy.
- `apps/web/src/app/api/cash-register/today/route.ts` — GET proxy.
- `apps/web/src/app/api/cash-register/today/opening-balance/route.ts` — POST proxy.
- `apps/web/src/app/api/cash-register/today/close/route.ts` — POST proxy.
- `apps/web/src/app/api/expenses/route.ts` — GET + POST proxy.
- `apps/web/src/app/api/expenses/[id]/route.ts` — PATCH + DELETE proxy (RouteContext com `params: Promise<{ id: string }>`).

- [ ] **Step 3: Typecheck web**

Run: `pnpm --filter shared build && pnpm --filter web typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/finance.ts apps/web/src/app/api/finance/ apps/web/src/app/api/cash-register/ apps/web/src/app/api/expenses/
git commit -m "feat(web): finance lib helpers and proxy routes for dashboard, cash register, expenses"
```

---

### Task 7: Rewrite dashboard with real data

**Files:**
- Rewrite: `apps/web/src/app/(app)/dashboard/page.tsx`
- Modify: `apps/web/src/app/(app)/dashboard/page.test.tsx`

**Interfaces:**
- Consumes: `fetchDashboard(cookieHeader)` de Task 6, `DashboardResponse` de Task 1.
- Produces: dashboard Server Component com dados reais.

- [ ] **Step 1: Write failing dashboard tests**

Atualize `apps/web/src/app/(app)/dashboard/page.test.tsx` para testar o novo `DashboardView` que recebe `data: DashboardResponse` como prop. Teste:
- Renderiza faturamento, qtd vendas, totais por pagamento.
- Renderiza produtos com estoque baixo.
- Renderiza ultimas vendas.
- Mostra atalho "Nova venda".

- [ ] **Step 2: Rewrite dashboard page.tsx**

Transforme o `DashboardView` em um componente que recebe `data: DashboardResponse` e `userRole`. O `DashboardPage` (server) faz `fetchDashboard(cookieHeader)` e passa os dados.

Estrutura:
- `PageHeader` com titulo "Resumo operacional".
- Grid de `MetricCard`: "Faturamento hoje" (formatCentsToBRL), "Vendas hoje" (count), "Estoque baixo" (count, tone warning se > 0).
- Panel "Total por pagamento" com lista compacta de `totalsByPaymentMethod`.
- Panel "Estoque baixo" com lista de `lowStockProducts` ou EmptyState.
- Panel "Ultimas vendas" com lista de `recentSales` ou EmptyState.
- Atalho "Nova venda" (Link para /vendas).

- [ ] **Step 3: Run web tests and typecheck**

Run: `pnpm --filter web test && pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(app)/dashboard/page.tsx apps/web/src/app/(app)/dashboard/page.test.tsx
git commit -m "feat(web): dashboard with real daily data"
```

---

### Task 8: Cash register page `/caixa`

**Files:**
- Create: `apps/web/src/app/(app)/caixa/page.tsx`
- Create: `apps/web/src/app/(app)/caixa/cash-ui.tsx`
- Create: `apps/web/src/app/(app)/caixa/cash-ui.test.tsx`

**Interfaces:**
- Consumes: `fetchCashRegisterToday(cookieHeader)`, `updateOpeningBalance`, `closeCashRegister`, `fetchExpenses` de Task 6.
- Produces: tela de caixa com fundo editavel, resumo por pagamento, fechamento.

- [ ] **Step 1: Write failing cash UI tests**

Teste:
- Renderiza "Caixa de hoje" e "Fundo de caixa".
- Renderiza "Fechar caixa" quando aberto.
- Nao renderiza "Fechar caixa" quando fechado.
- Renderiza totais por forma de pagamento.

- [ ] **Step 2: Create cash page (server) and cash-ui (client)**

`page.tsx`: Server Component que faz `fetchCashRegisterToday(cookieHeader)`. Se nao existe caixa hoje, mostra mensagem "Nenhuma venda registrada hoje. O caixa abre na primeira venda." Se existe, passa para `CashUi`.

`cash-ui.tsx`: Client component com:
- Status (aberto/fechado) em Badge.
- Fundo de caixa: input editavel + botao "Atualizar fundo" (chama `updateOpeningBalance`).
- Resumo por pagamento: tabela com metodo, vendas, despesas, esperado.
- Botao "Fechar caixa": abre formulario com input contado por metodo, mostra esperado vs contado vs diferenca, botao confirmar (chama `closeCashRegister`).
- Apos fechado: modo leitura mostrando counts.

- [ ] **Step 3: Run web tests and typecheck**

Run: `pnpm --filter web test && pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(app)/caixa/
git commit -m "feat(web): cash register page with opening balance and closing flow"
```

---

### Task 9: Expenses page `/financeiro/despesas`

**Files:**
- Create: `apps/web/src/app/(app)/financeiro/despesas/page.tsx`
- Create: `apps/web/src/app/(app)/financeiro/despesas/expenses-ui.tsx`
- Create: `apps/web/src/app/(app)/financeiro/despesas/expenses-ui.test.tsx`

**Interfaces:**
- Consumes: `fetchExpenses`, `createExpense`, `updateExpense`, `deleteExpense` de Task 6.
- Produces: tela de despesas com formulario, lista, editar e excluir.

- [ ] **Step 1: Write failing expenses UI tests**

Teste:
- Renderiza "Despesas" e botao "Nova despesa".
- Renderiza formulario com campos descricao, valor, categoria, pagamento, data.
- Renderiza lista de despesas.
- Renderiza acoes de editar e excluir.

- [ ] **Step 2: Create expenses page (server) and expenses-ui (client)**

`page.tsx`: Server Component que faz `fetchExpenses({ cookieHeader })` e passa para `ExpensesUi`.

`expenses-ui.tsx`: Client component com:
- Formulario inline ou em drawer: descricao, valor (reais -> cents), categoria (select), pagamento (select), data (date input).
- `DataTable` ou lista com colunas: descricao, valor, categoria, pagamento, data, acoes.
- Acoes: editar (abre drawer com formulario pre-preenchido), excluir (confirmacao + `deleteExpense`).
- `useRouter().refresh()` apos acoes.

- [ ] **Step 3: Run web tests and typecheck**

Run: `pnpm --filter web test && pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(app)/financeiro/despesas/
git commit -m "feat(web): expenses page with create, list, edit, delete"
```

---

### Task 10: Finance summary page `/financeiro/resumo` (ADMIN only)

**Files:**
- Create: `apps/web/src/app/(app)/financeiro/resumo/page.tsx`
- Create: `apps/web/src/app/(app)/financeiro/resumo/summary-ui.tsx`
- Create: `apps/web/src/app/(app)/financeiro/resumo/summary-ui.test.tsx`

**Interfaces:**
- Consumes: `fetchFinanceSummary(cookieHeader, startDate, endDate)` de Task 6.
- Produces: tela de resumo financeiro com filtro de periodo, cards de entradas/saidas/saldo, totais por pagamento.

- [ ] **Step 1: Write failing summary UI tests**

Teste:
- Renderiza "Resumo financeiro".
- Renderiza cards "Entradas", "Saidas", "Saldo".
- Renderiza totais por forma de pagamento.

- [ ] **Step 2: Create summary page (server) and summary-ui (client)**

`page.tsx`: Server Component que verifica `user.role === "ADMIN"` (se nao, redirect para /dashboard). Faz `fetchFinanceSummary(cookieHeader, startDate, endDate)` com base em `searchParams`.

`summary-ui.tsx`: Client component com:
- Filtro de periodo: select (Hoje, Semana, Mes) ou inputs de data.
- `MetricCard`: "Entradas" (totalRevenueCents), "Saidas" (totalExpensesCents), "Saldo" (balanceCents, tone success se positivo, danger se negativo).
- Tabela/lista: metodo, entradas, saidas, saldo.

- [ ] **Step 3: Run web tests and typecheck**

Run: `pnpm --filter web test && pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(app)/financeiro/resumo/
git commit -m "feat(web): finance summary page for ADMIN with period filter"
```

---

### Task 11: Navigation + full verification

**Files:**
- Modify: `apps/web/src/components/layout/app-shell.tsx`
- Test: `apps/web/src/components/layout/app-shell.test.ts`

- [ ] **Step 1: Add Caixa to navigation**

Edit `apps/web/src/components/layout/app-shell.tsx`:
```ts
const navigation: readonly NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard", roles: ["ADMIN", "OPERATOR"] },
  { label: "Vendas", href: "/vendas", roles: ["ADMIN", "OPERATOR"] },
  { label: "Caixa", href: "/caixa", roles: ["ADMIN", "OPERATOR"] },
  { label: "Produtos", href: "/produtos", roles: ["ADMIN", "OPERATOR"] },
  { label: "Clientes", href: "/clientes", roles: ["ADMIN", "OPERATOR"] },
  { label: "Estoque", href: "/estoque", roles: ["ADMIN"] },
  { label: "Financeiro", href: "/financeiro/despesas", roles: ["ADMIN", "OPERATOR"] },
  { label: "Usuarios", href: "/usuarios", roles: ["ADMIN"] },
] as const;
```

Nota: "Financeiro" agora aponta para `/financeiro/despesas` e e visivel para `OPERATOR` (para registrar despesas). O resumo `/financeiro/resumo` continua ADMIN only via guard na page.

Atualize `apps/web/src/components/layout/app-shell.test.ts` para incluir "Caixa" nos items esperados e ajustar o href de Financeiro.

- [ ] **Step 2: Run full verification suite**

Run sequencialmente:
```bash
pnpm --filter shared build
pnpm --filter shared test
pnpm --filter web test
pnpm --filter api test
pnpm typecheck
pnpm lint
pnpm build
```
Expected: tudo PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/app-shell.tsx apps/web/src/components/layout/app-shell.test.ts
git commit -m "feat(web): add Caixa and Financeiro to navigation, adjust roles"
```

---

## Self-Review

**Spec coverage:**
- Dashboard com dados reais: Task 7. ✓
- Sessao de caixa diaria, abertura automatica: Tasks 2, 3, 5. ✓
- Tela /caixa com fundo e fechamento: Task 8. ✓
- Tela /financeiro/despesas: Task 9. ✓
- Tela /financeiro/resumo (ADMIN): Task 10. ✓
- Total por forma de pagamento: Tasks 3, 7, 10. ✓
- Permissoes: Tasks 4 (controller), 10 (page guard), 11 (nav). ✓
- Despesas com soft-delete: Tasks 2, 3. ✓
- Categorias fixas: Task 1 (contract), Task 3 (repository). ✓

**Placeholder scan:** Tasks 4 e 8-10 tem passos de implementacao descritos em prosa ao inves de codigo completo porque os componentes sao grandes e os testes definem o contrato comportamental. Isso e aceitavel pelo mesmo padrao do plano anterior de vendas.

**Type consistency:** `CreateExpenseRepositoryInput` (Task 3) corresponde a `createExpenseInputSchema` (Task 1). `CloseCashRegisterRepositoryInput` corresponde a `closeCashRegisterInputSchema`. `CashRegisterRow` usado em service (Task 4) corresponde ao schema (Task 2). `DashboardResponse` usado em Task 7 corresponde ao contract (Task 1). `FinanceSummaryResponse` em Task 10 corresponde ao contract (Task 1).
