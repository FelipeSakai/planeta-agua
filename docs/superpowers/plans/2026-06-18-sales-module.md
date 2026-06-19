# Sales Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MVP sales flow so operators and admins can register sales, automatically update stock, preserve sale history, cancel sales with auditability, and record lightweight customer bottle validity data.

**Architecture:** Keep the core sale transaction in the Nest backend under `apps/api/src/modules/sales`, with the web app talking to it only through same-origin route handlers. Reuse the existing `sales`, `sale_items`, `stock_movements`, `customers`, and `products` tables; extend `sales` with nullable bottle and cancellation audit fields instead of introducing a separate bottle-tracking subsystem.

**Tech Stack:** Next.js App Router, React 19, TypeScript, NestJS 11, Drizzle ORM, PostgreSQL, Zod, Vitest.

## Global Constraints

- Cliente sera opcional na venda.
- Cancelamento podera ser feito por `ADMIN` e `OPERATOR`.
- Formas de pagamento iniciais: `CASH`, `PIX`, `DEBIT_CARD`, `CREDIT_CARD`, `OTHER`.
- O fluxo principal sera de balcao, em tela unica e operacional.
- O controle de galao sera simples: mes, ano e observacao curta.
- O Nest sera responsavel por validar input, sessao, permissao, produtos ativos, estoque suficiente, criar venda e itens, baixar estoque, criar movimentacoes, derivar a entrada financeira e cancelar venda com devolucao de estoque.
- O frontend sera responsavel pelo fluxo operacional da tela, proxies same-origin, mensagens claras para operador, validacao basica de formulario e exibicao de alertas de galao e divergencia.
- Venda finalizada deve ser transacional no backend.
- Venda nao pode finalizar com produto inativo.
- Venda nao pode finalizar sem estoque suficiente.
- `sale_items` deve guardar snapshot de nome e preco do produto no momento da venda.
- Valores financeiros devem permanecer em centavos inteiros.
- Entrada financeira do MVP e derivada da venda concluida.
- Cancelamento muda status para `CANCELED`, devolve estoque e cria movimentacao `CANCELED_SALE`.
- Historico operacional nao pode ser apagado fisicamente.
- Nao adicionar dependencias novas sem necessidade clara.
- Antes de editar codigo de App Router, ler a documentacao relevante em `node_modules/next/dist/docs/` se existir; se nao existir nesta instalacao, registrar isso e seguir os padroes ja existentes no repo.

---

## Scope Decision

This plan includes the minimum customer search/quick-create behavior needed for sales because there is no shipped customer module yet. It does not include a standalone customers CRUD, delivery workflow, fiado, or cash reports UI in this stage.

## File Structure

- `packages/shared/src/sales.ts`: Zod schemas, types, enums, labels, and bottle helper functions for the sales feature.
- `packages/shared/src/sales.test.ts`: schema and bottle-alert helper tests.
- `packages/shared/src/index.ts`: export `sales` contracts.
- `apps/api/src/db/schema.ts`: extend `sales` with cancellation audit and bottle fields.
- `apps/api/src/db/migrations/0002_sales_flow_columns.sql`: add new `sales` columns.
- `apps/api/src/db/migrations/meta/0002_snapshot.json`: Drizzle snapshot for migration 0002.
- `apps/api/src/db/migrations/meta/_journal.json`: register migration 0002.
- `apps/api/src/modules/sales/sales.schemas.ts`: API input schemas built on shared contracts.
- `apps/api/src/modules/sales/sales.types.ts`: repository/service response row shapes if needed.
- `apps/api/src/modules/sales/sales.repository.ts`: transaction-safe DB operations for create/list/detail/cancel sales and quick customer lookup/create.
- `apps/api/src/modules/sales/sales.repository.test.ts`: repository transaction and stock-history tests.
- `apps/api/src/modules/sales/sales.service.ts`: business rules and payload mapping.
- `apps/api/src/modules/sales/sales.service.test.ts`: permission, validation, and alert tests.
- `apps/api/src/modules/sales/sales.controller.ts`: Nest endpoints for sales and quick customer lookup/create.
- `apps/api/src/modules/sales/sales.controller.test.ts`: controller tests.
- `apps/api/src/modules/sales/sales.module.ts`: Nest module wiring.
- `apps/api/src/app.module.ts`: register `SalesModule`.
- `apps/web/src/lib/sales.ts`: web-side payload builders, money helpers, and fetchers.
- `apps/web/src/lib/sales.test.ts`: frontend helper tests.
- `apps/web/src/app/api/sales/route.ts`: proxy `GET /sales`, `POST /sales`.
- `apps/web/src/app/api/sales/[id]/route.ts`: proxy `GET /sales/:id`.
- `apps/web/src/app/api/sales/[id]/cancel/route.ts`: proxy `POST /sales/:id/cancel`.
- `apps/web/src/app/api/sales/customers/route.ts`: proxy `GET /sales/customers`, `POST /sales/customers`.
- `apps/web/src/app/(app)/vendas/page.tsx`: protected sales page.
- `apps/web/src/app/(app)/vendas/sales-ui.tsx`: client sales screen and history.
- `apps/web/src/app/(app)/vendas/sales-ui.test.tsx`: sales UI tests.

---

### Task 1: Shared Sales Contracts

**Files:**
- Create: `packages/shared/src/sales.ts`
- Create: `packages/shared/src/sales.test.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Produces: `paymentMethodValues`, `saleStatusValues`, `createSaleInputSchema`, `cancelSaleInputSchema`, `quickCustomerInputSchema`, `saleHistoryResponseSchema`, `saleDetailResponseSchema`, `customerBottleRecordSchema`, `getBottleAgeInMonths()`, `isBottleExpired()`, `hasBottleMismatch()`.
- Consumes later: API sales schemas, web sales payload helpers, bottle alerts in UI.

- [ ] **Step 1: Write the failing shared tests**

Create `packages/shared/src/sales.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  createSaleInputSchema,
  hasBottleMismatch,
  isBottleExpired,
  quickCustomerInputSchema,
} from "./sales";

describe("sales contracts", () => {
  it("accepts a sale with optional customer and bottle data", () => {
    const parsed = createSaleInputSchema.parse({
      customerId: null,
      paymentMethod: "PIX",
      items: [{ productId: "11111111-1111-4111-8111-111111111111", quantity: 2 }],
      bottle: null,
    });

    expect(parsed.customerId).toBeNull();
    expect(parsed.items).toHaveLength(1);
  });

  it("rejects an empty sale", () => {
    expect(() =>
      createSaleInputSchema.parse({ customerId: null, paymentMethod: "PIX", items: [], bottle: null }),
    ).toThrow();
  });

  it("allows quick customer creation with minimal fields", () => {
    const parsed = quickCustomerInputSchema.parse({ name: "Maria", phone: "11999999999" });

    expect(parsed.name).toBe("Maria");
    expect(parsed.phone).toBe("11999999999");
  });

  it("flags expired bottles after 3 years", () => {
    expect(isBottleExpired({ month: 6, year: 2021 }, new Date("2026-07-01T00:00:00.000Z"))).toBe(true);
    expect(isBottleExpired({ month: 6, year: 2024 }, new Date("2026-07-01T00:00:00.000Z"))).toBe(false);
  });

  it("flags mismatch when bottle month or year changes", () => {
    expect(hasBottleMismatch({ month: 6, year: 2024 }, { month: 7, year: 2024 })).toBe(true);
    expect(hasBottleMismatch({ month: 6, year: 2024 }, { month: 6, year: 2024 })).toBe(false);
    expect(hasBottleMismatch(null, { month: 6, year: 2024 })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the shared test to verify it fails**

Run: `pnpm --filter shared test -- src/sales.test.ts`

Expected: FAIL because `packages/shared/src/sales.ts` does not exist yet.

- [ ] **Step 3: Implement the shared contracts**

Create `packages/shared/src/sales.ts`:

```ts
import { z } from "zod";

export const paymentMethodValues = ["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD", "OTHER"] as const;
export const saleStatusValues = ["COMPLETED", "CANCELED"] as const;

export const saleItemInputSchema = z.object({
  productId: z.uuid(),
  quantity: z.number().int().min(1),
});

export const customerBottleRecordSchema = z
  .object({
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(2100),
    notes: z.string().trim().max(120).nullable().optional(),
  })
  .nullable();

export const createSaleInputSchema = z.object({
  customerId: z.uuid().nullable(),
  paymentMethod: z.enum(paymentMethodValues),
  items: z.array(saleItemInputSchema).min(1),
  bottle: customerBottleRecordSchema,
});

export const cancelSaleInputSchema = z.object({
  reason: z.string().trim().min(3).max(160),
});

export const quickCustomerInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(20).nullable().optional(),
});

export const saleHistoryResponseSchema = z.array(
  z.object({
    id: z.uuid(),
    customerId: z.uuid().nullable(),
    customerName: z.string().nullable(),
    userId: z.uuid(),
    userName: z.string(),
    totalAmountCents: z.number().int(),
    paymentMethod: z.enum(paymentMethodValues),
    status: z.enum(saleStatusValues),
    createdAt: z.string(),
    canceledAt: z.string().nullable(),
    cancellationReason: z.string().nullable(),
  }),
);

export const saleDetailResponseSchema = z.object({
  sale: z.object({
    id: z.uuid(),
    customerId: z.uuid().nullable(),
    customerName: z.string().nullable(),
    userId: z.uuid(),
    userName: z.string(),
    totalAmountCents: z.number().int(),
    paymentMethod: z.enum(paymentMethodValues),
    status: z.enum(saleStatusValues),
    createdAt: z.string(),
    canceledAt: z.string().nullable(),
    cancellationReason: z.string().nullable(),
    bottle: customerBottleRecordSchema,
    previousBottle: customerBottleRecordSchema,
  }),
  items: z.array(
    z.object({
      id: z.uuid(),
      productId: z.uuid(),
      productNameSnapshot: z.string(),
      quantity: z.number().int(),
      unitPriceCents: z.number().int(),
      totalPriceCents: z.number().int(),
    }),
  ),
  bottleAlerts: z.object({
    expired: z.boolean(),
    mismatch: z.boolean(),
  }),
});

export function getBottleAgeInMonths(bottle: { month: number; year: number }, now: Date) {
  return (now.getUTCFullYear() - bottle.year) * 12 + (now.getUTCMonth() + 1 - bottle.month);
}

export function isBottleExpired(bottle: { month: number; year: number } | null, now: Date) {
  if (!bottle) return false;
  return getBottleAgeInMonths(bottle, now) > 36;
}

export function hasBottleMismatch(previousBottle: { month: number; year: number } | null, currentBottle: { month: number; year: number } | null) {
  if (!previousBottle || !currentBottle) return false;
  return previousBottle.month !== currentBottle.month || previousBottle.year !== currentBottle.year;
}
```

- [ ] **Step 4: Export the new contracts**

Modify `packages/shared/src/index.ts`:

```ts
export * from "./auth";
export * from "./products";
export * from "./sales";
export * from "./stock";
```

- [ ] **Step 5: Run the shared test to verify it passes**

Run: `pnpm --filter shared test -- src/sales.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/sales.ts packages/shared/src/sales.test.ts packages/shared/src/index.ts
git commit -m "feat: add sales shared contracts"
```

---

### Task 2: API Sales Persistence And Migration

**Files:**
- Modify: `apps/api/src/db/schema.ts`
- Create: `apps/api/src/db/migrations/0002_sales_flow_columns.sql`
- Create: `apps/api/src/db/migrations/meta/0002_snapshot.json`
- Modify: `apps/api/src/db/migrations/meta/_journal.json`
- Create: `apps/api/src/modules/sales/sales.repository.ts`
- Create: `apps/api/src/modules/sales/sales.repository.test.ts`
- Create: `apps/api/src/modules/sales/sales.types.ts`

**Interfaces:**
- Consumes: `createSaleInputSchema` shared shape, `paymentMethodValues`, `saleStatusValues`.
- Produces: `SalesRepository.createSale(txInput)`, `SalesRepository.listSales()`, `SalesRepository.getSaleDetail(id)`, `SalesRepository.cancelSale(id, reason, userId)`, `SalesRepository.searchCustomers(query)`, `SalesRepository.createQuickCustomer(input)`, `SalesRepository.getLatestBottleForCustomer(customerId)`.

- [ ] **Step 1: Write the failing repository tests**

Create `apps/api/src/modules/sales/sales.repository.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "../../db";
import { customers, products, sales, stockMovements, users } from "../../db/schema";
import { SalesRepository } from "./sales.repository";

describe("SalesRepository", () => {
  const repository = new SalesRepository();

  beforeEach(async () => {
    await db.delete(stockMovements);
    await db.delete(sales);
    await db.delete(products);
    await db.delete(customers);
    await db.delete(users);
  });

  it("creates a completed sale, item snapshots, and stock movements in one transaction", async () => {
    // seed user/product/customer, call repository.createSale(), assert created sale/items/movement/stock decrement
  });

  it("stores bottle month, year, and notes on the sale", async () => {
    // create sale with bottle payload and assert fields persisted on sales row
  });

  it("returns latest bottle by customer from the most recent completed sale", async () => {
    // create 2 sales, assert latest bottle record returned
  });

  it("cancels a sale by setting canceled fields and returning stock", async () => {
    // create sale, cancel, assert status/canceledAt/cancellationReason and stock restoration movement
  });
});
```

- [ ] **Step 2: Run repository test to verify failure**

Run: `pnpm --filter api test -- src/modules/sales/sales.repository.test.ts`

Expected: FAIL because the `sales` repository files and new columns do not exist.

- [ ] **Step 3: Extend the `sales` table in schema**

Modify `apps/api/src/db/schema.ts` by adding fields to `sales`:

```ts
  bottleMonth: integer("bottle_month"),
  bottleYear: integer("bottle_year"),
  bottleNotes: text("bottle_notes"),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  canceledByUserId: uuid("canceled_by_user_id").references(() => users.id),
  cancellationReason: text("cancellation_reason"),
```

Also extend `salesRelations`:

```ts
  canceledByUser: one(users, {
    fields: [sales.canceledByUserId],
    references: [users.id],
  }),
```

- [ ] **Step 4: Add the migration files**

Create `apps/api/src/db/migrations/0002_sales_flow_columns.sql`:

```sql
ALTER TABLE "sales"
  ADD COLUMN "bottle_month" integer,
  ADD COLUMN "bottle_year" integer,
  ADD COLUMN "bottle_notes" text,
  ADD COLUMN "canceled_at" timestamp with time zone,
  ADD COLUMN "canceled_by_user_id" uuid,
  ADD COLUMN "cancellation_reason" text;

ALTER TABLE "sales"
  ADD CONSTRAINT "sales_canceled_by_user_id_users_id_fk"
  FOREIGN KEY ("canceled_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
```

Then run `pnpm --filter api db:generate` once and keep the generated `apps/api/src/db/migrations/meta/0002_snapshot.json` plus `_journal.json` update in the commit. If the generated SQL differs from the hand-written file above, keep the generated SQL as source of truth and update the repo to exactly those generated files.

- [ ] **Step 5: Implement the repository**

Create `apps/api/src/modules/sales/sales.types.ts`:

```ts
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { customers, saleItems, sales } from "../../db/schema";

export type SaleRow = InferSelectModel<typeof sales>;
export type SaleItemRow = InferSelectModel<typeof saleItems>;
export type CustomerRow = InferSelectModel<typeof customers>;
export type CreateSaleRepositoryInput = {
  customerId: string | null;
  userId: string;
  paymentMethod: SaleRow["paymentMethod"];
  items: Array<{ productId: string; quantity: number }>;
  bottle: { month: number; year: number; notes?: string | null } | null;
};
```

Create `apps/api/src/modules/sales/sales.repository.ts` with these methods:

```ts
export class SalesRepository {
  async searchCustomers(query: string) { /* select top 10 from customers by ilike(name, `%query%`) */ }
  async createQuickCustomer(input: { name: string; phone?: string | null }) { /* insert customer */ }
  async getLatestBottleForCustomer(customerId: string) { /* latest completed sale with bottle fields not null */ }
  async createSale(input: CreateSaleRepositoryInput) { /* tx: lock products, insert sale, insert items snapshots, decrement stock, insert SALE movements */ }
  async listSales() { /* join user/customers, order by created_at desc */ }
  async getSaleDetail(id: string) { /* sale + items + previous bottle */ }
  async cancelSale(input: { saleId: string; userId: string; reason: string }) { /* tx: set canceled fields, restore stock, insert CANCELED_SALE movements */ }
}
```

Use `db.transaction(async (tx) => ...)` and `for (const item of input.items)` to create item snapshots and stock movements. The repository must calculate `totalAmountCents` from live product prices inside the transaction.

- [ ] **Step 6: Run repository tests to verify pass**

Run: `pnpm --filter api test -- src/modules/sales/sales.repository.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/db/schema.ts apps/api/src/db/migrations apps/api/src/modules/sales/sales.repository.ts apps/api/src/modules/sales/sales.repository.test.ts apps/api/src/modules/sales/sales.types.ts
git commit -m "feat: add sales repository"
```

---

### Task 3: API Sales Service, Schemas, Controller, And Module

**Files:**
- Create: `apps/api/src/modules/sales/sales.schemas.ts`
- Create: `apps/api/src/modules/sales/sales.service.ts`
- Create: `apps/api/src/modules/sales/sales.service.test.ts`
- Create: `apps/api/src/modules/sales/sales.controller.ts`
- Create: `apps/api/src/modules/sales/sales.controller.test.ts`
- Create: `apps/api/src/modules/sales/sales.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: `SalesRepository`, shared contracts from Task 1, `CurrentUser`, `requireRole`-style permission checks already used in current modules.
- Produces: Nest endpoints `GET /sales`, `GET /sales/:id`, `POST /sales`, `POST /sales/:id/cancel`, `GET /sales/customers`, `POST /sales/customers`.

- [ ] **Step 1: Write the failing service tests**

Create `apps/api/src/modules/sales/sales.service.test.ts`:

```ts
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { SalesService } from "./sales.service";

describe("SalesService", () => {
  it("rejects a sale when repository reports inactive product or insufficient stock", async () => {
    // mock repository.createSale to throw domain errors and assert service maps them to BadRequestException
  });

  it("returns bottle alerts based on previous customer bottle history", async () => {
    // mock repository.getLatestBottleForCustomer and assert mismatch/expired flags
  });

  it("requires a cancellation reason and rejects double cancellation", async () => {
    // mock repository.getSaleDetail and cancelSale behavior
  });
});
```

- [ ] **Step 2: Run service test to verify failure**

Run: `pnpm --filter api test -- src/modules/sales/sales.service.test.ts`

Expected: FAIL because the service files do not exist.

- [ ] **Step 3: Implement service and schemas**

Create `apps/api/src/modules/sales/sales.schemas.ts`:

```ts
import { createSaleInputSchema, cancelSaleInputSchema, quickCustomerInputSchema } from "shared";

export { createSaleInputSchema, cancelSaleInputSchema, quickCustomerInputSchema };
```

Create `apps/api/src/modules/sales/sales.service.ts`:

```ts
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { hasBottleMismatch, isBottleExpired, type SessionUser } from "shared";

import { SalesRepository } from "./sales.repository";

@Injectable()
export class SalesService {
  constructor(private readonly repository: SalesRepository) {}

  async listSales() {
    return this.repository.listSales();
  }

  async getSaleDetail(id: string) {
    const detail = await this.repository.getSaleDetail(id);
    if (!detail) throw new NotFoundException("Venda nao encontrada.");

    return {
      ...detail,
      bottleAlerts: {
        expired: isBottleExpired(detail.sale.bottle, new Date()),
        mismatch: hasBottleMismatch(detail.sale.previousBottle, detail.sale.bottle),
      },
    };
  }

  async createSale(user: SessionUser, input: Parameters<SalesRepository["createSale"]>[0]) {
    try {
      return await this.repository.createSale({ ...input, userId: user.id });
    } catch (error) {
      throw new BadRequestException("Nao foi possivel finalizar a venda.");
    }
  }

  async cancelSale(user: SessionUser, saleId: string, reason: string) {
    try {
      return await this.repository.cancelSale({ saleId, userId: user.id, reason });
    } catch {
      throw new BadRequestException("Nao foi possivel cancelar a venda.");
    }
  }

  async searchCustomers(query: string) {
    return this.repository.searchCustomers(query);
  }

  async createQuickCustomer(input: { name: string; phone?: string | null }) {
    return this.repository.createQuickCustomer(input);
  }
}
```

Map repository domain errors to concrete messages if you add custom error codes in the repository.

- [ ] **Step 4: Implement controller and module**

Create `apps/api/src/modules/sales/sales.controller.ts` with handlers:

```ts
@Controller("sales")
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  async list(@Req() request: Request) { /* currentUser, then service.listSales() */ }

  @Get(":id")
  async detail(@Param("id") id: string) { /* service.getSaleDetail(id) */ }

  @Post()
  async create(@Req() request: Request, @Body() body: unknown) { /* parse createSaleInputSchema, currentUser, service.createSale */ }

  @Post(":id/cancel")
  async cancel(@Param("id") id: string, @Req() request: Request, @Body() body: unknown) { /* parse cancelSaleInputSchema, currentUser, service.cancelSale */ }

  @Get("customers")
  async searchCustomers(@Query("query") query = "") { /* service.searchCustomers(query) */ }

  @Post("customers")
  async createCustomer(@Body() body: unknown) { /* parse quickCustomerInputSchema, service.createQuickCustomer */ }
}
```

Create `apps/api/src/modules/sales/sales.module.ts`:

```ts
import { Module } from "@nestjs/common";

import { SalesController } from "./sales.controller";
import { SalesRepository } from "./sales.repository";
import { SalesService } from "./sales.service";

@Module({
  controllers: [SalesController],
  providers: [SalesRepository, SalesService],
})
export class SalesModule {}
```

Modify `apps/api/src/app.module.ts` to import `SalesModule`.

- [ ] **Step 5: Write and run controller tests**

Create `apps/api/src/modules/sales/sales.controller.test.ts` to cover happy path create, cancel, quick customer, and session failure. Then run:

Run: `pnpm --filter api test -- src/modules/sales/sales.service.test.ts src/modules/sales/sales.controller.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/sales apps/api/src/app.module.ts
git commit -m "feat: expose sales api"
```

---

### Task 4: Web Sales Helpers And API Proxies

**Files:**
- Create: `apps/web/src/lib/sales.ts`
- Create: `apps/web/src/lib/sales.test.ts`
- Create: `apps/web/src/app/api/sales/route.ts`
- Create: `apps/web/src/app/api/sales/[id]/route.ts`
- Create: `apps/web/src/app/api/sales/[id]/cancel/route.ts`
- Create: `apps/web/src/app/api/sales/customers/route.ts`

**Interfaces:**
- Consumes: shared sales schemas and existing `getServerApiUrl()` pattern.
- Produces: `saleFormToPayload(formState)`, `cancelSalePayload(reason)`, `fetchSalesHistory()`, `searchSaleCustomers(query)`, `createSaleCustomer(input)`.

- [ ] **Step 1: Write the failing web helper tests**

Create `apps/web/src/lib/sales.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { buildBottleAlerts, saleFormToPayload } from "./sales";

describe("sales web helpers", () => {
  it("builds the sale payload with optional customer and bottle", () => {
    expect(
      saleFormToPayload({
        customerId: null,
        paymentMethod: "PIX",
        items: [{ productId: "11111111-1111-4111-8111-111111111111", quantity: 2 }],
        bottleMonth: "6",
        bottleYear: "2024",
        bottleNotes: "azul",
      }),
    ).toEqual({
      customerId: null,
      paymentMethod: "PIX",
      items: [{ productId: "11111111-1111-4111-8111-111111111111", quantity: 2 }],
      bottle: { month: 6, year: 2024, notes: "azul" },
    });
  });

  it("omits bottle data when month/year are blank", () => {
    expect(
      saleFormToPayload({ customerId: null, paymentMethod: "CASH", items: [{ productId: "11111111-1111-4111-8111-111111111111", quantity: 1 }], bottleMonth: "", bottleYear: "", bottleNotes: "" }),
    ).toMatchObject({ bottle: null });
  });

  it("builds expired and mismatch alert labels", () => {
    expect(buildBottleAlerts({ expired: true, mismatch: true })).toEqual([
      "Galão acima da validade de 3 anos.",
      "Galão informado difere do último registro do cliente.",
    ]);
  });
});
```

- [ ] **Step 2: Run helper test to verify failure**

Run: `pnpm --filter web test -- src/lib/sales.test.ts`

Expected: FAIL because the helper file does not exist.

- [ ] **Step 3: Implement `apps/web/src/lib/sales.ts`**

Create `apps/web/src/lib/sales.ts`:

```ts
import { createSaleInputSchema, quickCustomerInputSchema, saleDetailResponseSchema, saleHistoryResponseSchema } from "shared";

export function saleFormToPayload(input: {
  customerId: string | null;
  paymentMethod: "CASH" | "PIX" | "CREDIT_CARD" | "DEBIT_CARD" | "OTHER";
  items: Array<{ productId: string; quantity: number }>;
  bottleMonth: string;
  bottleYear: string;
  bottleNotes: string;
}) {
  const bottle = input.bottleMonth && input.bottleYear
    ? { month: Number(input.bottleMonth), year: Number(input.bottleYear), notes: input.bottleNotes.trim() || null }
    : null;

  return createSaleInputSchema.parse({
    customerId: input.customerId,
    paymentMethod: input.paymentMethod,
    items: input.items,
    bottle,
  });
}

export function buildBottleAlerts(alerts: { expired: boolean; mismatch: boolean }) {
  const messages: string[] = [];
  if (alerts.expired) messages.push("Galão acima da validade de 3 anos.");
  if (alerts.mismatch) messages.push("Galão informado difere do último registro do cliente.");
  return messages;
}
```

Also add `fetchSalesHistory()`, `fetchSaleDetail(id)`, `searchSaleCustomers(query)`, and `createSaleCustomer(input)` wrappers that parse JSON with the shared response schemas.

- [ ] **Step 4: Implement API route proxies**

Create route handlers mirroring the products/stock proxy pattern:

- `apps/web/src/app/api/sales/route.ts`: `GET` and `POST`
- `apps/web/src/app/api/sales/[id]/route.ts`: `GET`
- `apps/web/src/app/api/sales/[id]/cancel/route.ts`: `POST`
- `apps/web/src/app/api/sales/customers/route.ts`: `GET` and `POST`

Each proxy should forward cookies:

```ts
headers: { cookie: request.headers.get("cookie") ?? "" }
```

and for POST/PATCH-like requests pass JSON body through unchanged.

- [ ] **Step 5: Run helper tests**

Run: `pnpm --filter web test -- src/lib/sales.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/sales.ts apps/web/src/lib/sales.test.ts apps/web/src/app/api/sales
git commit -m "feat: add sales web helpers"
```

---

### Task 5: Sales UI And History

**Files:**
- Create: `apps/web/src/app/(app)/vendas/page.tsx`
- Create: `apps/web/src/app/(app)/vendas/sales-ui.tsx`
- Create: `apps/web/src/app/(app)/vendas/sales-ui.test.tsx`

**Interfaces:**
- Consumes: `fetchSalesHistory`, `searchSaleCustomers`, `createSaleCustomer`, shared payment methods, current reusable UI components, `Drawer` for quick customer create.
- Produces: `/vendas` operational screen with sale entry, history, bottle alerts, and cancel action.

- [ ] **Step 1: Write the failing UI tests**

Create `apps/web/src/app/(app)/vendas/sales-ui.test.tsx`:

```tsx
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { SalesUi } from "./sales-ui";

vi.mock("next/navigation", () => ({ useRouter: vi.fn(() => ({ refresh: vi.fn() })) }));

describe("SalesUi", () => {
  it("allows a sale without customer", () => {
    const html = renderToStaticMarkup(createElement(SalesUi, { userRole: "OPERATOR", history: [], products: [], customers: [] }));
    expect(html).toContain("Cliente opcional");
    expect(html).toContain("Finalizar venda");
  });

  it("shows bottle alerts when current bottle is expired or differs from last record", () => {
    const html = renderToStaticMarkup(
      createElement(SalesUi, {
        userRole: "ADMIN",
        history: [],
        products: [],
        customers: [{ id: "c1", name: "Maria", previousBottle: { month: 6, year: 2022, notes: "azul" } }],
      }),
    );
    expect(html).toContain("Galão acima da validade de 3 anos.");
    expect(html).toContain("Galão informado difere do último registro do cliente.");
  });

  it("shows cancel action in history for operators and admins", () => {
    const html = renderToStaticMarkup(createElement(SalesUi, { userRole: "OPERATOR", history: [{ id: "s1", status: "COMPLETED", customerName: null, userName: "Operador", totalAmountCents: 1000, paymentMethod: "PIX", createdAt: "2026-06-18T00:00:00.000Z", canceledAt: null, cancellationReason: null }], products: [], customers: [] }));
    expect(html).toContain("Cancelar venda");
  });
});
```

- [ ] **Step 2: Run UI test to verify failure**

Run: `pnpm --filter web test -- src/app/\(app\)/vendas/sales-ui.test.tsx`

Expected: FAIL because the sales page files do not exist.

- [ ] **Step 3: Implement the sales page**

Create `apps/web/src/app/(app)/vendas/page.tsx`:

```tsx
import { requireUser } from "@/lib/auth";
import { fetchProducts } from "@/lib/products";
import { fetchSalesHistory } from "@/lib/sales";

import { SalesUi } from "./sales-ui";

export default async function SalesPage() {
  const user = await requireUser();
  const products = await fetchProducts();
  const history = await fetchSalesHistory();

  return <SalesUi userRole={user.role} history={history} products={products.filter((product) => product.isActive)} customers={[]} />;
}
```

Implement `apps/web/src/app/(app)/vendas/sales-ui.tsx` with these sections:

- `PageHeader` for `Vendas`.
- customer block with optional selection and `Drawer` for quick create.
- product search input and add-to-cart action using a local `cartItems` state.
- cart table/list with inline quantity and remove.
- payment method selector.
- optional bottle fields shown only when a customer is selected.
- derived bottle alerts using `buildBottleAlerts()`.
- `Finalizar venda` button that calls `/api/sales`.
- history panel/table with `Cancelar venda` action that prompts for reason and calls `/api/sales/:id/cancel`.

Use exact operator-facing copy:

```tsx
"Cliente opcional"
"Cadastrar cliente rápido"
"Buscar produto"
"Forma de pagamento"
"Finalizar venda"
"Cancelar venda"
```

Keep the cart local and lightweight; no optimistic stock mutation on the client.

- [ ] **Step 4: Run sales UI tests**

Run: `pnpm --filter web test -- src/app/\(app\)/vendas/sales-ui.test.tsx src/lib/sales.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(app)/vendas apps/web/src/lib/sales.ts apps/web/src/lib/sales.test.ts
git commit -m "feat: add sales page"
```

---

### Task 6: Full Verification

**Files:**
- Modify only if needed after verification.

**Interfaces:**
- Consumes all prior tasks.
- Produces a verified MVP sales module ready for manual testing.

- [ ] **Step 1: Run focused sales tests**

Run: `pnpm --filter shared test -- src/sales.test.ts`

Expected: PASS.

Run: `pnpm --filter api test -- src/modules/sales/sales.repository.test.ts src/modules/sales/sales.service.test.ts src/modules/sales/sales.controller.test.ts`

Expected: PASS.

Run: `pnpm --filter web test -- src/lib/sales.test.ts src/app/\(app\)/vendas/sales-ui.test.tsx`

Expected: PASS.

- [ ] **Step 2: Run workspace verification**

Run: `pnpm test`

Expected: PASS.

Run: `pnpm typecheck --force`

Expected: PASS.

Run: `pnpm lint --force`

Expected: PASS.

Run: `pnpm build --force`

Expected: PASS.

- [ ] **Step 3: Prepare manual smoke test checklist**

Run these local commands before manual testing:

```bash
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Manual checklist:

- login as admin and operator;
- register sale without customer;
- register sale with customer quick-create;
- add bottle month/year/notes and confirm alert logic;
- reject insufficient stock;
- confirm completed sale appears in history;
- cancel sale with reason and verify stock returns;
- verify dashboard and future finance can read the sale history afterward.

- [ ] **Step 4: Commit only if verification required code fixes**

If any code change was required after verification:

```bash
git add <fixed-files>
git commit -m "fix: stabilize sales module"
```

If verification passes with no code changes, do not create an empty commit.
