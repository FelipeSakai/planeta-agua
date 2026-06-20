# Redesign da Tela de Vendas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar `/vendas` com checkout lateral, busca de cliente/produto melhorada, edição de preço/desconto por item, status `PENDING_DELIVERY`, e separar o histórico em `/vendas/historico`.

**Architecture:** Alterações descem do shared (contratos zod) → schema/migration Drizzle → repository/service/controller Nest → helpers web → proxy routes → UI. Cada camada valida com testes antes de subir. O carrinho vira sidebar fixa; o histórico sai de `/vendas` para uma página própria com tabs/filtros.

**Tech Stack:** Next.js App Router, NestJS, Drizzle ORM, PostgreSQL, Zod, Vitest, Tailwind CSS.

## Global Constraints

- Dinheiro em centavos inteiros, nunca `number` decimal/float para persistir.
- Validação no servidor para estoque, preços e descontos.
- Snapshot de nome/preço do produto no momento da venda.
- Movimentação de estoque imutável; cancelamento devolve estoque.
- Não deletar vendas, itens ou movimentações com histórico operacional.
- `OPERATOR` e `ADMIN` podem cancelar e editar preço; qualquer perfil autenticado confirma entrega.
- Reutilizar componentes UI existentes (`Panel`, `Button`, `TextInput`, `SelectInput`, `Field`, `Badge`, `Alert`, `DataTable`, `Drawer`, `EmptyState`).
- Após alterar `packages/shared`, rodar `pnpm --filter shared build` para consumers verem novos exports.
- Testes de repository da API exigem Postgres vivo e migrado (`docker compose up -d && pnpm db:migrate`).
- Rodar verificações sequenciais: `pnpm --filter shared test` → `pnpm --filter web test` → `pnpm --filter api test` → `pnpm typecheck` → `pnpm lint` → `pnpm build`.
- Não commitar `next-env.d.ts` ou `packages/shared/dist`.
- Idioma: mensagens em português sem acentos ASCII nos testes (o código atual usa sem acentos).

---

## File Structure

**Shared:**
- Modify: `packages/shared/src/sales.ts` — adiciona `PENDING_DELIVERY`, `code` em customer, `discountCents`/`finalUnitPriceCents` em item, schema de entrega, schema de filtro de histórico.

**API:**
- Modify: `apps/api/src/db/schema.ts` — `code` em customers, `PENDING_DELIVERY` no enum, `discountCents`/`finalUnitPriceCents` em saleItems, `deliveredAt`/`deliveredByUserId` em sales.
- Create: `apps/api/src/db/migrations/0003_sales_redesign.sql` — migration.
- Modify: `apps/api/src/modules/sales/sales.types.ts` — inputs do repository.
- Modify: `apps/api/src/modules/sales/sales.errors.ts` — novos códigos.
- Modify: `apps/api/src/modules/sales/sales.repository.ts` — busca por code/address, create com desconto/preço/entrega, confirmDelivery, listSales com filtro.
- Modify: `apps/api/src/modules/sales/sales.service.ts` — confirmDelivery, busca estendida.
- Modify: `apps/api/src/modules/sales/sales.controller.ts` — endpoint `POST /sales/:id/deliver`, `GET /sales?status=`.
- Tests: `sales.repository.test.ts`, `sales.service.test.ts`, `sales.controller.test.ts`.

**Web:**
- Modify: `apps/web/src/lib/sales.ts` — payload com desconto/preço/entrega, fetcher de deliver, filtro de histórico.
- Create: `apps/web/src/app/api/sales/[id]/deliver/route.ts` — proxy.
- Rewrite: `apps/web/src/app/(app)/vendas/sales-ui.tsx` — novo layout.
- Modify: `apps/web/src/app/(app)/vendas/page.tsx` — remove fetch de histórico.
- Rewrite: `apps/web/src/app/(app)/vendas/sales-ui.test.tsx` — atualiza testes.
- Create: `apps/web/src/app/(app)/vendas/historico/page.tsx` — página de histórico.
- Create: `apps/web/src/app/(app)/vendas/historico/history-ui.tsx` — UI com filtros.
- Create: `apps/web/src/app/(app)/vendas/historico/history-ui.test.tsx` — testes.

---

### Task 1: Shared contracts (zod schemas + tipos)

**Files:**
- Modify: `packages/shared/src/sales.ts`
- Test: `packages/shared/src/sales.test.ts` (criar se não existir; atualmente shared usa `vitest run --passWithNoTests`)

**Interfaces:**
- Produces: `saleStatusValues` agora inclui `"PENDING_DELIVERY"`; `createSaleInputSchema` aceita `items[].finalUnitPriceCents` e `items[].discountCents` opcionais e `deliveryPending: boolean`; `quickCustomerInputSchema` aceita `code`/`address` opcionais; `saleCustomerResponseSchema` inclui `code`/`address`; `confirmDeliveryInputSchema` (vazio/confirm); `saleHistoryFilterSchema` (`status` opcional enum); `saleDetailItemSchema` inclui `discountCents`/`finalUnitPriceCents`.

- [ ] **Step 1: Write failing tests for shared contracts**

Create `packages/shared/src/sales.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  confirmDeliveryInputSchema,
  createSaleInputSchema,
  quickCustomerInputSchema,
  saleCustomerResponseSchema,
  saleHistoryFilterSchema,
  saleStatusValues,
} from "./sales";

describe("shared sales contracts", () => {
  it("includes PENDING_DELIVERY in sale status values", () => {
    expect(saleStatusValues).toContain("PENDING_DELIVERY");
  });

  it("accepts a sale item with optional finalUnitPriceCents and discountCents", () => {
    const parsed = createSaleInputSchema.parse({
      customerId: null,
      paymentMethod: "PIX",
      items: [{ productId: "33333333-3333-4333-8333-333333333333", quantity: 2, finalUnitPriceCents: 1300, discountCents: 100 }],
      bottle: null,
      deliveryPending: false,
    });

    expect(parsed.items[0].finalUnitPriceCents).toBe(1300);
    expect(parsed.items[0].discountCents).toBe(100);
  });

  it("accepts a sale with deliveryPending true", () => {
    const parsed = createSaleInputSchema.parse({
      customerId: null,
      paymentMethod: "CASH",
      items: [{ productId: "33333333-3333-4333-8333-333333333333", quantity: 1 }],
      bottle: null,
      deliveryPending: true,
    });

    expect(parsed.deliveryPending).toBe(true);
  });

  it("accepts quick customer with code and address", () => {
    const parsed = quickCustomerInputSchema.parse({ name: "Maria", code: "C001", address: "Rua A, 10" });

    expect(parsed.code).toBe("C001");
    expect(parsed.address).toBe("Rua A, 10");
  });

  it("sale customer response includes code and address", () => {
    const parsed = saleCustomerResponseSchema.parse({
      id: "99999999-9999-4999-8999-999999999999",
      name: "Maria",
      phone: "11999999999",
      code: "C001",
      address: "Rua A, 10",
      previousBottle: null,
    });

    expect(parsed.code).toBe("C001");
    expect(parsed.address).toBe("Rua A, 10");
  });

  it("confirm delivery input accepts empty object", () => {
    expect(confirmDeliveryInputSchema.parse({})).toEqual({});
  });

  it("sale history filter accepts a status enum value", () => {
    expect(saleHistoryFilterSchema.parse({ status: "PENDING_DELIVERY" })).toEqual({ status: "PENDING_DELIVERY" });
  });

  it("sale history filter rejects unknown status", () => {
    expect(saleHistoryFilterSchema.safeParse({ status: "WEIRD" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter shared test`
Expected: FAIL — exports não existem.

- [ ] **Step 3: Update shared contracts**

Edit `packages/shared/src/sales.ts`. Replace the status values line and add new schemas. Make these changes:

1. Replace `export const saleStatusValues = ["COMPLETED", "CANCELED"] as const;` with:
```ts
export const saleStatusValues = ["COMPLETED", "CANCELED", "PENDING_DELIVERY"] as const;
export const saleHistoryStatusFilterValues = ["COMPLETED", "CANCELED", "PENDING_DELIVERY"] as const;
```

2. Replace the `saleItemInputSchema` definition with:
```ts
const saleItemInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: positiveQuantitySchema,
  finalUnitPriceCents: nonNegativeAmountCentsSchema.optional(),
  discountCents: nonNegativeAmountCentsSchema.optional(),
});
```

3. Replace `createSaleInputSchema` with:
```ts
export const createSaleInputSchema = z.object({
  customerId: z.string().uuid().nullable(),
  paymentMethod: z.enum(paymentMethodValues),
  items: z.array(saleItemInputSchema).min(1),
  bottle: customerBottleRecordSchema,
  deliveryPending: z.boolean().default(false),
});
```

4. Replace `quickCustomerInputSchema` with:
```ts
export const quickCustomerInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(20).nullable().optional(),
  code: z.string().trim().max(40).nullable().optional(),
  address: z.string().trim().max(200).nullable().optional(),
});
```

5. Replace `saleCustomerResponseSchema` with:
```ts
export const saleCustomerResponseSchema = quickCustomerInputSchema.extend({
  id: z.string().uuid(),
  phone: z.string().trim().min(8).max(20).nullable(),
  code: z.string().trim().max(40).nullable(),
  address: z.string().trim().max(200).nullable(),
  previousBottle: customerBottleRecordSchema,
});
```

6. Update `validateCancellationState`: add a guard so `PENDING_DELIVERY` also forbids cancellation data:
```ts
function validateCancellationState(
  value: { status: (typeof saleStatusValues)[number]; canceledAt: string | null; cancellationReason: string | null },
  ctx: z.core.$RefinementCtx,
) {
  const canHaveCancellation = value.status === "CANCELED";

  if (!canHaveCancellation && (value.canceledAt !== null || value.cancellationReason !== null)) {
    ctx.addIssue({
      code: "custom",
      message: "Only canceled sales can include cancellation data.",
      path: ["status"],
    });
  }

  if (canHaveCancellation && (value.canceledAt === null || value.cancellationReason === null)) {
    ctx.addIssue({
      code: "custom",
      message: "Canceled sales must include cancellation data.",
      path: ["status"],
    });
  }
}
```

7. Add `deliveredAt`/`deliveredByUserId` to the sale history entry schema and detail schema objects (nullable). In `saleHistoryEntrySchema` add after `cancellationReason`:
```ts
  deliveredAt: isoDatetimeStringSchema.nullable(),
  deliveredByUserId: z.string().uuid().nullable(),
```

8. Update `saleDetailItemSchema` to include discount/price:
```ts
const saleDetailItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  productNameSnapshot: z.string(),
  quantity: positiveQuantitySchema,
  unitPriceCents: nonNegativeAmountCentsSchema,
  totalPriceCents: nonNegativeAmountCentsSchema,
  discountCents: nonNegativeAmountCentsSchema.nullable(),
  finalUnitPriceCents: nonNegativeAmountCentsSchema.nullable(),
});
```

9. Add new schemas at the end (before the type exports section):
```ts
export const confirmDeliveryInputSchema = z.object({}).default({});

export const saleHistoryFilterSchema = z.object({
  status: z.enum(saleHistoryStatusFilterValues).optional(),
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter shared test`
Expected: PASS (all new tests green).

- [ ] **Step 5: Build shared and commit**

Run: `pnpm --filter shared build`
```bash
git add packages/shared/src/sales.ts packages/shared/src/sales.test.ts
git commit -m "feat(shared): add PENDING_DELIVERY, customer code, item discount/price, delivery contracts"
```

---

### Task 2: DB schema + migration

**Files:**
- Modify: `apps/api/src/db/schema.ts`
- Create: `apps/api/src/db/migrations/0003_sales_redesign.sql`

**Interfaces:**
- Consumes: `saleStatusValues` from Task 1.
- Produces: `customers.code`, `sales` enum com `PENDING_DELIVERY`, `saleItems.discountCents`, `saleItems.finalUnitPriceCents`, `sales.deliveredAt`, `sales.deliveredByUserId`.

- [ ] **Step 1: Update schema.ts**

Edit `apps/api/src/db/schema.ts`:

1. Replace the `saleStatusEnum` line:
```ts
export const saleStatusEnum = pgEnum("sale_status", ["COMPLETED", "CANCELED", "PENDING_DELIVERY"]);
```

2. Add `code` to `customers` (after `name`):
```ts
export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  ...timestamps,
});
```

3. Add `deliveredAt`/`deliveredByUserId` to `sales` (after `cancellationReason`):
```ts
  canceledByUserId: uuid("canceled_by_user_id").references(() => users.id),
  cancellationReason: text("cancellation_reason"),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  deliveredByUserId: uuid("delivered_by_user_id").references(() => users.id),
  ...timestamps,
```

4. Add `discountCents`/`finalUnitPriceCents` to `saleItems`:
```ts
export const saleItems = pgTable("sale_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  saleId: uuid("sale_id").notNull().references(() => sales.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  productNameSnapshot: text("product_name_snapshot").notNull(),
  quantity: integer("quantity").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  totalPriceCents: integer("total_price_cents").notNull(),
  discountCents: integer("discount_cents"),
  finalUnitPriceCents: integer("final_unit_price_cents"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

5. Add `deliveredByUser` relation in `salesRelations`:
```ts
export const salesRelations = relations(sales, ({ one, many }) => ({
  customer: one(customers, { fields: [sales.customerId], references: [customers.id] }),
  user: one(users, { fields: [sales.userId], references: [users.id], relationName: "saleCreatedByUser" }),
  canceledByUser: one(users, { fields: [sales.canceledByUserId], references: [users.id], relationName: "saleCanceledByUser" }),
  deliveredByUser: one(users, { fields: [sales.deliveredByUserId], references: [users.id], relationName: "saleDeliveredByUser" }),
  items: many(saleItems),
}));
```

6. Add `deliveredSales` relation in `usersRelations`:
```ts
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  createdSales: many(sales, { relationName: "saleCreatedByUser" }),
  canceledSales: many(sales, { relationName: "saleCanceledByUser" }),
  deliveredSales: many(sales, { relationName: "saleDeliveredByUser" }),
  stockMovements: many(stockMovements),
  expenses: many(expenses),
}));
```

- [ ] **Step 2: Generate migration**

Run: `pnpm --filter api db:generate`
Expected: Drizzle cria `apps/api/src/db/migrations/0003_*.sql`. Renomeie o arquivo gerado para `0003_sales_redesign.sql` se o nome automático for diferente (mantenha o conteúdo). Verifique se o SQL contém: `ALTER TABLE "customers" ADD COLUMN "code" text`, `ALTER TYPE "sale_status" ADD VALUE 'PENDING_DELIVERY'`, colunas em `sale_items` e `sales`.

- [ ] **Step 3: Apply migration locally and verify**

Run: `pnpm db:migrate`
Expected: `migrations applied successfully!`

Verifique o enum:
```bash
docker compose exec postgres psql -U postgres -d planeta_agua -c "SELECT enumlabel FROM pg_enum WHERE enumtypid = 'sale_status'::regtype;"
```
Expected: inclui `pending_delivery`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/db/schema.ts apps/api/src/db/migrations/0003_sales_redesign.sql apps/api/src/db/migrations/meta/
git commit -m "feat(api): add customer code, PENDING_DELIVERY status, sale item discount/price, delivery columns"
```

---

### Task 3: API repository — busca estendida, create com desconto/preço/entrega, confirmDelivery, list com filtro

**Files:**
- Modify: `apps/api/src/modules/sales/sales.types.ts`
- Modify: `apps/api/src/modules/sales/sales.errors.ts`
- Modify: `apps/api/src/modules/sales/sales.repository.ts`
- Test: `apps/api/src/modules/sales/sales.repository.test.ts`

**Interfaces:**
- Consumes: schema de Task 2, `CreateSaleInput` de Task 1.
- Produces: `SalesRepository.searchCustomers(query, secondaryQuery?)`, `SalesRepository.createSale` aceita `finalUnitPriceCents`/`discountCents`/`deliveryPending`, `SalesRepository.confirmDelivery({ saleId, userId })`, `SalesRepository.listSales({ status? })`.

- [ ] **Step 1: Update sales.types.ts**

Replace the file content with:
```ts
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { customers, saleItems, sales } from "../../db/schema";
import type { saleHistoryStatusFilterValues } from "shared";

export type SaleRow = InferSelectModel<typeof sales>;
export type NewSaleRow = InferInsertModel<typeof sales>;
export type SaleItemRow = InferSelectModel<typeof saleItems>;
export type CustomerRow = InferSelectModel<typeof customers>;
export type PaymentMethod = SaleRow["paymentMethod"];
export type SaleStatus = SaleRow["status"];
export type SaleHistoryStatusFilter = (typeof saleHistoryStatusFilterValues)[number];

export type SaleItemRepositoryInput = {
  productId: string;
  quantity: number;
  finalUnitPriceCents?: number;
  discountCents?: number;
};

export type CreateSaleRepositoryInput = {
  customerId: string | null;
  userId: string;
  paymentMethod: PaymentMethod;
  items: SaleItemRepositoryInput[];
  bottle: { month: number; year: number; notes?: string | null } | null;
  deliveryPending: boolean;
};

export type ConfirmDeliveryRepositoryInput = {
  saleId: string;
  userId: string;
};

export type ListSalesOptions = {
  status?: SaleHistoryStatusFilter;
};
```

- [ ] **Step 2: Update sales.errors.ts**

Replace the file content with:
```ts
export type SalesRepositoryErrorCode =
  | "PRODUCT_NOT_FOUND"
  | "PRODUCT_INACTIVE"
  | "INSUFFICIENT_STOCK"
  | "SALE_NOT_FOUND"
  | "SALE_ALREADY_CANCELED"
  | "SALE_ALREADY_DELIVERED"
  | "SALE_NOT_DELIVERABLE"
  | "INVALID_ITEM_PRICE";

export class SalesRepositoryError extends Error {
  readonly code: SalesRepositoryErrorCode;

  constructor(code: SalesRepositoryErrorCode, message: string) {
    super(message);
    this.name = "SalesRepositoryError";
    this.code = code;
  }
}
```

- [ ] **Step 3: Write failing repository tests**

Add these tests to `apps/api/src/modules/sales/sales.repository.test.ts` (dentro do `describe("SalesRepository", ...)` existente, novos blocos `it`):

```ts
  it("creates a pending delivery sale that decrements stock and can be delivered", async () => {
    const [user] = await db
      .insert(users)
      .values({ name: "Operador", email: "entrega@planetaagua.local", passwordHash: "hash", role: "OPERATOR" })
      .returning();
    const [product] = await db
      .insert(products)
      .values({ name: "Galao 20L", salePriceCents: 1800, stockQuantity: 5, minimumStock: 1 })
      .returning();

    const createdSale = await repository.createSale({
      customerId: null,
      userId: user.id,
      paymentMethod: "CASH",
      items: [{ productId: product.id, quantity: 1 }],
      bottle: null,
      deliveryPending: true,
    });

    expect(createdSale.status).toBe("PENDING_DELIVERY");

    const delivered = await repository.confirmDelivery({ saleId: createdSale.id, userId: user.id });
    expect(delivered.status).toBe("COMPLETED");
    expect(delivered.deliveredAt).not.toBeNull();

    const [updatedProduct] = await db.select().from(products).where(eq(products.id, product.id));
    expect(updatedProduct.stockQuantity).toBe(4);
  });

  it("rejects delivering an already delivered or canceled sale", async () => {
    const [user] = await db
      .insert(users)
      .values({ name: "Operador", email: "dup-entrega@planetaagua.local", passwordHash: "hash", role: "OPERATOR" })
      .returning();
    const [product] = await db
      .insert(products)
      .values({ name: "Galao 20L", salePriceCents: 1800, stockQuantity: 5, minimumStock: 1 })
      .returning();

    const createdSale = await repository.createSale({
      customerId: null,
      userId: user.id,
      paymentMethod: "CASH",
      items: [{ productId: product.id, quantity: 1 }],
      bottle: null,
      deliveryPending: false,
    });

    await expect(repository.confirmDelivery({ saleId: createdSale.id, userId: user.id })).rejects.toMatchObject({
      code: "SALE_NOT_DELIVERABLE",
    });

    const canceledSale = await repository.createSale({
      customerId: null,
      userId: user.id,
      paymentMethod: "CASH",
      items: [{ productId: product.id, quantity: 1 }],
      bottle: null,
      deliveryPending: true,
    });
    await repository.cancelSale({ saleId: canceledSale.id, userId: user.id, reason: "Cliente desistiu." });

    await expect(repository.confirmDelivery({ saleId: canceledSale.id, userId: user.id })).rejects.toMatchObject({
      code: "SALE_NOT_DELIVERABLE",
    });
  });

  it("creates a sale with edited unit price and per-item discount", async () => {
    const [user] = await db
      .insert(users)
      .values({ name: "Operador", email: "preco@planetaagua.local", passwordHash: "hash", role: "OPERATOR" })
      .returning();
    const [product] = await db
      .insert(products)
      .values({ name: "Galao 20L", salePriceCents: 1500, stockQuantity: 5, minimumStock: 1 })
      .returning();

    const createdSale = await repository.createSale({
      customerId: null,
      userId: user.id,
      paymentMethod: "PIX",
      items: [{ productId: product.id, quantity: 2, finalUnitPriceCents: 1300, discountCents: 100 }],
      bottle: null,
      deliveryPending: false,
    });

    const persistedItems = await db.query.saleItems.findMany({
      where: (item, { eq }) => eq(item.saleId, createdSale.id),
    });

    expect(persistedItems[0].finalUnitPriceCents).toBe(1300);
    expect(persistedItems[0].discountCents).toBe(100);
    expect(persistedItems[0].totalPriceCents).toBe(1300 * 2 - 100);
    expect(createdSale.totalAmountCents).toBe(1300 * 2 - 100);
  });

  it("searches customers by code and address", async () => {
    await db.insert(customers).values([
      { name: "Maria", code: "C001", address: "Rua das Flores, 10" },
      { name: "Joao", code: "C002", address: "Av. B, 200" },
    ]);

    const byCode = await repository.searchCustomers("", "C001");
    expect(byCode.map((c) => c.name)).toContain("Maria");

    const byAddress = await repository.searchCustomers("", "Flores");
    expect(byAddress.map((c) => c.name)).toContain("Maria");
  });

  it("lists sales filtered by status", async () => {
    const [user] = await db
      .insert(users)
      .values({ name: "Operador", email: "filtro@planetaagua.local", passwordHash: "hash", role: "OPERATOR" })
      .returning();
    const [product] = await db
      .insert(products)
      .values({ name: "Galao 20L", salePriceCents: 1800, stockQuantity: 10, minimumStock: 1 })
      .returning();

    await repository.createSale({
      customerId: null, userId: user.id, paymentMethod: "CASH",
      items: [{ productId: product.id, quantity: 1 }], bottle: null, deliveryPending: true,
    });

    const pending = await repository.listSales({ status: "PENDING_DELIVERY" });
    expect(pending.every((s) => s.status === "PENDING_DELIVERY")).toBe(true);
  });
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `pnpm --filter api test -- sales.repository.test.ts`
Expected: FAIL — métodos não existem / assinaturas erradas.

- [ ] **Step 5: Implement repository changes**

Edit `apps/api/src/modules/sales/sales.repository.ts`:

1. Atualizar imports no topo para incluir `deliveredAt`, `deliveredByUserId` indiretamente via tipos. Substitua o bloco de constantes de status e adicione helper de preço. No topo, após os imports existentes, substitua:
```ts
const completedSaleStatus: SaleStatus = "COMPLETED";
const canceledSaleStatus: SaleStatus = "CANCELED";
const pendingDeliveryStatus: SaleStatus = "PENDING_DELIVERY";
```

2. Substituir `searchCustomers`:
```ts
  async searchCustomers(primaryQuery: string, secondaryQuery = "") {
    const normalizedPrimary = primaryQuery.trim();
    const normalizedSecondary = secondaryQuery.trim();

    if (!normalizedPrimary && !normalizedSecondary) {
      return db.query.customers.findMany({ orderBy: [asc(customers.name)], limit: 10 });
    }

    const primaryClause = or(ilike(customers.name, `%${normalizedPrimary}%`), ilike(customers.phone, `%${normalizedPrimary}%`));
    const secondaryClause = or(ilike(customers.code, `%${normalizedSecondary}%`), ilike(customers.address, `%${normalizedSecondary}%`));

    const whereClause = normalizedPrimary && normalizedSecondary
      ? and(primaryClause, secondaryClause)
      : normalizedPrimary
        ? primaryClause
        : secondaryClause;

    return db.query.customers.findMany({ where: whereClause, orderBy: [asc(customers.name)], limit: 10 });
  }
```

3. Atualizar `createQuickCustomer` para aceitar `code`/`address`:
```ts
  async createQuickCustomer(input: { name: string; phone?: string | null; code?: string | null; address?: string | null }) {
    const [customer] = await db.insert(customers).values(input).returning();
    return customer;
  }
```

4. Substituir o método `createSale` inteiro por esta versão que calcula preço efetivo, desconto, e status de entrega:
```ts
  async createSale(input: CreateSaleRepositoryInput) {
    return db.transaction(async (tx) => {
      const quantityByProductId = new Map<string, number>();
      for (const item of input.items) {
        quantityByProductId.set(item.productId, (quantityByProductId.get(item.productId) ?? 0) + item.quantity);
      }

      const productIds = [...quantityByProductId.keys()];
      const lockedProducts = await tx.select().from(products).where(inArray(products.id, productIds)).for("update");
      const productById = new Map(lockedProducts.map((product) => [product.id, product]));

      let totalAmountCents = 0;

      for (const item of input.items) {
        const product = productById.get(item.productId);
        if (!product) {
          throw new SalesRepositoryError("PRODUCT_NOT_FOUND", `Produto ${item.productId} nao encontrado.`);
        }
        if (!product.isActive) {
          throw new SalesRepositoryError("PRODUCT_INACTIVE", `Produto ${product.name} esta inativo.`);
        }
        const requestedQuantity = quantityByProductId.get(item.productId) ?? item.quantity;
        if (product.stockQuantity < requestedQuantity) {
          throw new SalesRepositoryError("INSUFFICIENT_STOCK", `Estoque insuficiente para ${product.name}.`);
        }
        if (item.finalUnitPriceCents !== undefined && item.finalUnitPriceCents < 0) {
          throw new SalesRepositoryError("INVALID_ITEM_PRICE", `Preco invalido para ${product.name}.`);
        }
        const effectiveUnitPrice = item.finalUnitPriceCents ?? product.salePriceCents;
        const discount = item.discountCents ?? 0;
        const itemTotal = effectiveUnitPrice * item.quantity - discount;
        if (itemTotal < 0) {
          throw new SalesRepositoryError("INVALID_ITEM_PRICE", `Total do item ${product.name} ficou negativo.`);
        }
        totalAmountCents += itemTotal;
      }

      const saleStatus: SaleStatus = input.deliveryPending ? pendingDeliveryStatus : completedSaleStatus;

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
        })
        .returning();

      await tx.insert(saleItems).values(
        input.items.map((item) => {
          const product = productById.get(item.productId);
          if (!product) {
            throw new SalesRepositoryError("PRODUCT_NOT_FOUND", `Produto ${item.productId} nao encontrado.`);
          }
          const effectiveUnitPrice = item.finalUnitPriceCents ?? product.salePriceCents;
          const discount = item.discountCents ?? 0;
          return {
            saleId: sale.id,
            productId: product.id,
            productNameSnapshot: product.name,
            quantity: item.quantity,
            unitPriceCents: product.salePriceCents,
            totalPriceCents: effectiveUnitPrice * item.quantity - discount,
            discountCents: discount,
            finalUnitPriceCents: item.finalUnitPriceCents ?? null,
          };
        }),
      );

      for (const [productId, quantity] of quantityByProductId) {
        await tx
          .update(products)
          .set({ stockQuantity: sql`${products.stockQuantity} - ${quantity}`, updatedAt: new Date() })
          .where(eq(products.id, productId));
        await tx.insert(stockMovements).values({
          productId, userId: input.userId, type: "SALE", quantity: -quantity, reason: null, referenceId: sale.id,
        });
      }

      return sale;
    });
  }
```

5. Atualizar `listSales` para aceitar filtro:
```ts
  listSales(options: ListSalesOptions = {}) {
    return db.query.sales.findMany({
      where: options.status ? eq(sales.status, options.status) : undefined,
      orderBy: [desc(sales.createdAt)],
      with: {
        customer: { columns: { id: true, name: true } },
        user: { columns: { id: true, name: true } },
        canceledByUser: { columns: { id: true, name: true } },
        deliveredByUser: { columns: { id: true, name: true } },
      },
    });
  }
```

6. Atualizar `getSaleDetail` para incluir `deliveredByUser`:
```ts
  async getSaleDetail(id: string) {
    const sale = await db.query.sales.findFirst({
      where: eq(sales.id, id),
      with: {
        customer: { columns: { id: true, name: true } },
        user: { columns: { id: true, name: true } },
        canceledByUser: { columns: { id: true, name: true } },
        deliveredByUser: { columns: { id: true, name: true } },
        items: { orderBy: [asc(saleItems.createdAt)] },
      },
    });

    if (!sale) {
      return null;
    }

    const previousBottle = sale.customerId
      ? await db.query.sales.findFirst({
          where: and(
            eq(sales.customerId, sale.customerId),
            eq(sales.status, completedSaleStatus),
            isNotNull(sales.bottleMonth),
            isNotNull(sales.bottleYear),
            lt(sales.createdAt, sale.createdAt),
          ),
          orderBy: [desc(sales.createdAt)],
        })
      : null;

    return {
      sale,
      items: sale.items,
      previousBottle:
        previousBottle?.bottleMonth && previousBottle.bottleYear
          ? { month: previousBottle.bottleMonth, year: previousBottle.bottleYear, notes: previousBottle.bottleNotes }
          : null,
    };
  }
```

7. Atualizar `cancelSale` para recusar cancelar venda já entregue que está COMPLETED via entrega? Não — `COMPLETED` cancelável. Apenas recusar `PENDING_DELIVERY`? Não, `PENDING_DELIVERY` também é cancelável (devolve estoque). Mantém regra atual: recusa apenas se já `CANCELED`. Mas precisamos impedir cancelar após entrega? Spec diz `PENDING_DELIVERY` pode ser cancelada. `COMPLETED` (entregue) também pode ser cancelada com motivo. Mantém como está. Apenas garantir que o `cancelSale` funcione para qualquer status não-canceled.

8. Adicionar método `confirmDelivery` no final da classe:
```ts
  async confirmDelivery(input: ConfirmDeliveryRepositoryInput) {
    return db.transaction(async (tx) => {
      const [sale] = await tx.select().from(sales).where(eq(sales.id, input.saleId)).for("update");

      if (!sale) {
        throw new SalesRepositoryError("SALE_NOT_FOUND", `Venda ${input.saleId} nao encontrada.`);
      }
      if (sale.status !== pendingDeliveryStatus) {
        throw new SalesRepositoryError("SALE_NOT_DELIVERABLE", `Venda ${input.saleId} nao esta pendente de entrega.`);
      }

      const [delivered] = await tx
        .update(sales)
        .set({ status: completedSaleStatus, deliveredAt: new Date(), deliveredByUserId: input.userId, updatedAt: new Date() })
        .where(eq(sales.id, sale.id))
        .returning();

      return delivered;
    });
  }
```

Atualize os imports no topo do arquivo para incluir `ListSalesOptions` e `ConfirmDeliveryRepositoryInput`:
```ts
import type { ConfirmDeliveryRepositoryInput, CreateSaleRepositoryInput, ListSalesOptions, SaleStatus } from "./sales.types";
```

- [ ] **Step 6: Run repository tests to verify they pass**

Run: `pnpm --filter api test -- sales.repository.test.ts`
Expected: PASS (todos os testes, antigos e novos).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/sales/sales.types.ts apps/api/src/modules/sales/sales.errors.ts apps/api/src/modules/sales/sales.repository.ts apps/api/src/modules/sales/sales.repository.test.ts
git commit -m "feat(api): repository search by code/address, sale with discount/price/delivery, confirmDelivery, list filter"
```

---

### Task 4: API service + controller — confirmDelivery, busca estendida, list com filtro, endpoint deliver

**Files:**
- Modify: `apps/api/src/modules/sales/sales.service.ts`
- Modify: `apps/api/src/modules/sales/sales.controller.ts`
- Test: `apps/api/src/modules/sales/sales.service.test.ts`
- Test: `apps/api/src/modules/sales/sales.controller.test.ts`

**Interfaces:**
- Consumes: `SalesRepository` de Task 3, `confirmDeliveryInputSchema`, `saleHistoryFilterSchema` de Task 1.
- Produces: `SalesService.confirmDelivery(user, saleId)`, `SalesService.searchCustomers(primary, secondary)`, `SalesService.listSales({ status? })`; rota `POST /sales/:id/deliver`; `GET /sales?status=`.

- [ ] **Step 1: Add failing service tests**

Em `apps/api/src/modules/sales/sales.service.test.ts`, atualize o mock factory `createRepository()` adicionando:
```ts
    confirmDelivery: vi.fn(),
```

E adicione novos testes no fim do `describe`:
```ts
  it("confirms delivery for a pending delivery sale", async () => {
    const repository = createRepository();
    const service = new SalesService(repository as never);
    const delivered = { id: "88888888-8888-4888-8888-888888888888", status: "COMPLETED" as const };

    repository.confirmDelivery.mockResolvedValueOnce(delivered);
    await expect(service.confirmDelivery(operatorUser, "88888888-8888-4888-8888-888888888888")).resolves.toEqual(delivered);
    expect(repository.confirmDelivery).toHaveBeenCalledWith({ saleId: "88888888-8888-4888-8888-888888888888", userId: operatorUser.id });
  });

  it("maps confirmDelivery errors to not found or bad request", async () => {
    const repository = createRepository();
    const service = new SalesService(repository as never);

    repository.confirmDelivery.mockRejectedValueOnce(new SalesRepositoryError("SALE_NOT_FOUND", "Venda nao encontrada."));
    await expect(service.confirmDelivery(operatorUser, "88888888-8888-4888-8888-888888888888")).rejects.toBeInstanceOf(NotFoundException);

    repository.confirmDelivery.mockRejectedValueOnce(new SalesRepositoryError("SALE_NOT_DELIVERABLE", "Nao pendente."));
    await expect(service.confirmDelivery(operatorUser, "88888888-8888-4888-8888-888888888888")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("searches customers with primary and secondary queries", async () => {
    const repository = createRepository();
    const service = new SalesService(repository as never);

    repository.searchCustomers.mockResolvedValueOnce([
      { id: "99999999-9999-4999-8999-999999999999", name: "Maria", phone: "11999999999", code: "C001", address: "Rua A", notes: null, createdAt: new Date(), updatedAt: new Date() },
    ]);
    repository.getLatestBottleForCustomer.mockResolvedValueOnce(null);

    await expect(service.searchCustomers("Maria", "C001")).resolves.toEqual([
      { id: "99999999-9999-4999-8999-999999999999", name: "Maria", phone: "11999999999", code: "C001", address: "Rua A", previousBottle: null },
    ]);
    expect(repository.searchCustomers).toHaveBeenCalledWith("Maria", "C001");
  });

  it("lists sales with a status filter", async () => {
    const repository = createRepository();
    const service = new SalesService(repository as never);

    repository.listSales.mockResolvedValueOnce([]);
    await service.listSales({ status: "PENDING_DELIVERY" });
    expect(repository.listSales).toHaveBeenCalledWith({ status: "PENDING_DELIVERY" });
  });
```

Também atualize o teste existente "returns minimized customer data for sales customer search" para incluir `code: null, address: null` no mock do customer row e no expected (a resposta agora inclui `code`/`address`).

- [ ] **Step 2: Run service tests to verify they fail**

Run: `pnpm --filter api test -- sales.service.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update sales.service.ts**

1. Atualizar imports para incluir `confirmDeliveryInputSchema`, `saleHistoryFilterSchema`, e tipos:
```ts
import {
  cancelSaleInputSchema,
  confirmDeliveryInputSchema,
  createSaleInputSchema,
  quickCustomerInputSchema,
  saleHistoryFilterSchema,
  type CreateSaleInput,
  type QuickCustomerInput,
  type SaleCustomerResponse,
  type SaleDetailResponse,
  type SalesListResponse,
} from "./sales.schemas";
```

2. Atualizar `listSales` para aceitar filtro:
```ts
  async listSales(options: { status?: (typeof saleHistoryFilterValuesShape) } = {}): Promise<SalesListResponse> {
    const parsed = saleHistoryFilterSchema.safeParse(options);
    const sales = await this.salesRepository.listSales(parsed.success ? parsed.data : {});
    return sales.map((sale) => this.toHistoryResponse(sale));
  }
```
(Use o tipo importado de shared: `saleHistoryStatusFilterValues`. Para simplicidade, digite o parâmetro como `{ status?: "COMPLETED" | "CANCELED" | "PENDING_DELIVERY" }`.)

3. Atualizar `createSale` para passar `deliveryPending`:
```ts
  async createSale(user: PermissionUser, input: CreateSaleInput) {
    const parsedInput = createSaleInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new BadRequestException("Dados da venda invalidos.");
    }
    try {
      return await this.salesRepository.createSale({ ...parsedInput.data, userId: user.id });
    } catch (error) {
      throw this.mapCreateSaleError(error);
    }
  }
```
(O `parsedInput.data` já contém `deliveryPending` e items com `finalUnitPriceCents`/`discountCents`.)

4. Atualizar `searchCustomers` para aceitar `secondaryQuery`:
```ts
  async searchCustomers(primaryQuery: string, secondaryQuery = ""): Promise<SalesCustomerSummary[]> {
    const customers = await this.salesRepository.searchCustomers(primaryQuery, secondaryQuery);
    return Promise.all(customers.map((customer) => this.toCustomerSummary(customer)));
  }
```

5. Atualizar `toHistoryResponse` para incluir `deliveredAt`/`deliveredByUserId`:
```ts
  private toHistoryResponse(sale: SaleListRow): SalesListResponse[number] {
    return {
      id: sale.id,
      customerId: sale.customerId,
      customerName: sale.customer?.name ?? null,
      userId: sale.userId,
      userName: sale.user.name,
      totalAmountCents: sale.totalAmountCents,
      paymentMethod: sale.paymentMethod,
      status: sale.status,
      createdAt: sale.createdAt.toISOString(),
      canceledAt: sale.canceledAt?.toISOString() ?? null,
      cancellationReason: sale.cancellationReason,
      deliveredAt: sale.deliveredAt?.toISOString() ?? null,
      deliveredByUserId: sale.deliveredByUserId ?? null,
    };
  }
```

6. Atualizar `toDetailResponse` para incluir `deliveredAt`/`deliveredByUserId` e discount/price nos items:
```ts
  private toDetailResponse(detail: SaleDetailRow): SaleDetailResponse {
    const bottle = this.toBottleRecord(detail.sale.bottleMonth, detail.sale.bottleYear, detail.sale.bottleNotes);
    return {
      sale: {
        id: detail.sale.id,
        customerId: detail.sale.customerId,
        customerName: detail.sale.customer?.name ?? null,
        userId: detail.sale.userId,
        userName: detail.sale.user.name,
        totalAmountCents: detail.sale.totalAmountCents,
        paymentMethod: detail.sale.paymentMethod,
        status: detail.sale.status,
        createdAt: detail.sale.createdAt.toISOString(),
        canceledAt: detail.sale.canceledAt?.toISOString() ?? null,
        cancellationReason: detail.sale.cancellationReason,
        deliveredAt: detail.sale.deliveredAt?.toISOString() ?? null,
        deliveredByUserId: detail.sale.deliveredByUserId ?? null,
        bottle,
        previousBottle: detail.previousBottle,
      },
      items: detail.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productNameSnapshot: item.productNameSnapshot,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        totalPriceCents: item.totalPriceCents,
        discountCents: item.discountCents ?? null,
        finalUnitPriceCents: item.finalUnitPriceCents ?? null,
      })),
      bottleAlerts: {
        expired: isBottleExpired(bottle, new Date()),
        mismatch: hasBottleMismatch(detail.previousBottle, bottle),
      },
    };
  }
```

7. Atualizar `toCustomerSummary` para incluir `code`/`address`:
```ts
  private async toCustomerSummary(customer: SalesCustomerRow): Promise<SalesCustomerSummary> {
    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      code: customer.code ?? null,
      address: customer.address ?? null,
      previousBottle: await this.salesRepository.getLatestBottleForCustomer(customer.id),
    };
  }
```

8. Atualizar `createQuickCustomer` para retornar `code`/`address`:
```ts
  async createQuickCustomer(input: QuickCustomerInput): Promise<SalesCustomerSummary> {
    const parsedInput = quickCustomerInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new BadRequestException("Dados do cliente invalidos.");
    }
    const customer = await this.salesRepository.createQuickCustomer(parsedInput.data);
    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      code: customer.code ?? null,
      address: customer.address ?? null,
      previousBottle: null,
    };
  }
```

9. Adicionar `confirmDelivery` e `mapConfirmDeliveryError`:
```ts
  async confirmDelivery(user: PermissionUser, saleId: string) {
    try {
      return await this.salesRepository.confirmDelivery({ saleId, userId: user.id });
    } catch (error) {
      throw this.mapConfirmDeliveryError(error);
    }
  }

  private mapConfirmDeliveryError(error: unknown) {
    if (error instanceof SalesRepositoryError) {
      if (error.code === "SALE_NOT_FOUND") {
        return new NotFoundException("Venda nao encontrada.");
      }
      return new BadRequestException(error.message);
    }
    return new BadRequestException("Nao foi possivel confirmar a entrega.");
  }
```

Atualize o import do `SalesRepositoryError` (já importado). Atualize o import de shared no topo do arquivo para incluir `saleHistoryStatusFilterValues` se usado no tipo.

- [ ] **Step 4: Update sales.schemas.ts re-exports**

Edite `apps/api/src/modules/sales/sales.schemas.ts` para re-exportar os novos schemas:
```ts
import {
  cancelSaleInputSchema,
  confirmDeliveryInputSchema,
  createSaleInputSchema,
  quickCustomerInputSchema,
  saleCustomerResponseSchema,
  saleCustomersResponseSchema,
  saleDetailResponseSchema,
  saleHistoryFilterSchema,
  saleHistoryResponseSchema,
} from "shared";

export {
  cancelSaleInputSchema,
  confirmDeliveryInputSchema,
  createSaleInputSchema,
  quickCustomerInputSchema,
  saleCustomerResponseSchema,
  saleCustomersResponseSchema,
  saleDetailResponseSchema,
  saleHistoryFilterSchema,
  saleHistoryResponseSchema,
};

export type CancelSaleInput = z.infer<typeof cancelSaleInputSchema>;
export type ConfirmDeliveryInput = z.infer<typeof confirmDeliveryInputSchema>;
export type CreateSaleInput = z.infer<typeof createSaleInputSchema>;
export type QuickCustomerInput = z.infer<typeof quickCustomerInputSchema>;
export type SaleCustomerResponse = z.infer<typeof saleCustomerResponseSchema>;
export type SalesCustomersResponse = z.infer<typeof saleCustomersResponseSchema>;
export type SaleDetailResponse = z.infer<typeof saleDetailResponseSchema>;
export type SalesListResponse = z.infer<typeof saleHistoryResponseSchema>;
export type SaleHistoryFilter = z.infer<typeof saleHistoryFilterSchema>;
```

- [ ] **Step 5: Run service tests to verify they pass**

Run: `pnpm --filter api test -- sales.service.test.ts`
Expected: PASS.

- [ ] **Step 6: Update sales.controller.ts**

Adicione o endpoint de entrega e o filtro de status na listagem. Substitua o conteúdo por:
```ts
import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";

import { requireRequestUser } from "../auth/current-user";
import { AuthService } from "../auth/auth.service";
import {
  cancelSaleInputSchema,
  confirmDeliveryInputSchema,
  createSaleInputSchema,
  quickCustomerInputSchema,
  saleHistoryFilterSchema,
} from "./sales.schemas";
import { SalesService } from "./sales.service";

const idSchema = z.string().uuid();
const statusFilterSchema = z.enum(["COMPLETED", "CANCELED", "PENDING_DELIVERY"]).optional();

function parseSalesBody<T>(schema: z.ZodType<T>, body: unknown, message: string): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(message);
  }
  return result.data;
}

function parseSaleId(id: string) {
  const result = idSchema.safeParse(id);
  if (!result.success) {
    throw new BadRequestException("Venda invalida.");
  }
  return result.data;
}

@Controller("sales")
export class SalesController {
  constructor(
    private readonly authService: AuthService,
    private readonly salesService: SalesService,
  ) {}

  @Get()
  async list(@Req() request: Request, @Query("status") status?: string) {
    await requireRequestUser(request, this.authService);
    const parsed = saleHistoryFilterSchema.safeParse({ status });
    return this.salesService.listSales(parsed.success ? parsed.data : {});
  }

  @Get("customers")
  async searchCustomers(@Req() request: Request, @Query("query") primaryQuery = "", @Query("secondary") secondaryQuery = "") {
    await requireRequestUser(request, this.authService);
    return this.salesService.searchCustomers(primaryQuery, secondaryQuery);
  }

  @Get(":id")
  async detail(@Req() request: Request, @Param("id") id: string) {
    await requireRequestUser(request, this.authService);
    return this.salesService.getSaleDetail(parseSaleId(id));
  }

  @Post()
  async create(@Req() request: Request, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    const input = parseSalesBody(createSaleInputSchema, body, "Dados da venda invalidos.");
    return this.salesService.createSale(user, input);
  }

  @Post("customers")
  async createCustomer(@Req() request: Request, @Body() body: unknown) {
    await requireRequestUser(request, this.authService);
    const input = parseSalesBody(quickCustomerInputSchema, body, "Dados do cliente invalidos.");
    return this.salesService.createQuickCustomer(input);
  }

  @Post(":id/cancel")
  async cancel(@Param("id") id: string, @Req() request: Request, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    const saleId = parseSaleId(id);
    const input = parseSalesBody(cancelSaleInputSchema, body, "Dados do cancelamento invalidos.");
    return this.salesService.cancelSale(user, saleId, input.reason);
  }

  @Post(":id/deliver")
  async deliver(@Param("id") id: string, @Req() request: Request, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    const saleId = parseSaleId(id);
    parseSalesBody(confirmDeliveryInputSchema, body, "Dados de entrega invalidos.");
    return this.salesService.confirmDelivery(user, saleId);
  }
}
```

- [ ] **Step 7: Update controller tests**

Em `apps/api/src/modules/sales/sales.controller.test.ts`, adicione testes para o endpoint deliver e o filtro de status. Siga o padrão existente do arquivo (mock de `SalesService` e `AuthService` com `requireRequestUser` resolvido). Adicione:

```ts
  it("POST /sales/:id/deliver confirms delivery", async () => {
    const salesService = { confirmDelivery: vi.fn().mockResolvedValue({ id: "x", status: "COMPLETED" }) };
    const authService = { getUserFromRequest: vi.fn().mockResolvedValue({ id: "u", role: "OPERATOR" }) };
    const controller = new SalesController(authService as never, salesService as never);

    await controller.deliver("88888888-8888-4888-8888-888888888888", { user: { id: "u", role: "OPERATOR" } } as never, {});
    expect(salesService.confirmDelivery).toHaveBeenCalled();
  });

  it("GET /sales?status=PENDING_DELIVERY forwards filter to service", async () => {
    const salesService = { listSales: vi.fn().mockResolvedValue([]) };
    const authService = { getUserFromRequest: vi.fn() };
    const controller = new SalesController(authService as never, salesService as never);

    await controller.list({} as never, "PENDING_DELIVERY");
    expect(salesService.listSales).toHaveBeenCalledWith(expect.objectContaining({ status: "PENDING_DELIVERY" }));
  });
```
(Adapte os mocks ao padrão real do arquivo de teste do controller — leia o arquivo antes de escrever.)

- [ ] **Step 8: Run all API tests**

Run: `pnpm --filter api test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/sales/sales.service.ts apps/api/src/modules/sales/sales.service.test.ts apps/api/src/modules/sales/sales.controller.ts apps/api/src/modules/sales/sales.controller.test.ts apps/api/src/modules/sales/sales.schemas.ts
git commit -m "feat(api): confirm delivery endpoint, status filter, extended customer search"
```

---

### Task 5: Web lib helpers + proxy deliver route

**Files:**
- Modify: `apps/web/src/lib/sales.ts`
- Create: `apps/web/src/app/api/sales/[id]/deliver/route.ts`

**Interfaces:**
- Consumes: contracts de Task 1.
- Produces: `saleFormToPayload` agora aceita items com `finalUnitPriceCents`/`discountCents` e `deliveryPending`; `confirmDelivery(saleId)` fetcher; `searchSaleCustomers(query, secondaryQuery?)` com query param secundário; `fetchSalesHistory(cookieHeader, filter?)`.

- [ ] **Step 1: Update web sales lib**

Edite `apps/web/src/lib/sales.ts`:

1. Atualizar `saleFormToPayload` para incluir desconto/preço/entrega:
```ts
export function saleFormToPayload(input: {
  customerId: string | null;
  paymentMethod: "CASH" | "PIX" | "CREDIT_CARD" | "DEBIT_CARD" | "OTHER";
  items: Array<{ productId: string; quantity: number; finalUnitPriceCents?: number; discountCents?: number }>;
  bottleMonth: string;
  bottleYear: string;
  bottleNotes: string;
  deliveryPending: boolean;
}) {
  const hasBottleMonth = input.bottleMonth.trim() !== "";
  const hasBottleYear = input.bottleYear.trim() !== "";

  if (hasBottleMonth !== hasBottleYear) {
    throw new Error("Informe mes e ano do galao.");
  }

  const bottle = hasBottleMonth && hasBottleYear
    ? { month: Number(input.bottleMonth), year: Number(input.bottleYear), notes: input.bottleNotes.trim() || null }
    : null;

  return createSaleInputSchema.parse({
    customerId: input.customerId,
    paymentMethod: input.paymentMethod,
    items: input.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      ...(item.finalUnitPriceCents !== undefined ? { finalUnitPriceCents: item.finalUnitPriceCents } : {}),
      ...(item.discountCents !== undefined ? { discountCents: item.discountCents } : {}),
    })),
    bottle,
    deliveryPending: input.deliveryPending,
  });
}
```

2. Atualizar `fetchSalesHistory` para aceitar filtro:
```ts
export async function fetchSalesHistory(cookieHeader: string, filter?: { status?: string }) {
  const params = new URLSearchParams();
  if (filter?.status) {
    params.set("status", filter.status);
  }
  const qs = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${getServerApiUrl()}/sales${qs}`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  ensureResponseOk(response, "Nao foi possivel carregar o historico de vendas.");

  return saleHistoryResponseSchema.parse(await response.json());
}
```

3. Atualizar `searchSaleCustomers` para aceitar query secundária:
```ts
export async function searchSaleCustomers(primaryQuery: string, options?: SalesRequestOptions & { secondaryQuery?: string }) {
  const params = new URLSearchParams({ query: primaryQuery });
  if (options?.secondaryQuery) {
    params.set("secondary", options.secondaryQuery);
  }
  const response = await fetch(buildSalesUrl(`/sales/customers?${params.toString()}`, options?.cookieHeader), {
    headers: buildHeaders({}, options?.cookieHeader),
    cache: "no-store",
  });

  ensureResponseOk(response, "Nao foi possivel buscar os clientes.");

  return saleCustomersResponseSchema.parse(await response.json());
}
```

4. Atualizar `createSaleCustomer` para incluir code/address:
```ts
export async function createSaleCustomer(
  input: { name: string; phone?: string | null; code?: string | null; address?: string | null },
  options?: SalesRequestOptions,
) {
  const payload = quickCustomerInputSchema.parse(input);
  const response = await fetch(buildSalesUrl("/sales/customers", options?.cookieHeader), {
    method: "POST",
    headers: buildHeaders({ "content-type": "application/json" }, options?.cookieHeader),
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  ensureResponseOk(response, "Nao foi possivel cadastrar o cliente.");

  return saleCustomerResponseSchema.parse(await response.json());
}
```

5. Adicionar `confirmSaleDelivery`:
```ts
export async function confirmSaleDelivery(saleId: string) {
  const response = await fetch(`/api/sales/${encodeURIComponent(saleId)}/deliver`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
    cache: "no-store",
  });

  ensureResponseOk(response, "Nao foi possivel confirmar a entrega.");

  return response.json();
}
```

- [ ] **Step 2: Create proxy deliver route**

Create `apps/web/src/app/api/sales/[id]/deliver/route.ts`:
```ts
import { NextResponse } from "next/server";

import { getServerApiUrl } from "@/lib/api";

type RouteContext = { params: Promise<{ id: string }> };

function cookieHeader(request: Request) {
  return request.headers.get("cookie") ?? "";
}

async function jsonResponse(response: Response) {
  if (response.status === 204 || response.status === 205) {
    return new Response(null, { status: response.status });
  }
  const payload = await response.json().catch(() => ({ ok: response.ok }));
  return NextResponse.json(payload, { status: response.status });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const saleId = encodeURIComponent(id);
  const response = await fetch(`${getServerApiUrl()}/sales/${saleId}/deliver`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookieHeader(request) },
    body: await request.text(),
    cache: "no-store",
  });

  return jsonResponse(response);
}
```

- [ ] **Step 3: Typecheck web**

Run: `pnpm --filter web typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/sales.ts apps/web/src/app/api/sales/[id]/deliver/route.ts
git commit -m "feat(web): sales payload with discount/price/delivery, confirm delivery fetcher, history filter"
```

---

### Task 6: Rewrite sales UI — checkout lateral com busca melhorada

**Files:**
- Rewrite: `apps/web/src/app/(app)/vendas/sales-ui.tsx`
- Rewrite: `apps/web/src/app/(app)/vendas/sales-ui.test.tsx`
- Modify: `apps/web/src/app/(app)/vendas/page.tsx`

**Interfaces:**
- Consumes: helpers de Task 5, componentes UI existentes.
- Produces: `SalesUi` com layout de duas colunas (área principal + sidebar de carrinho), busca de cliente com 2 campos e dropdown, busca de produto com dropdown, carrinho lateral com edição de preço/desconto/quantidade, checkbox de entrega.

- [ ] **Step 1: Update page.tsx to remove history fetch**

Substitua `apps/web/src/app/(app)/vendas/page.tsx` por:
```tsx
import { cookies } from "next/headers";

import { requireUser } from "@/lib/auth";
import { fetchProducts } from "@/lib/products";
import { searchSaleCustomers } from "@/lib/sales";

import { SalesUi } from "./sales-ui";

export default async function SalesPage() {
  const user = await requireUser();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  const [productsData, customers] = await Promise.all([
    fetchProducts(cookieHeader),
    searchSaleCustomers("", { cookieHeader }),
  ]);

  return (
    <SalesUi
      userRole={user.role}
      products={productsData.products.filter((product) => product.isActive)}
      customers={customers}
    />
  );
}
```

- [ ] **Step 2: Write failing UI tests**

Substitua `apps/web/src/app/(app)/vendas/sales-ui.test.tsx` por testes que validam o novo layout. Mantenha os testes de `syncCustomersFromProps` e `resolveBottleState` (funções auxiliares que serão preservadas/exportadas). Adicione:

```tsx
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveBottleState, SalesUi, syncCustomersFromProps } from "./sales-ui";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}));

afterEach(() => {
  vi.doUnmock("next/navigation");
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("SalesUi", () => {
  it("does not render long explanatory paragraphs", () => {
    const html = renderToStaticMarkup(
      createElement(SalesUi, {
        userRole: "OPERATOR",
        products: [],
        customers: [],
      }),
    );

    expect(html).not.toContain("Cliente opcional");
    expect(html).not.toContain("Voce pode finalizar a venda sem cliente");
    expect(html).not.toContain("Somente produtos ativos aparecem aqui");
    expect(html).not.toContain("Ajuste quantidades rapidamente antes de finalizar");
  });

  it("renders two customer search fields and a product search field", () => {
    const html = renderToStaticMarkup(
      createElement(SalesUi, {
        userRole: "OPERATOR",
        products: [],
        customers: [],
      }),
    );

    expect(html).toContain("Buscar por nome ou telefone");
    expect(html).toContain("Codigo ou endereco");
    expect(html).toContain("Digite o nome do produto");
  });

  it("renders the cart sidebar with finalize button", () => {
    const html = renderToStaticMarkup(
      createElement(SalesUi, {
        userRole: "OPERATOR",
        products: [],
        customers: [],
      }),
    );

    expect(html).toContain("Carrinho");
    expect(html).toContain("Finalizar venda");
  });

  it("renders a delivery-later checkbox", () => {
    const html = renderToStaticMarkup(
      createElement(SalesUi, {
        userRole: "OPERATOR",
        products: [],
        customers: [],
      }),
    );

    expect(html).toContain("Entregar depois");
  });

  it("does not render sales history on the sales page", () => {
    const html = renderToStaticMarkup(
      createElement(SalesUi, {
        userRole: "OPERATOR",
        products: [],
        customers: [],
      }),
    );

    expect(html).not.toContain("Historico recente");
  });
});
```

(Para `syncCustomersFromProps` e `resolveBottleState`, mantenha os testes existentes relevantes — adapte se as assinaturas mudarem. As funções auxiliares continuam exportadas.)

- [ ] **Step 3: Run UI tests to verify they fail**

Run: `pnpm --filter web test -- sales-ui.test`
Expected: FAIL — layout atual ainda renderiza os textos antigos.

- [ ] **Step 4: Rewrite sales-ui.tsx**

Reescreva `apps/web/src/app/(app)/vendas/sales-ui.tsx` implementando o novo layout. Estrutura:

- Estado: `selectedCustomerId`, `primaryCustomerQuery`, `secondaryCustomerQuery`, `customerResults` (dropdown), `productQuery`, `productResults` (dropdown), `cartItems` (com `finalUnitPriceCents`/`discountCents`), `paymentMethod`, `deliveryPending`, `bottle*`, drawer de cadastro, estados de loading/erro.
- Layout: `<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,380px)]">`.
- Coluna principal:
  - Bloco cliente: dois `TextInput` (principal e secundário) + botão "+ cadastrar". Dropdown de resultados quando `customerResults.length > 0`. Quando selecionado, mostra nome/telefone e botão "Trocar". Campos de galão compactados.
  - Bloco produto: um `TextInput` com placeholder "Digite o nome do produto". Dropdown com até 8 resultados (nome, estoque, preço). Clique adiciona ao carrinho.
- Sidebar (carrinho):
  - Lista de items: nome, input numérico de quantidade, input de preço unitário (editável), input de desconto em reais (convertido para centavos), subtotal, botão remover.
  - Select de forma de pagamento.
  - Checkbox "Entregar depois".
  - Total destacado.
  - Botão "Finalizar venda".
- `finalizeSale` monta payload via `saleFormToPayload` com `deliveryPending`.
- Sem histórico.
- Mantém funções auxiliares exportadas: `syncCustomersFromProps`, `resolveBottleState`, e helpers de galão.
- Remove todos os parágrafos explicativos longos. Labels curtos: "Cliente", "Produto", "Quantidade", "Preco", "Desconto", "Total", "Pagamento".

Implemente o componente completo (use os componentes UI existentes: `Panel`, `Button`, `TextInput`, `SelectInput`, `Field`, `Badge`, `Alert`, `Drawer`, `EmptyState`). O dropdown de resultados pode ser um `<div className="absolute z-30 ...">` posicionado abaixo do input, ou um `<ul>` simples dentro de um wrapper `relative`. Mantenha acessibilidade: `role="listbox"` e `aria-label`.

Conversão de reais para centavos no input de desconto/preço: use um helper `reaisToCents(value: string): number` que faz `Math.round(Number(value.replace(",", ".")) * 100)` e `centsToReais(cents: number): string` que faz `(cents / 100).toFixed(2).replace(".", ",")`.

- [ ] **Step 5: Run UI tests to verify they pass**

Run: `pnpm --filter web test -- sales-ui.test`
Expected: PASS.

- [ ] **Step 6: Typecheck and lint web**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/(app)/vendas/sales-ui.tsx apps/web/src/app/(app)/vendas/sales-ui.test.tsx apps/web/src/app/(app)/vendas/page.tsx
git commit -m "feat(web): redesign sales screen with checkout sidebar, search dropdowns, item price/discount, delivery"
```

---

### Task 7: History page — `/vendas/historico` com filtros e confirmar entrega

**Files:**
- Create: `apps/web/src/app/(app)/vendas/historico/page.tsx`
- Create: `apps/web/src/app/(app)/vendas/historico/history-ui.tsx`
- Create: `apps/web/src/app/(app)/vendas/historico/history-ui.test.tsx`

**Interfaces:**
- Consumes: `fetchSalesHistory` de Task 5, `confirmSaleDelivery` de Task 5, `cancelSalePayload` existente, componentes UI.
- Produces: página de histórico com filtros (Hoje, Concluídas, Pendentes de entrega, Canceladas), tabela com ações de cancelar e confirmar entrega.

- [ ] **Step 1: Write failing history UI tests**

Create `apps/web/src/app/(app)/vendas/historico/history-ui.test.tsx`:
```tsx
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HistoryUi } from "./history-ui";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}));

afterEach(() => {
  vi.doUnmock("next/navigation");
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("HistoryUi", () => {
  const sampleSale = {
    id: "s1",
    customerId: null,
    customerName: "Maria",
    userId: "u1",
    userName: "Operador",
    totalAmountCents: 1800,
    paymentMethod: "PIX" as const,
    status: "PENDING_DELIVERY" as const,
    createdAt: "2026-06-19T10:00:00.000Z",
    canceledAt: null,
    cancellationReason: null,
    deliveredAt: null,
    deliveredByUserId: null,
  };

  it("renders filter tabs including pending delivery", () => {
    const html = renderToStaticMarkup(
      createElement(HistoryUi, { userRole: "OPERATOR", history: [sampleSale], activeFilter: "PENDING_DELIVERY" }),
    );

    expect(html).toContain("Pendentes de entrega");
    expect(html).toContain("Concluidas");
    expect(html).toContain("Canceladas");
  });

  it("renders confirm delivery action for pending delivery sales", () => {
    const html = renderToStaticMarkup(
      createElement(HistoryUi, { userRole: "OPERATOR", history: [sampleSale], activeFilter: "PENDING_DELIVERY" }),
    );

    expect(html).toContain("Confirmar entrega");
  });

  it("does not render confirm delivery for completed sales", () => {
    const completedSale = { ...sampleSale, status: "COMPLETED" as const };
    const html = renderToStaticMarkup(
      createElement(HistoryUi, { userRole: "OPERATOR", history: [completedSale], activeFilter: "COMPLETED" }),
    );

    expect(html).not.toContain("Confirmar entrega");
  });
});
```

- [ ] **Step 2: Run history tests to verify they fail**

Run: `pnpm --filter web test -- history-ui.test`
Expected: FAIL — arquivo não existe.

- [ ] **Step 3: Create history page**

Create `apps/web/src/app/(app)/vendas/historico/page.tsx`:
```tsx
import { cookies } from "next/headers";

import { requireUser } from "@/lib/auth";
import { fetchSalesHistory } from "@/lib/sales";

import { HistoryUi } from "./history-ui";

type SearchParams = Promise<{ status?: string }>;

export default async function HistoryPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  const { status } = await searchParams;
  const history = await fetchSalesHistory(cookieHeader, status ? { status } : undefined);

  return (
    <HistoryUi
      userRole={user.role}
      history={history}
      activeFilter={(status as "COMPLETED" | "CANCELED" | "PENDING_DELIVERY" | undefined) ?? undefined}
    />
  );
}
```

- [ ] **Step 4: Create history-ui.tsx**

Crie `apps/web/src/app/(app)/vendas/historico/history-ui.tsx`. Estrutura:

- Props: `userRole`, `history`, `activeFilter`.
- `PageHeader` com título "Historico de vendas".
- Filtros como links (`<Link href="/vendas/historico">`, `/vendas/historico?status=COMPLETED`, etc.): Todos, Hoje (destaque visual para vendas de hoje), Concluidas, Pendentes de entrega, Canceladas. Use o `activeFilter` para destacar o ativo com `Badge` ou estilo de botão.
- `DataTable` com colunas: cliente, total, pagamento, status (badge), horario, ações.
- Ações por status:
  - `PENDING_DELIVERY`: botão "Confirmar entrega" (chama `confirmSaleDelivery`) + "Cancelar venda".
  - `COMPLETED`: "Cancelar venda".
  - `CANCELED`: texto "Cancelada".
- Cancelamento usa `window.prompt` para motivo e `fetch("/api/sales/:id/cancel", ...)` com `cancelSalePayload`.
- `useRouter` para `refresh` após ação.
- "Hoje" é um filtro client-side que mostra vendas com `createdAt` de hoje (não muda a query, apenas filtra o array recebido). Para simplicidade do MVP, "Hoje" filtra no cliente; os outros filtros usam query param `status`.

- [ ] **Step 5: Run history tests to verify they pass**

Run: `pnpm --filter web test -- history-ui.test`
Expected: PASS.

- [ ] **Step 6: Typecheck and lint**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/(app)/vendas/historico/
git commit -m "feat(web): sales history page with filters and confirm delivery action"
```

---

### Task 8: Navigation link + full verification

**Files:**
- Modify: `apps/web/src/app/(app)/layout.tsx` (ou arquivo de navegação/sidebar onde os links estão)

- [ ] **Step 1: Add history link to navigation**

Encontre o componente de navegação (sidebar/topbar) em `apps/web/src/app/(app)/`. Adicione um link "Vendas" apontando para `/vendas` e, se houver submenu ou se preferir, adicione "Historico" apontando para `/vendas/historico`. Se a navegação for plana, mantenha apenas "Vendas" e adicione um link na própria tela de vendas para o histórico (botão "Ver historico" no `PageHeader` da tela de vendas).

- [ ] **Step 2: Add "Ver historico" link on sales page header**

No `sales-ui.tsx`, adicione no `PageHeader` (ou logo abaixo) um `Button` secundário/link para `/vendas/historico`. Exemplo:
```tsx
import Link from "next/link";
// ... no header:
<Link href="/vendas/historico" className="...">Ver historico</Link>
```

- [ ] **Step 3: Run full verification suite**

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

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(app)/layout.tsx apps/web/src/app/(app)/vendas/sales-ui.tsx
git commit -m "feat(web): add sales history navigation link"
```

---

## Self-Review

**Spec coverage:**
- Redesign `/vendas`: Task 6. ✓
- Nova página `/vendas/historico`: Task 7. ✓
- Busca de cliente 2 campos: Task 3 (repo) + Task 6 (UI). ✓
- Busca de produto com dropdown: Task 6. ✓
- Carrinho lateral com quantidade/preço/desconto: Task 6. ✓
- Status `PENDING_DELIVERY`: Tasks 1-4. ✓
- Confirmar entrega na tela de histórico: Task 7. ✓
- Redução de texto: Task 6 (testes verificam ausência de textos longos). ✓
- Customer `code`: Tasks 1-3. ✓

**Placeholder scan:** Nenhum TBD/TODO. Os passos de UI (Task 6 Step 4 e Task 7 Step 4) descrevem a estrutura em detalhe mas deixam a implementação do componente para o implementador porque o componente é grande; isso é aceitável porque os testes definem o contrato comportamental e a estrutura está especificada. Os demais passos têm código completo.

**Type consistency:** `SaleItemRepositoryInput` (Task 3) corresponde a `createSaleInputSchema` items (Task 1). `confirmDelivery` signature consistente entre repository, service, controller. `listSales({ status? })` consistente. `saleCustomerResponseSchema` inclui `code`/`address` em todos os níveis.
