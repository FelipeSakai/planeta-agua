# Stock Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MVP stock module so admins can register manual stock entries and absolute adjustments while admins/operators can consult stock and movement history.

**Architecture:** Nest owns all stock business rules, permissions, transactions, and PostgreSQL access through Drizzle. Next renders `/estoque`, uses same-origin route handlers under `/api/stock`, and never imports database code. `packages/shared` contains stock schemas/types used by both API and web.

**Tech Stack:** Turborepo, pnpm, Next.js App Router, NestJS, TypeScript, Drizzle ORM, PostgreSQL, Zod, Vitest.

## Global Constraints

- Only `ADMIN` can mutate stock manually.
- `ADMIN` and `OPERATOR` can consult stock and stock movement history.
- Every manual stock mutation must run in a database transaction.
- Every manual stock mutation must create an immutable `stock_movements` row.
- Stock entry increases `products.stock_quantity` and creates movement type `IN`.
- Absolute stock adjustment sets final stock and creates movement type `ADJUSTMENT` with quantity delta `newQuantity - previousQuantity`.
- Reason is required for entry and adjustment.
- Next must not access PostgreSQL directly.
- Sales, sale stock deduction, and sale cancellation stock return are outside this plan.
- Do not add new dependencies.

---

## File Structure

- Modify `packages/shared/src/index.ts`: export stock contracts.
- Create `packages/shared/src/stock.ts`: stock schemas, response types, movement labels.
- Create `packages/shared/src/stock.test.ts`: schema tests for entry, adjustment, and response parsing.
- Modify `apps/api/src/db/schema.ts`: add missing `stockMovementsRelations` so movement history can include product and user cleanly.
- Create `apps/api/src/modules/stock/stock.schemas.ts`: API-local exports reusing shared schemas.
- Create `apps/api/src/modules/stock/stock.repository.ts`: product stock queries, transactional entry/adjustment, movement history query.
- Create `apps/api/src/modules/stock/stock.repository.test.ts`: transaction behavior tests with mocked `db`.
- Create `apps/api/src/modules/stock/stock.service.ts`: permission checks, validation, mapping, summary.
- Create `apps/api/src/modules/stock/stock.service.test.ts`: role/rule tests using a fake repository.
- Create `apps/api/src/modules/stock/stock.controller.ts`: Nest REST endpoints.
- Create `apps/api/src/modules/stock/stock.controller.test.ts`: request parsing/auth delegation tests.
- Create `apps/api/src/modules/stock/stock.module.ts`: Nest module wiring.
- Modify `apps/api/src/app.module.ts`: import `StockModule`.
- Create `apps/web/src/lib/stock.ts`: stock fetch/form helpers.
- Create `apps/web/src/lib/stock.test.ts`: form parsing tests.
- Create `apps/web/src/app/api/stock/route.ts`: same-origin proxy for `GET /stock`.
- Create `apps/web/src/app/api/stock/entries/route.ts`: same-origin proxy for stock entry.
- Create `apps/web/src/app/api/stock/adjustments/route.ts`: same-origin proxy for adjustment.
- Create `apps/web/src/app/(app)/estoque/page.tsx`: protected stock page.
- Create `apps/web/src/app/(app)/estoque/stock-ui.tsx`: client UI for stock list, forms, movement history.
- Create `apps/web/src/app/(app)/estoque/stock-ui.test.tsx`: role-based UI tests.

---

### Task 1: Shared Stock Contracts

**Files:**
- Create: `packages/shared/src/stock.ts`
- Create: `packages/shared/src/stock.test.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Consumes: Zod from `zod`.
- Produces: `stockEntrySchema`, `stockAdjustmentSchema`, `stockProductSchema`, `stockMovementSchema`, `stockPageResponseSchema`, `stockMutationResponseSchema`, `StockEntryInput`, `StockAdjustmentInput`, `StockProductResponse`, `StockMovementResponse`, `StockPageResponse`, `StockMutationResponse`, `getStockMovementTypeLabel(type)`.

- [ ] **Step 1: Write failing shared stock tests**

Create `packages/shared/src/stock.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { getStockMovementTypeLabel, stockAdjustmentSchema, stockEntrySchema, stockPageResponseSchema } from "./stock";

describe("stock shared contracts", () => {
  it("accepts a valid stock entry", () => {
    expect(
      stockEntrySchema.parse({
        productId: "11111111-1111-4111-8111-111111111111",
        quantity: "5",
        reason: "Compra semanal",
      }),
    ).toEqual({
      productId: "11111111-1111-4111-8111-111111111111",
      quantity: 5,
      reason: "Compra semanal",
    });
  });

  it("rejects entry with zero quantity or blank reason", () => {
    expect(() =>
      stockEntrySchema.parse({
        productId: "11111111-1111-4111-8111-111111111111",
        quantity: 0,
        reason: "",
      }),
    ).toThrow();
  });

  it("accepts an absolute adjustment to zero", () => {
    expect(
      stockAdjustmentSchema.parse({
        productId: "11111111-1111-4111-8111-111111111111",
        newQuantity: "0",
        reason: "Conferencia fisica",
      }),
    ).toEqual({
      productId: "11111111-1111-4111-8111-111111111111",
      newQuantity: 0,
      reason: "Conferencia fisica",
    });
  });

  it("rejects adjustment with negative final quantity", () => {
    expect(() =>
      stockAdjustmentSchema.parse({
        productId: "11111111-1111-4111-8111-111111111111",
        newQuantity: -1,
        reason: "Conferencia fisica",
      }),
    ).toThrow();
  });

  it("parses stock page responses", () => {
    const result = stockPageResponseSchema.parse({
      products: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Galao 20L",
          stockQuantity: 2,
          minimumStock: 3,
          isActive: true,
          isLowStock: true,
        },
      ],
      movements: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          productId: "11111111-1111-4111-8111-111111111111",
          productName: "Galao 20L",
          userId: "33333333-3333-4333-8333-333333333333",
          userName: "Administrador",
          type: "IN",
          quantity: 5,
          reason: "Compra semanal",
          createdAt: "2026-06-17T00:00:00.000Z",
        },
      ],
      summary: { totalProducts: 1, lowStockProducts: 1, totalUnits: 2 },
    });

    expect(result.products[0]?.isLowStock).toBe(true);
    expect(result.summary.totalUnits).toBe(2);
  });

  it("returns stock movement labels", () => {
    expect(getStockMovementTypeLabel("IN")).toBe("Entrada");
    expect(getStockMovementTypeLabel("ADJUSTMENT")).toBe("Ajuste");
    expect(getStockMovementTypeLabel("SALE")).toBe("Venda");
    expect(getStockMovementTypeLabel("CANCELED_SALE")).toBe("Venda cancelada");
    expect(getStockMovementTypeLabel("OUT")).toBe("Saida");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter shared test -- src/stock.test.ts`

Expected: FAIL because `./stock` does not exist.

- [ ] **Step 3: Implement shared stock contracts**

Create `packages/shared/src/stock.ts`:

```ts
import { z } from "zod";

const requiredNonNegativeIntegerSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? Number(trimmed) : Number.NaN;
  }

  if (typeof value === "number") {
    return value;
  }

  return Number.NaN;
}, z.number().int().min(0));

const requiredPositiveIntegerSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? Number(trimmed) : Number.NaN;
  }

  if (typeof value === "number") {
    return value;
  }

  return Number.NaN;
}, z.number().int().min(1));

const requiredReasonSchema = z.string().trim().min(1);

export const stockMovementTypeSchema = z.enum(["IN", "OUT", "ADJUSTMENT", "SALE", "CANCELED_SALE"]);

export const stockEntrySchema = z.object({
  productId: z.string().uuid(),
  quantity: requiredPositiveIntegerSchema,
  reason: requiredReasonSchema,
});

export const stockAdjustmentSchema = z.object({
  productId: z.string().uuid(),
  newQuantity: requiredNonNegativeIntegerSchema,
  reason: requiredReasonSchema,
});

export const stockProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  stockQuantity: z.number().int().min(0),
  minimumStock: z.number().int().min(0),
  isActive: z.boolean(),
  isLowStock: z.boolean(),
});

export const stockMovementSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  userId: z.string().uuid(),
  userName: z.string(),
  type: stockMovementTypeSchema,
  quantity: z.number().int(),
  reason: z.string().nullable(),
  createdAt: z.string(),
});

export const stockPageResponseSchema = z.object({
  products: z.array(stockProductSchema),
  movements: z.array(stockMovementSchema),
  summary: z.object({
    totalProducts: z.number().int().min(0),
    lowStockProducts: z.number().int().min(0),
    totalUnits: z.number().int().min(0),
  }),
});

export const stockMutationResponseSchema = z.object({
  product: stockProductSchema,
  movement: stockMovementSchema,
});

export type StockMovementType = z.infer<typeof stockMovementTypeSchema>;
export type StockEntryInput = z.infer<typeof stockEntrySchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
export type StockProductResponse = z.infer<typeof stockProductSchema>;
export type StockMovementResponse = z.infer<typeof stockMovementSchema>;
export type StockPageResponse = z.infer<typeof stockPageResponseSchema>;
export type StockMutationResponse = z.infer<typeof stockMutationResponseSchema>;

export function getStockMovementTypeLabel(type: StockMovementType) {
  const labels: Record<StockMovementType, string> = {
    IN: "Entrada",
    OUT: "Saida",
    ADJUSTMENT: "Ajuste",
    SALE: "Venda",
    CANCELED_SALE: "Venda cancelada",
  };

  return labels[type];
}
```

Modify `packages/shared/src/index.ts`:

```ts
export * from "./auth";
export * from "./products";
export * from "./stock";
```

- [ ] **Step 4: Run shared tests**

Run: `pnpm --filter shared test -- src/stock.test.ts`

Expected: PASS.

- [ ] **Step 5: Run shared typecheck**

Run: `pnpm --filter shared typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/index.ts packages/shared/src/stock.ts packages/shared/src/stock.test.ts
git commit -m "feat: add stock shared contracts"
```

---

### Task 2: API Stock Repository and Service

**Files:**
- Modify: `apps/api/src/db/schema.ts`
- Create: `apps/api/src/modules/stock/stock.schemas.ts`
- Create: `apps/api/src/modules/stock/stock.repository.ts`
- Create: `apps/api/src/modules/stock/stock.repository.test.ts`
- Create: `apps/api/src/modules/stock/stock.service.ts`
- Create: `apps/api/src/modules/stock/stock.service.test.ts`

**Interfaces:**
- Consumes from Task 1: `stockEntrySchema`, `stockAdjustmentSchema`, `StockEntryInput`, `StockAdjustmentInput`, response types.
- Produces: `StockRepository.findStockProducts()`, `StockRepository.findRecentMovements(limit?)`, `StockRepository.createEntry(input, userId)`, `StockRepository.createAdjustment(input, userId)`, `StockService.getStockPage()`, `StockService.createEntry(user, input)`, `StockService.createAdjustment(user, input)`.

- [ ] **Step 1: Write failing service tests**

Create `apps/api/src/modules/stock/stock.service.test.ts`:

```ts
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { StockService } from "./stock.service";

const now = new Date("2026-06-17T00:00:00.000Z");
const adminUser = { id: "33333333-3333-4333-8333-333333333333", role: "ADMIN" as const };
const operatorUser = { id: "44444444-4444-4444-8444-444444444444", role: "OPERATOR" as const };

function makeProduct(overrides = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Galao 20L",
    stockQuantity: 2,
    minimumStock: 3,
    isActive: true,
    ...overrides,
  };
}

function makeMovement(overrides = {}) {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    productId: "11111111-1111-4111-8111-111111111111",
    userId: adminUser.id,
    type: "IN" as const,
    quantity: 5,
    reason: "Compra semanal",
    createdAt: now,
    product: { id: "11111111-1111-4111-8111-111111111111", name: "Galao 20L" },
    user: { id: adminUser.id, name: "Administrador" },
    ...overrides,
  };
}

class FakeStockRepository {
  products = [makeProduct()];
  movements = [makeMovement()];
  findStockProducts = vi.fn(async () => this.products);
  findRecentMovements = vi.fn(async () => this.movements);
  createEntry = vi.fn(async () => ({ product: makeProduct({ stockQuantity: 7 }), movement: makeMovement() }));
  createAdjustment = vi.fn(async () => ({ product: makeProduct({ stockQuantity: 10 }), movement: makeMovement({ type: "ADJUSTMENT" as const, quantity: 8 }) }));
}

describe("StockService", () => {
  it("lists products, low-stock summary, total units and movements", async () => {
    const service = new StockService(new FakeStockRepository() as never);

    const result = await service.getStockPage();

    expect(result.summary).toEqual({ totalProducts: 1, lowStockProducts: 1, totalUnits: 2 });
    expect(result.products[0]?.isLowStock).toBe(true);
    expect(result.movements[0]?.createdAt).toBe("2026-06-17T00:00:00.000Z");
  });

  it("allows admins to create stock entries", async () => {
    const repository = new FakeStockRepository();
    const service = new StockService(repository as never);

    await service.createEntry(adminUser, {
      productId: "11111111-1111-4111-8111-111111111111",
      quantity: 5,
      reason: "Compra semanal",
    });

    expect(repository.createEntry).toHaveBeenCalledWith(
      {
        productId: "11111111-1111-4111-8111-111111111111",
        quantity: 5,
        reason: "Compra semanal",
      },
      adminUser.id,
    );
  });

  it("blocks operators from creating stock entries", async () => {
    const service = new StockService(new FakeStockRepository() as never);

    await expect(
      service.createEntry(operatorUser, {
        productId: "11111111-1111-4111-8111-111111111111",
        quantity: 5,
        reason: "Compra semanal",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows admins to create absolute stock adjustments", async () => {
    const repository = new FakeStockRepository();
    const service = new StockService(repository as never);

    const result = await service.createAdjustment(adminUser, {
      productId: "11111111-1111-4111-8111-111111111111",
      newQuantity: 10,
      reason: "Conferencia fisica",
    });

    expect(repository.createAdjustment).toHaveBeenCalledWith(
      {
        productId: "11111111-1111-4111-8111-111111111111",
        newQuantity: 10,
        reason: "Conferencia fisica",
      },
      adminUser.id,
    );
    expect(result.movement.type).toBe("ADJUSTMENT");
  });

  it("throws not found when repository cannot find product for entry", async () => {
    const repository = new FakeStockRepository();
    repository.createEntry.mockResolvedValueOnce(null);
    const service = new StockService(repository as never);

    await expect(
      service.createEntry(adminUser, {
        productId: "11111111-1111-4111-8111-111111111111",
        quantity: 5,
        reason: "Compra semanal",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 2: Run service test to verify it fails**

Run: `pnpm --filter api test -- src/modules/stock/stock.service.test.ts`

Expected: FAIL because `stock.service.ts` does not exist.

- [ ] **Step 3: Write failing repository transaction tests**

Create `apps/api/src/modules/stock/stock.repository.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const product = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Galao 20L",
  stockQuantity: 2,
  minimumStock: 3,
  isActive: true,
};

const movement = {
  id: "22222222-2222-4222-8222-222222222222",
  productId: product.id,
  userId: "33333333-3333-4333-8333-333333333333",
  type: "IN",
  quantity: 5,
  reason: "Compra semanal",
  referenceId: null,
  createdAt: new Date("2026-06-17T00:00:00.000Z"),
};

describe("StockRepository", () => {
  beforeEach(() => vi.resetModules());

  it("creates stock entry in a transaction", async () => {
    const productReturning = vi.fn(async () => [{ ...product, stockQuantity: 7 }]);
    const movementReturning = vi.fn(async () => [movement]);
    const set = vi.fn(() => ({ where: vi.fn(() => ({ returning: productReturning })) }));
    const values = vi.fn(() => ({ returning: movementReturning }));
    const update = vi.fn(() => ({ set }));
    const insert = vi.fn(() => ({ values }));
    const transaction = vi.fn(async (callback) =>
      callback({
        update,
        insert,
        query: { products: { findFirst: vi.fn(async () => product) } },
      }),
    );

    vi.doMock("../../db", () => ({ db: { transaction } }));
    const { StockRepository } = await import("./stock.repository");

    const result = await new StockRepository().createEntry(
      { productId: product.id, quantity: 5, reason: "Compra semanal" },
      "33333333-3333-4333-8333-333333333333",
    );

    expect(transaction).toHaveBeenCalledOnce();
    expect(set).toHaveBeenCalledWith({ stockQuantity: 7, updatedAt: expect.any(Date) });
    expect(values).toHaveBeenCalledWith({
      productId: product.id,
      userId: "33333333-3333-4333-8333-333333333333",
      type: "IN",
      quantity: 5,
      reason: "Compra semanal",
      referenceId: null,
    });
    expect(result?.product.stockQuantity).toBe(7);
  });

  it("creates absolute adjustment using delta quantity", async () => {
    const adjustedProduct = { ...product, stockQuantity: 10 };
    const productReturning = vi.fn(async () => [adjustedProduct]);
    const movementReturning = vi.fn(async () => [{ ...movement, type: "ADJUSTMENT", quantity: 8, reason: "Conferencia fisica" }]);
    const set = vi.fn(() => ({ where: vi.fn(() => ({ returning: productReturning })) }));
    const values = vi.fn(() => ({ returning: movementReturning }));
    const update = vi.fn(() => ({ set }));
    const insert = vi.fn(() => ({ values }));
    const transaction = vi.fn(async (callback) =>
      callback({
        update,
        insert,
        query: { products: { findFirst: vi.fn(async () => product) } },
      }),
    );

    vi.doMock("../../db", () => ({ db: { transaction } }));
    const { StockRepository } = await import("./stock.repository");

    const result = await new StockRepository().createAdjustment(
      { productId: product.id, newQuantity: 10, reason: "Conferencia fisica" },
      "33333333-3333-4333-8333-333333333333",
    );

    expect(set).toHaveBeenCalledWith({ stockQuantity: 10, updatedAt: expect.any(Date) });
    expect(values).toHaveBeenCalledWith({
      productId: product.id,
      userId: "33333333-3333-4333-8333-333333333333",
      type: "ADJUSTMENT",
      quantity: 8,
      reason: "Conferencia fisica",
      referenceId: null,
    });
    expect(result?.movement.quantity).toBe(8);
  });
});
```

- [ ] **Step 4: Run repository test to verify it fails**

Run: `pnpm --filter api test -- src/modules/stock/stock.repository.test.ts`

Expected: FAIL because `stock.repository.ts` does not exist.

- [ ] **Step 5: Add stock schema exports and DB relation**

Create `apps/api/src/modules/stock/stock.schemas.ts`:

```ts
export { stockAdjustmentSchema, stockEntrySchema } from "shared";
export type { StockAdjustmentInput, StockEntryInput, StockMovementResponse, StockMutationResponse, StockPageResponse, StockProductResponse } from "shared";
```

Modify `apps/api/src/db/schema.ts` after `saleItemsRelations`:

```ts
export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [stockMovements.userId],
    references: [users.id],
  }),
}));
```

- [ ] **Step 6: Implement stock repository**

Create `apps/api/src/modules/stock/stock.repository.ts`:

```ts
import { Injectable } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";

import { db } from "../../db";
import { products, stockMovements } from "../../db/schema";
import type { StockAdjustmentInput, StockEntryInput } from "./stock.schemas";

export type StockProductRow = typeof products.$inferSelect;
export type StockMovementRow = typeof stockMovements.$inferSelect & {
  product: { id: string; name: string };
  user: { id: string; name: string };
};
export type StockMutationRow = { product: StockProductRow; movement: StockMovementRow };

@Injectable()
export class StockRepository {
  findStockProducts() {
    return db.query.products.findMany({
      orderBy: [products.name],
    });
  }

  findRecentMovements(limit = 20) {
    return db.query.stockMovements.findMany({
      orderBy: [desc(stockMovements.createdAt)],
      limit,
      with: {
        product: { columns: { id: true, name: true } },
        user: { columns: { id: true, name: true } },
      },
    });
  }

  async createEntry(input: StockEntryInput, userId: string): Promise<StockMutationRow | null> {
    return db.transaction(async (tx) => {
      const product = await tx.query.products.findFirst({ where: eq(products.id, input.productId) });

      if (!product) {
        return null;
      }

      const [updatedProduct] = await tx
        .update(products)
        .set({ stockQuantity: product.stockQuantity + input.quantity, updatedAt: new Date() })
        .where(eq(products.id, input.productId))
        .returning();

      const [movement] = await tx
        .insert(stockMovements)
        .values({
          productId: input.productId,
          userId,
          type: "IN",
          quantity: input.quantity,
          reason: input.reason,
          referenceId: null,
        })
        .returning();

      return {
        product: updatedProduct,
        movement: { ...movement, product: { id: updatedProduct.id, name: updatedProduct.name }, user: { id: userId, name: "" } },
      };
    });
  }

  async createAdjustment(input: StockAdjustmentInput, userId: string): Promise<StockMutationRow | null> {
    return db.transaction(async (tx) => {
      const product = await tx.query.products.findFirst({ where: eq(products.id, input.productId) });

      if (!product) {
        return null;
      }

      const delta = input.newQuantity - product.stockQuantity;
      const [updatedProduct] = await tx
        .update(products)
        .set({ stockQuantity: input.newQuantity, updatedAt: new Date() })
        .where(eq(products.id, input.productId))
        .returning();

      const [movement] = await tx
        .insert(stockMovements)
        .values({
          productId: input.productId,
          userId,
          type: "ADJUSTMENT",
          quantity: delta,
          reason: input.reason,
          referenceId: null,
        })
        .returning();

      return {
        product: updatedProduct,
        movement: { ...movement, product: { id: updatedProduct.id, name: updatedProduct.name }, user: { id: userId, name: "" } },
      };
    });
  }

  findMovementById(id: string) {
    return db.query.stockMovements.findFirst({
      where: eq(stockMovements.id, id),
      with: {
        product: { columns: { id: true, name: true } },
        user: { columns: { id: true, name: true } },
      },
    });
  }
}
```

After implementation, remove unused imports such as `sql` if TypeScript or ESLint reports them.

- [ ] **Step 7: Implement stock service**

Create `apps/api/src/modules/stock/stock.service.ts`:

```ts
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { SessionUser } from "shared";

import { stockAdjustmentSchema, stockEntrySchema, type StockAdjustmentInput, type StockEntryInput, type StockMovementResponse, type StockMutationResponse, type StockPageResponse, type StockProductResponse } from "./stock.schemas";
import { StockRepository, type StockMovementRow, type StockProductRow } from "./stock.repository";

type PermissionUser = Pick<SessionUser, "id" | "role">;

@Injectable()
export class StockService {
  constructor(private readonly stockRepository: StockRepository) {}

  async getStockPage(): Promise<StockPageResponse> {
    const products = (await this.stockRepository.findStockProducts()).map((product) => this.toProductResponse(product));
    const movements = (await this.stockRepository.findRecentMovements()).map((movement) => this.toMovementResponse(movement));

    return {
      products,
      movements,
      summary: {
        totalProducts: products.length,
        lowStockProducts: products.filter((product) => product.isLowStock).length,
        totalUnits: products.reduce((sum, product) => sum + product.stockQuantity, 0),
      },
    };
  }

  async createEntry(user: PermissionUser, input: StockEntryInput): Promise<StockMutationResponse> {
    this.requireAdmin(user);
    const safeInput = stockEntrySchema.parse(input);
    const result = await this.stockRepository.createEntry(safeInput, user.id);

    if (!result) {
      throw new NotFoundException("Produto nao encontrado.");
    }

    const movement = await this.stockRepository.findMovementById(result.movement.id);

    return {
      product: this.toProductResponse(result.product),
      movement: this.toMovementResponse(movement ?? result.movement),
    };
  }

  async createAdjustment(user: PermissionUser, input: StockAdjustmentInput): Promise<StockMutationResponse> {
    this.requireAdmin(user);
    const safeInput = stockAdjustmentSchema.parse(input);
    const result = await this.stockRepository.createAdjustment(safeInput, user.id);

    if (!result) {
      throw new NotFoundException("Produto nao encontrado.");
    }

    const movement = await this.stockRepository.findMovementById(result.movement.id);

    return {
      product: this.toProductResponse(result.product),
      movement: this.toMovementResponse(movement ?? result.movement),
    };
  }

  private requireAdmin(user: PermissionUser) {
    if (user.role !== "ADMIN") {
      throw new ForbiddenException("Voce nao tem permissao para alterar estoque.");
    }
  }

  private toProductResponse(product: StockProductRow): StockProductResponse {
    return {
      id: product.id,
      name: product.name,
      stockQuantity: product.stockQuantity,
      minimumStock: product.minimumStock,
      isActive: product.isActive,
      isLowStock: product.stockQuantity <= product.minimumStock,
    };
  }

  private toMovementResponse(movement: StockMovementRow): StockMovementResponse {
    return {
      id: movement.id,
      productId: movement.productId,
      productName: movement.product.name,
      userId: movement.userId,
      userName: movement.user.name,
      type: movement.type,
      quantity: movement.quantity,
      reason: movement.reason,
      createdAt: movement.createdAt.toISOString(),
    };
  }
}
```

- [ ] **Step 8: Run API stock service/repository tests**

Run: `pnpm --filter api test -- src/modules/stock/stock.service.test.ts src/modules/stock/stock.repository.test.ts`

Expected: PASS. If mocked repository rows need `product` and `user`, update the fake test rows exactly to match `StockMovementRow`.

- [ ] **Step 9: Run API typecheck**

Run: `pnpm --filter api typecheck`

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/db/schema.ts apps/api/src/modules/stock/stock.schemas.ts apps/api/src/modules/stock/stock.repository.ts apps/api/src/modules/stock/stock.repository.test.ts apps/api/src/modules/stock/stock.service.ts apps/api/src/modules/stock/stock.service.test.ts
git commit -m "feat: add stock service"
```

---

### Task 3: API Stock Controller and Module Wiring

**Files:**
- Create: `apps/api/src/modules/stock/stock.controller.ts`
- Create: `apps/api/src/modules/stock/stock.controller.test.ts`
- Create: `apps/api/src/modules/stock/stock.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes from Task 2: `StockService.getStockPage()`, `StockService.createEntry(user, input)`, `StockService.createAdjustment(user, input)`.
- Produces: Nest endpoints `GET /stock`, `POST /stock/entries`, `POST /stock/adjustments`.

- [ ] **Step 1: Write failing controller tests**

Create `apps/api/src/modules/stock/stock.controller.test.ts`:

```ts
import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { StockController } from "./stock.controller";

const user = { id: "33333333-3333-4333-8333-333333333333", name: "Administrador", email: "admin@planetaagua.local", role: "ADMIN" as const };

function makeRequest() {
  return { cookies: { planeta_agua_session: "valid" } };
}

describe("StockController", () => {
  it("lists stock for authenticated users", async () => {
    const authService = { getUserByToken: vi.fn(async () => user) };
    const stockService = { getStockPage: vi.fn(async () => ({ products: [], movements: [], summary: { totalProducts: 0, lowStockProducts: 0, totalUnits: 0 } })) };
    const controller = new StockController(authService as never, stockService as never);

    await controller.list(makeRequest() as never);

    expect(stockService.getStockPage).toHaveBeenCalledOnce();
  });

  it("creates entries with the authenticated user", async () => {
    const authService = { getUserByToken: vi.fn(async () => user) };
    const stockService = { createEntry: vi.fn(async () => ({ product: {}, movement: {} })) };
    const controller = new StockController(authService as never, stockService as never);

    await controller.createEntry(makeRequest() as never, {
      productId: "11111111-1111-4111-8111-111111111111",
      quantity: 5,
      reason: "Compra semanal",
    });

    expect(stockService.createEntry).toHaveBeenCalledWith(user, {
      productId: "11111111-1111-4111-8111-111111111111",
      quantity: 5,
      reason: "Compra semanal",
    });
  });

  it("rejects invalid entry payload", async () => {
    const authService = { getUserByToken: vi.fn(async () => user) };
    const stockService = { createEntry: vi.fn() };
    const controller = new StockController(authService as never, stockService as never);

    await expect(controller.createEntry(makeRequest() as never, { productId: "invalid", quantity: 0, reason: "" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects invalid adjustment payload", async () => {
    const authService = { getUserByToken: vi.fn(async () => user) };
    const stockService = { createAdjustment: vi.fn() };
    const controller = new StockController(authService as never, stockService as never);

    await expect(controller.createAdjustment(makeRequest() as never, { productId: "invalid", newQuantity: -1, reason: "" })).rejects.toBeInstanceOf(BadRequestException);
  });
});
```

- [ ] **Step 2: Run controller tests to verify they fail**

Run: `pnpm --filter api test -- src/modules/stock/stock.controller.test.ts`

Expected: FAIL because `stock.controller.ts` does not exist.

- [ ] **Step 3: Implement stock controller**

Create `apps/api/src/modules/stock/stock.controller.ts`:

```ts
import { BadRequestException, Body, Controller, Get, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";

import { AuthService } from "../auth/auth.service";
import { requireRequestUser } from "../auth/current-user";
import { stockAdjustmentSchema, stockEntrySchema } from "./stock.schemas";
import { StockService } from "./stock.service";

function parseStockBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);

  if (!result.success) {
    throw new BadRequestException("Dados do estoque invalidos.");
  }

  return result.data;
}

@Controller("stock")
export class StockController {
  constructor(
    private readonly authService: AuthService,
    private readonly stockService: StockService,
  ) {}

  @Get()
  async list(@Req() request: Request) {
    await requireRequestUser(request, this.authService);
    return this.stockService.getStockPage();
  }

  @Post("entries")
  async createEntry(@Req() request: Request, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    const input = parseStockBody(stockEntrySchema, body);

    return this.stockService.createEntry(user, input);
  }

  @Post("adjustments")
  async createAdjustment(@Req() request: Request, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    const input = parseStockBody(stockAdjustmentSchema, body);

    return this.stockService.createAdjustment(user, input);
  }
}
```

- [ ] **Step 4: Implement module wiring**

Create `apps/api/src/modules/stock/stock.module.ts`:

```ts
import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { StockController } from "./stock.controller";
import { StockRepository } from "./stock.repository";
import { StockService } from "./stock.service";

@Module({
  imports: [AuthModule],
  controllers: [StockController],
  providers: [StockRepository, StockService],
})
export class StockModule {}
```

Modify `apps/api/src/app.module.ts`:

```ts
import { Module } from "@nestjs/common";

import { HealthModule } from "./health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ProductsModule } from "./modules/products/products.module";
import { StockModule } from "./modules/stock/stock.module";

@Module({
  imports: [HealthModule, AuthModule, ProductsModule, StockModule],
})
export class AppModule {}
```

- [ ] **Step 5: Run API stock tests**

Run: `pnpm --filter api test -- src/modules/stock`

Expected: PASS.

- [ ] **Step 6: Run API typecheck**

Run: `pnpm --filter api typecheck`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/app.module.ts apps/api/src/modules/stock/stock.controller.ts apps/api/src/modules/stock/stock.controller.test.ts apps/api/src/modules/stock/stock.module.ts
git commit -m "feat: expose stock api"
```

---

### Task 4: Web Stock API Proxies and Helpers

**Files:**
- Create: `apps/web/src/lib/stock.ts`
- Create: `apps/web/src/lib/stock.test.ts`
- Create: `apps/web/src/app/api/stock/route.ts`
- Create: `apps/web/src/app/api/stock/entries/route.ts`
- Create: `apps/web/src/app/api/stock/adjustments/route.ts`

**Interfaces:**
- Consumes from Task 1: `stockEntrySchema`, `stockAdjustmentSchema`, `stockPageResponseSchema`, `StockPageResponse`.
- Produces: `fetchStockPage(cookieHeader)`, `stockEntryFormToPayload(formData)`, `stockAdjustmentFormToPayload(formData)` and same-origin stock proxies.

- [ ] **Step 1: Write failing web helper tests**

Create `apps/web/src/lib/stock.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { stockAdjustmentFormToPayload, stockEntryFormToPayload } from "./stock";

describe("stock web helpers", () => {
  it("converts stock entry form data to payload", () => {
    const formData = new FormData();
    formData.set("productId", "11111111-1111-4111-8111-111111111111");
    formData.set("quantity", "5");
    formData.set("reason", "Compra semanal");

    expect(stockEntryFormToPayload(formData)).toEqual({
      productId: "11111111-1111-4111-8111-111111111111",
      quantity: 5,
      reason: "Compra semanal",
    });
  });

  it("rejects entry form data with blank reason", () => {
    const formData = new FormData();
    formData.set("productId", "11111111-1111-4111-8111-111111111111");
    formData.set("quantity", "5");
    formData.set("reason", "");

    expect(() => stockEntryFormToPayload(formData)).toThrow();
  });

  it("converts absolute adjustment form data to payload", () => {
    const formData = new FormData();
    formData.set("productId", "11111111-1111-4111-8111-111111111111");
    formData.set("newQuantity", "0");
    formData.set("reason", "Conferencia fisica");

    expect(stockAdjustmentFormToPayload(formData)).toEqual({
      productId: "11111111-1111-4111-8111-111111111111",
      newQuantity: 0,
      reason: "Conferencia fisica",
    });
  });
});
```

- [ ] **Step 2: Run web helper tests to verify they fail**

Run: `pnpm --filter web test -- src/lib/stock.test.ts`

Expected: FAIL because `apps/web/src/lib/stock.ts` does not exist.

- [ ] **Step 3: Implement web stock helpers**

Create `apps/web/src/lib/stock.ts`:

```ts
import { stockAdjustmentSchema, stockEntrySchema, stockPageResponseSchema, type StockPageResponse } from "shared";

import { getServerApiUrl } from "./api";

const emptyStockPageResponse: StockPageResponse = {
  products: [],
  movements: [],
  summary: { totalProducts: 0, lowStockProducts: 0, totalUnits: 0 },
};

export function stockEntryFormToPayload(formData: FormData) {
  return stockEntrySchema.parse({
    productId: String(formData.get("productId") ?? ""),
    quantity: String(formData.get("quantity") ?? ""),
    reason: String(formData.get("reason") ?? ""),
  });
}

export function stockAdjustmentFormToPayload(formData: FormData) {
  return stockAdjustmentSchema.parse({
    productId: String(formData.get("productId") ?? ""),
    newQuantity: String(formData.get("newQuantity") ?? ""),
    reason: String(formData.get("reason") ?? ""),
  });
}

export async function fetchStockPage(cookieHeader: string): Promise<StockPageResponse> {
  const response = await fetch(`${getServerApiUrl()}/stock`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!response.ok) {
    return emptyStockPageResponse;
  }

  return stockPageResponseSchema.parse(await response.json());
}
```

- [ ] **Step 4: Implement stock proxy helper inline in route files**

Create `apps/web/src/app/api/stock/route.ts`:

```ts
import { NextResponse } from "next/server";

import { getServerApiUrl } from "@/lib/api";

export async function GET(request: Request) {
  const response = await fetch(`${getServerApiUrl()}/stock`, {
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}
```

Create `apps/web/src/app/api/stock/entries/route.ts`:

```ts
import { NextResponse } from "next/server";

import { getServerApiUrl } from "@/lib/api";

export async function POST(request: Request) {
  const response = await fetch(`${getServerApiUrl()}/stock/entries`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: request.headers.get("cookie") ?? "",
    },
    body: await request.text(),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}
```

Create `apps/web/src/app/api/stock/adjustments/route.ts`:

```ts
import { NextResponse } from "next/server";

import { getServerApiUrl } from "@/lib/api";

export async function POST(request: Request) {
  const response = await fetch(`${getServerApiUrl()}/stock/adjustments`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: request.headers.get("cookie") ?? "",
    },
    body: await request.text(),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}
```

- [ ] **Step 5: Run web helper tests and typecheck**

Run: `pnpm --filter web test -- src/lib/stock.test.ts`

Expected: PASS.

Run: `pnpm --filter web typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/stock.ts apps/web/src/lib/stock.test.ts apps/web/src/app/api/stock
git commit -m "feat: add stock web api helpers"
```

---

### Task 5: Stock Page UI

**Files:**
- Create: `apps/web/src/app/(app)/estoque/page.tsx`
- Create: `apps/web/src/app/(app)/estoque/stock-ui.tsx`
- Create: `apps/web/src/app/(app)/estoque/stock-ui.test.tsx`

**Interfaces:**
- Consumes from Task 4: `fetchStockPage`, `stockEntryFormToPayload`, `stockAdjustmentFormToPayload`.
- Consumes from Task 1: `StockPageResponse`, `StockProductResponse`, `UserRole`, `getStockMovementTypeLabel`.
- Produces: protected `/estoque` page with read-only view for operators and mutation controls for admins.

- [ ] **Step 1: Write failing UI tests**

Create `apps/web/src/app/(app)/estoque/stock-ui.test.tsx`:

```tsx
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { StockUi } from "./stock-ui";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}));

const stockPage = {
  products: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Galao 20L",
      stockQuantity: 2,
      minimumStock: 3,
      isActive: true,
      isLowStock: true,
    },
  ],
  movements: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      productId: "11111111-1111-4111-8111-111111111111",
      productName: "Galao 20L",
      userId: "33333333-3333-4333-8333-333333333333",
      userName: "Administrador",
      type: "IN" as const,
      quantity: 5,
      reason: "Compra semanal",
      createdAt: "2026-06-17T00:00:00.000Z",
    },
  ],
  summary: { totalProducts: 1, lowStockProducts: 1, totalUnits: 2 },
};

describe("StockUi", () => {
  it("hides mutation controls from operators", () => {
    const html = renderToStaticMarkup(createElement(StockUi, { userRole: "OPERATOR", data: stockPage }));

    expect(html).toContain("Galao 20L");
    expect(html).toContain("Estoque baixo");
    expect(html).toContain("Compra semanal");
    expect(html).not.toContain("Registrar entrada");
    expect(html).not.toContain("Registrar ajuste");
  });

  it("shows mutation controls to admins", () => {
    const html = renderToStaticMarkup(createElement(StockUi, { userRole: "ADMIN", data: stockPage }));

    expect(html).toContain("Registrar entrada");
    expect(html).toContain("Registrar ajuste");
    expect(html).toContain("Motivo");
  });
});
```

- [ ] **Step 2: Run UI tests to verify they fail**

Run: `pnpm --filter web test -- "src/app/(app)/estoque/stock-ui.test.tsx"`

Expected: FAIL because `stock-ui.tsx` does not exist.

- [ ] **Step 3: Implement protected stock page**

Create `apps/web/src/app/(app)/estoque/page.tsx`:

```tsx
import { cookies } from "next/headers";

import { requireUser } from "@/lib/auth";
import { fetchStockPage } from "@/lib/stock";

import { StockUi } from "./stock-ui";

export default async function StockPage() {
  const user = await requireUser();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  const data = await fetchStockPage(cookieHeader);

  return <StockUi userRole={user.role} data={data} />;
}
```

- [ ] **Step 4: Implement stock UI**

Create `apps/web/src/app/(app)/estoque/stock-ui.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getStockMovementTypeLabel, type StockPageResponse, type UserRole } from "shared";

import { stockAdjustmentFormToPayload, stockEntryFormToPayload } from "@/lib/stock";

type StockUiProps = {
  userRole: UserRole;
  data: StockPageResponse;
};

export function StockUi({ userRole, data }: StockUiProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isAdmin = userRole === "ADMIN";

  function refreshStock() {
    startTransition(() => router.refresh());
  }

  async function submitEntry(formData: FormData) {
    if (!isAdmin || isSaving) return;
    setError(null);
    setIsSaving(true);

    try {
      const payload = stockEntryFormToPayload(formData);
      const response = await fetch("/api/stock/entries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setError("Confira produto, quantidade e motivo da entrada.");
        return;
      }

      refreshStock();
    } catch {
      setError("Confira produto, quantidade e motivo da entrada.");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitAdjustment(formData: FormData) {
    if (!isAdmin || isSaving) return;
    setError(null);
    setIsSaving(true);

    try {
      const payload = stockAdjustmentFormToPayload(formData);
      const response = await fetch("/api/stock/adjustments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setError("Confira produto, quantidade final e motivo do ajuste.");
        return;
      }

      refreshStock();
    } catch {
      setError("Confira produto, quantidade final e motivo do ajuste.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-[#626260]">Estoque</p>
        <h1 className="mt-2 text-4xl font-medium tracking-[-0.8px]">Controle de estoque</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#626260]">Consulte saldo, acompanhe movimentacoes e registre entradas ou ajustes com rastreabilidade.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Produtos" value={data.summary.totalProducts} />
        <SummaryCard label="Estoque baixo" value={data.summary.lowStockProducts} />
        <SummaryCard label="Unidades em estoque" value={data.summary.totalUnits} />
      </div>

      {error ? (
        <p aria-live="polite" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {isAdmin ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <StockForm title="Registrar entrada" quantityName="quantity" quantityLabel="Quantidade de entrada" submitLabel="Salvar entrada" products={data.products} action={submitEntry} disabled={isSaving || isPending} />
          <StockForm title="Registrar ajuste" quantityName="newQuantity" quantityLabel="Quantidade final" submitLabel="Salvar ajuste" products={data.products} action={submitAdjustment} disabled={isSaving || isPending} />
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-2xl border border-[#d3cec6] bg-white">
          {data.products.length === 0 ? <p className="p-5 text-sm text-[#626260]">Nenhum produto cadastrado.</p> : null}
          {data.products.map((product) => (
            <article className="grid gap-3 border-b border-[#ebe7e1] p-5 last:border-b-0 md:grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr] md:items-center" key={product.id}>
              <div>
                <h2 className="text-lg font-medium">{product.name}</h2>
                <p className="text-sm text-[#626260]">{product.isActive ? "Ativo" : "Inativo"}</p>
              </div>
              <p className="text-sm"><span className="text-[#626260]">Atual</span><br />{product.stockQuantity}</p>
              <p className="text-sm"><span className="text-[#626260]">Minimo</span><br />{product.minimumStock}</p>
              <div>{product.isLowStock ? <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">Estoque baixo</span> : <span className="rounded-full bg-[#f5f1ec] px-3 py-1 text-xs font-medium">OK</span>}</div>
            </article>
          ))}
        </div>

        <div className="rounded-2xl border border-[#d3cec6] bg-white p-5">
          <h2 className="text-lg font-medium">Movimentacoes recentes</h2>
          <div className="mt-4 space-y-4">
            {data.movements.length === 0 ? <p className="text-sm text-[#626260]">Nenhuma movimentacao registrada.</p> : null}
            {data.movements.map((movement) => (
              <article className="border-b border-[#ebe7e1] pb-4 last:border-b-0 last:pb-0" key={movement.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium">{movement.productName}</h3>
                    <p className="text-xs text-[#626260]">{getStockMovementTypeLabel(movement.type)} por {movement.userName}</p>
                  </div>
                  <strong className={movement.quantity < 0 ? "text-sm text-red-700" : "text-sm text-green-700"}>{movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}</strong>
                </div>
                <p className="mt-2 text-sm text-[#626260]">{movement.reason ?? "Sem motivo informado"}</p>
                <p className="mt-1 text-xs text-[#9c9fa5]">{new Date(movement.createdAt).toLocaleString("pt-BR")}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StockForm({ title, quantityName, quantityLabel, submitLabel, products, action, disabled }: { title: string; quantityName: "quantity" | "newQuantity"; quantityLabel: string; submitLabel: string; products: StockPageResponse["products"]; action: (formData: FormData) => void | Promise<void>; disabled: boolean }) {
  return (
    <form action={action} className="grid gap-4 rounded-2xl border border-[#d3cec6] bg-white p-5">
      <h2 className="text-lg font-medium">{title}</h2>
      <label className="space-y-2">
        <span className="text-sm font-medium">Produto</span>
        <select className="h-11 w-full rounded-lg border border-[#d3cec6] px-3" name="productId" required>
          {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
        </select>
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium">{quantityLabel}</span>
        <input className="h-11 w-full rounded-lg border border-[#d3cec6] px-3" min="0" name={quantityName} required type="number" />
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium">Motivo</span>
        <textarea className="min-h-20 w-full rounded-lg border border-[#d3cec6] px-3 py-2" name="reason" required />
      </label>
      <button className="rounded-lg bg-[#111111] px-4 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={disabled} type="submit">{disabled ? "Salvando..." : submitLabel}</button>
    </form>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-2xl border border-[#d3cec6] bg-white p-5">
      <p className="text-sm text-[#626260]">{label}</p>
      <strong className="mt-3 block text-3xl font-medium">{value}</strong>
    </article>
  );
}
```

- [ ] **Step 5: Run UI tests and web typecheck**

Run: `pnpm --filter web test -- "src/app/(app)/estoque/stock-ui.test.tsx"`

Expected: PASS.

Run: `pnpm --filter web typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add "apps/web/src/app/(app)/estoque"
git commit -m "feat: add stock page"
```

---

### Task 6: Final Verification and Smoke Test

**Files:**
- No new source files.
- Verify committed changes from Tasks 1-5.

**Interfaces:**
- Consumes all stock contracts, API routes, web proxies, and UI from Tasks 1-5.
- Produces verified stock module ready for manual testing and final commit/push only when requested.

- [ ] **Step 1: Run package tests**

Run these commands:

```bash
pnpm --filter shared test
pnpm --filter api test
pnpm --filter web test
```

Expected:

- Shared tests pass, including `src/stock.test.ts`.
- API tests pass, including `src/modules/stock`.
- Web tests pass, including `/estoque` UI and `src/lib/stock.test.ts`.

- [ ] **Step 2: Run typecheck, lint, build sequentially**

Run commands sequentially, not in parallel, to avoid `.next/types` races:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

Expected: all pass. If `pnpm build` fails with `EPERM` under `apps/web/.next` on Windows/OneDrive, stop local `pnpm dev`/Next processes that are locking `.next`, then rerun `pnpm build`.

- [ ] **Step 3: Confirm web has no direct database dependency**

Run:

```bash
rg "drizzle|postgres|@/db|src/db|db/schema" apps/web/src apps/web/package.json
```

Expected: no matches.

- [ ] **Step 4: Smoke test locally**

Run:

```bash
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Manual checks:

- Login as admin.
- Open `http://localhost:3000/estoque`.
- Confirm stock summary and product list render.
- Register entry `+5` with reason `Compra semanal`.
- Confirm stock increases and recent movement shows type `Entrada` with `+5`.
- Register adjustment with final quantity `0` and reason `Conferencia fisica`.
- Confirm stock becomes `0` and recent movement shows type `Ajuste` with the correct delta.
- Login as operator.
- Confirm stock and movement history render.
- Confirm entry and adjustment forms are hidden.

- [ ] **Step 5: Review git diff**

Run:

```bash
git status --short
git diff --stat
```

Expected: only intended stock module files are changed.

- [ ] **Step 6: Do not commit or push unless requested**

If verification passes, report:

```text
Stock module implemented and verified. Changes are local and ready for review/commit.
```
