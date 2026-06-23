# Customer Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the Customers MVP module with CRUD, bottle lifecycle tracking, expiration alerts, and sales integration.

**Architecture:** New `CustomerModule` in Nest following the existing pattern (repository/service/controller). Shared contracts in `packages/shared`. Web UI follows the existing dense table + drawer pattern from Products/Stock.

**Tech Stack:** NestJS, Drizzle ORM, Zod, Next.js App Router, Vitest, React Testing Library

## Global Constraints

- Monorepo: `apps/web` (Next), `apps/api` (Nest), `packages/shared`
- Next does not access DB directly; all DB operations go through API
- All money values in integer cents
- Never physically delete records with operational history
- Values in `packages/shared` must be rebuilt after changes (`pnpm --filter shared build`)
- Follow existing patterns: repository/service/controller/module per feature
- Tests: Vitest for API, React Testing Library for web
- Run `pnpm run typecheck && pnpm run lint && pnpm run build` after implementation

---

### Task 1: Shared Contracts for Customers

**Files:**
- Create: `packages/shared/src/customers.ts`
- Create: `packages/shared/src/customers.test.ts`
- Modify: `packages/shared/src/index.ts:1-5`

**Interfaces:**
- Consumes: nothing
- Produces: `createCustomerSchema`, `updateCustomerSchema`, `customerResponseSchema`, `customersListResponseSchema`, `customerBottleSchema`, `customerBottleResponseSchema`, `customerDetailResponseSchema`, `CustomerResponse`, `CustomersListResponse`, `CustomerBottle`, `CustomerBottleResponse`, `CustomerDetailResponse`, `CreateCustomerInput`, `UpdateCustomerInput`, `CreateCustomerBottleInput`, `UpdateCustomerBottleInput`, `calculateBottleExpiresAt()`, `isBottleNearExpiration()`, `isBottleExpired()`

- [ ] **Step 1: Write the failing test for bottle expiration helpers**

```ts
// packages/shared/src/customers.test.ts
import { describe, expect, it } from "vitest";

import { calculateBottleExpiresAt, isBottleNearExpiration, isBottleExpired } from "./customers";

describe("calculateBottleExpiresAt", () => {
  it("returns the last day of the month 3 years after the given month/year", () => {
    const result = calculateBottleExpiresAt(6, 2024);
    expect(result).toEqual(new Date("2027-06-30T23:59:59.999Z"));
  });

  it("handles February in a leap year", () => {
    const result = calculateBottleExpiresAt(2, 2024);
    expect(result).toEqual(new Date("2027-02-28T23:59:59.999Z"));
  });

  it("handles December", () => {
    const result = calculateBottleExpiresAt(12, 2025);
    expect(result).toEqual(new Date("2028-12-31T23:59:59.999Z"));
  });
});

describe("isBottleNearExpiration", () => {
  it("returns true when bottle expires within 30 days", () => {
    const expiresAt = new Date("2026-07-15T00:00:00.000Z");
    const now = new Date("2026-06-20T00:00:00.000Z");
    expect(isBottleNearExpiration(expiresAt, now)).toBe(true);
  });

  it("returns false when bottle expires after 30 days", () => {
    const expiresAt = new Date("2026-08-20T00:00:00.000Z");
    const now = new Date("2026-06-20T00:00:00.000Z");
    expect(isBottleNearExpiration(expiresAt, now)).toBe(false);
  });

  it("returns false when bottle already expired", () => {
    const expiresAt = new Date("2026-06-01T00:00:00.000Z");
    const now = new Date("2026-06-20T00:00:00.000Z");
    expect(isBottleNearExpiration(expiresAt, now)).toBe(false);
  });
});

describe("isBottleExpired", () => {
  it("returns true when bottle already expired", () => {
    const expiresAt = new Date("2026-06-01T00:00:00.000Z");
    const now = new Date("2026-06-20T00:00:00.000Z");
    expect(isBottleExpired(expiresAt, now)).toBe(true);
  });

  it("returns false when bottle not expired", () => {
    const expiresAt = new Date("2027-06-30T00:00:00.000Z");
    const now = new Date("2026-06-20T00:00:00.000Z");
    expect(isBottleExpired(expiresAt, now)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter shared test`
Expected: FAIL — module not found

- [ ] **Step 3: Write the shared contracts**

```ts
// packages/shared/src/customers.ts
import { z } from "zod";

const BOTTLE_VALIDITY_YEARS = 3;
const BOTTLE_EXPIRATION_ALERT_DAYS = 30;

export function calculateBottleExpiresAt(month: number, year: number): Date {
  const expiresYear = year + BOTTLE_VALIDITY_YEARS;
  const lastDay = new Date(Date.UTC(expiresYear, month, 0));
  lastDay.setUTCHours(23, 59, 59, 999);
  return lastDay;
}

export function isBottleNearExpiration(expiresAt: Date, now: Date): boolean {
  if (isBottleExpired(expiresAt, now)) {
    return false;
  }
  const diffMs = expiresAt.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= BOTTLE_EXPIRATION_ALERT_DAYS;
}

export function isBottleExpired(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() < now.getTime();
}

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

const notesSchema = z
  .string()
  .trim()
  .max(500)
  .nullable()
  .optional()
  .transform((value) => {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const addressSchema = z
  .string()
  .trim()
  .max(200)
  .nullable()
  .optional()
  .transform((value) => {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: phoneSchema,
  address: addressSchema,
  notes: notesSchema,
});

export const updateCustomerSchema = createCustomerSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0);

export const customerResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  notes: z.string().nullable(),
  isActive: z.boolean(),
  hasBottleAlert: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const customersListResponseSchema = z.object({
  customers: z.array(customerResponseSchema),
  summary: z.object({
    total: z.number().int().min(0),
    active: z.number().int().min(0),
    withAlert: z.number().int().min(0),
  }),
});

export const createCustomerBottleSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(new Date().getFullYear() + 1),
  notes: notesSchema,
});

export const updateCustomerBottleSchema = createCustomerBottleSchema.partial().strict().refine((value) => Object.keys(value).length > 0);

export const customerBottleResponseSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  saleId: z.string().uuid().nullable(),
  month: z.number().int().min(1).max(12),
  year: z.number().int(),
  notes: z.string().nullable(),
  isActive: z.boolean(),
  expiresAt: z.string(),
  isNearExpiration: z.boolean(),
  isExpired: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const customerBottleSchema = z.array(customerBottleResponseSchema);

const customerSaleItemSchema = z.object({
  id: z.string().uuid(),
  productNameSnapshot: z.string(),
  quantity: z.number().int().min(1),
  unitPriceCents: z.number().int().min(0),
  totalPriceCents: z.number().int().min(0),
});

const customerSaleSchema = z.object({
  id: z.string().uuid(),
  totalAmountCents: z.number().int().min(0),
  paymentMethod: z.enum(["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD", "OTHER"]),
  status: z.enum(["COMPLETED", "CANCELED", "PENDING_DELIVERY"]),
  createdAt: z.string(),
  items: z.array(customerSaleItemSchema),
});

export const customerDetailResponseSchema = z.object({
  customer: customerResponseSchema,
  bottles: z.array(customerBottleResponseSchema),
  recentSales: z.array(customerSaleSchema),
});

export const duplicateCheckResponseSchema = z.object({
  hasDuplicates: z.boolean(),
  duplicates: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      phone: z.string().nullable(),
    }),
  ),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerResponse = z.infer<typeof customerResponseSchema>;
export type CustomersListResponse = z.infer<typeof customersListResponseSchema>;
export type CreateCustomerBottleInput = z.infer<typeof createCustomerBottleSchema>;
export type UpdateCustomerBottleInput = z.infer<typeof updateCustomerBottleSchema>;
export type CustomerBottleResponse = z.infer<typeof customerBottleResponseSchema>;
export type CustomerDetailResponse = z.infer<typeof customerDetailResponseSchema>;
export type DuplicateCheckResponse = z.infer<typeof duplicateCheckResponseSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter shared test`
Expected: PASS

- [ ] **Step 5: Update shared index exports**

```ts
// packages/shared/src/index.ts
export * from "./auth";
export * from "./customers";
export * from "./finance";
export * from "./products";
export * from "./sales";
export * from "./stock";
```

- [ ] **Step 6: Build shared package**

Run: `pnpm --filter shared build`
Expected: Success

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/customers.ts packages/shared/src/customers.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): add customer contracts and bottle expiration helpers"
```

---

### Task 2: Database Migration + Schema Update

**Files:**
- Create: `apps/api/src/db/migrations/0005_customer_bottles.sql`
- Modify: `apps/api/src/db/schema.ts`

**Interfaces:**
- Consumes: shared contracts from Task 1
- Produces: updated Drizzle schema with `customerBottles` table, `bottleTypeEnum` on products, `isActive` on customers, and relations

- [ ] **Step 1: Write the migration SQL**

```sql
-- apps/api/src/db/migrations/0005_customer_bottles.sql
ALTER TABLE customers ADD COLUMN is_active boolean NOT NULL DEFAULT true;

CREATE TYPE bottle_type AS ENUM ('NONE', 'COMPLETE', 'EXCHANGE');
ALTER TABLE products ADD COLUMN bottle_type bottle_type NOT NULL DEFAULT 'NONE';

CREATE TABLE customer_bottles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id),
  sale_id uuid REFERENCES sales(id),
  month integer NOT NULL,
  year integer NOT NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX customer_bottles_customer_id_idx ON customer_bottles(customer_id);
CREATE INDEX customer_bottles_is_active_idx ON customer_bottles(is_active);
```

- [ ] **Step 2: Update Drizzle schema**

Add to `apps/api/src/db/schema.ts`:

1. Add `bottleTypeEnum`:
```ts
export const bottleTypeEnum = pgEnum("bottle_type", ["NONE", "COMPLETE", "EXCHANGE"]);
```

2. Add `isActive` to `customers` table:
```ts
export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});
```

3. Add `bottleType` to `products` table:
```ts
export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  salePriceCents: integer("sale_price_cents").notNull(),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  minimumStock: integer("minimum_stock").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  bottleType: bottleTypeEnum("bottle_type").notNull().default("NONE"),
  ...timestamps,
});
```

4. Add `customerBottles` table:
```ts
export const customerBottles = pgTable("customer_bottles", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  saleId: uuid("sale_id").references(() => sales.id),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps,
});
```

5. Update relations:
```ts
export const customersRelations = relations(customers, ({ many }) => ({
  sales: many(sales),
  bottles: many(customerBottles),
}));

export const productsRelations = relations(products, ({ many }) => ({
  saleItems: many(saleItems),
  stockMovements: many(stockMovements),
}));

export const customerBottlesRelations = relations(customerBottles, ({ one }) => ({
  customer: one(customers, {
    fields: [customerBottles.customerId],
    references: [customers.id],
  }),
  sale: one(sales, {
    fields: [customerBottles.saleId],
    references: [sales.id],
  }),
}));
```

- [ ] **Step 3: Run migration**

Run: `pnpm db:migrate`
Expected: Migration applied successfully

- [ ] **Step 4: Verify typecheck**

Run: `pnpm run typecheck`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/db/migrations/0005_customer_bottles.sql apps/api/src/db/schema.ts
git commit -m "feat(db): add customer_bottles table, bottle_type enum, customer isActive"
```

---

### Task 3: Customer Repository + Tests

**Files:**
- Create: `apps/api/src/modules/customers/customers.repository.ts`
- Create: `apps/api/src/modules/customers/customers.repository.test.ts`
- Create: `apps/api/src/modules/customers/customers.errors.ts`

**Interfaces:**
- Consumes: Drizzle schema from Task 2, shared contracts from Task 1
- Produces: `CustomersRepository` class with methods: `findMany`, `findById`, `create`, `update`, `setActive`, `findDuplicates`, `findBottlesByCustomerId`, `findBottleById`, `createBottle`, `updateBottle`, `deactivateBottle`, `findRecentSalesByCustomerId`, `createBottleFromSale`

- [ ] **Step 1: Write the error class**

```ts
// apps/api/src/modules/customers/customers.errors.ts
export type CustomersRepositoryErrorCode =
  | "CUSTOMER_NOT_FOUND"
  | "CUSTOMER_DUPLICATE_PHONE"
  | "BOTTLE_NOT_FOUND";

export class CustomersRepositoryError extends Error {
  readonly code: CustomersRepositoryErrorCode;

  constructor(code: CustomersRepositoryErrorCode, message: string) {
    super(message);
    this.name = "CustomersRepositoryError";
    this.code = code;
  }
}
```

- [ ] **Step 2: Write the failing repository test**

```ts
// apps/api/src/modules/customers/customers.repository.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const now = new Date("2026-06-22T00:00:00.000Z");

const customer = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Joao Silva",
  code: null,
  phone: "(11) 99999-0000",
  address: null,
  notes: null,
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

describe("CustomersRepository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("creates a customer and returns it", async () => {
    const returning = vi.fn(async () => [customer]);
    const insert = vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ returning }) });
    const db = { insert };

    vi.doMock("../../db", () => ({ db }));
    const { CustomersRepository } = await import("./customers.repository");

    const result = await new CustomersRepository().create({
      name: "Joao Silva",
      phone: "(11) 99999-0000",
      address: null,
      notes: null,
    });

    expect(result).toEqual(customer);
    expect(insert).toHaveBeenCalled();
  });

  it("creates a bottle with calculated expiresAt", async () => {
    const bottle = {
      id: "22222222-2222-2222-2222-222222222222",
      customerId: "11111111-1111-1111-1111-111111111111",
      saleId: null,
      month: 6,
      year: 2024,
      notes: null,
      isActive: true,
      expiresAt: new Date("2027-06-30T23:59:59.999Z"),
      createdAt: now,
      updatedAt: now,
    };
    const returning = vi.fn(async () => [bottle]);
    const insert = vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ returning }) });
    const db = { insert };

    vi.doMock("../../db", () => ({ db }));
    const { CustomersRepository } = await import("./customers.repository");

    const result = await new CustomersRepository().createBottle({
      customerId: "11111111-1111-1111-1111-111111111111",
      month: 6,
      year: 2024,
      notes: null,
    });

    expect(result).toEqual(bottle);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "11111111-1111-1111-1111-111111111111",
        month: 6,
        year: 2024,
        expiresAt: new Date("2027-06-30T23:59:59.999Z"),
      }),
    );
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter api test -- --run src/modules/customers/customers.repository.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Write the repository implementation**

```ts
// apps/api/src/modules/customers/customers.repository.ts
import { Injectable } from "@nestjs/common";
import { and, asc, desc, eq, ilike, isNull, ne, or, sql } from "drizzle-orm";
import { calculateBottleExpiresAt } from "shared";

import { db } from "../../db";
import { customerBottles, customers, saleItems, sales } from "../../db/schema";
import { CustomersRepositoryError } from "./customers.errors";
import type { CreateCustomerBottleInput, CreateCustomerInput, UpdateCustomerBottleInput, UpdateCustomerInput } from "shared";

@Injectable()
export class CustomersRepository {
  findMany(options: { search?: string; includeInactive?: boolean } = {}) {
    const conditions = [];

    if (!options.includeInactive) {
      conditions.push(eq(customers.isActive, true));
    }

    if (options.search) {
      const searchClause = or(
        ilike(customers.name, `%${options.search}%`),
        ilike(customers.phone, `%${options.search}%`),
      );
      if (searchClause) {
        conditions.push(searchClause);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return db.query.customers.findMany({
      where: whereClause,
      orderBy: [asc(customers.name)],
    });
  }

  findById(id: string) {
    return db.query.customers.findFirst({
      where: eq(customers.id, id),
    });
  }

  async create(input: CreateCustomerInput) {
    const [customer] = await db.insert(customers).values(input).returning();
    return customer;
  }

  async update(id: string, input: UpdateCustomerInput) {
    const [customer] = await db
      .update(customers)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();

    return customer;
  }

  async setActive(id: string, isActive: boolean) {
    const [customer] = await db
      .update(customers)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();

    return customer;
  }

  async findDuplicates(name: string, phone: string | null, excludeId?: string) {
    const conditions = [];

    if (excludeId) {
      conditions.push(ne(customers.id, excludeId));
    }

    const nameOrPhone = or(
      ilike(customers.name, name),
      phone ? ilike(customers.phone, phone) : undefined,
    );

    if (nameOrPhone) {
      conditions.push(nameOrPhone);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return db.query.customers.findMany({
      where: whereClause,
      columns: { id: true, name: true, phone: true },
      orderBy: [asc(customers.name)],
      limit: 10,
    });
  }

  findBottlesByCustomerId(customerId: string) {
    return db.query.customerBottles.findMany({
      where: and(
        eq(customerBottles.customerId, customerId),
        eq(customerBottles.isActive, true),
      ),
      orderBy: [desc(customerBottles.expiresAt)],
    });
  }

  findBottleById(id: string) {
    return db.query.customerBottles.findFirst({
      where: eq(customerBottles.id, id),
    });
  }

  async createBottle(input: { customerId: string; saleId?: string | null; month: number; year: number; notes?: string | null }) {
    const expiresAt = calculateBottleExpiresAt(input.month, input.year);

    const [bottle] = await db
      .insert(customerBottles)
      .values({
        customerId: input.customerId,
        saleId: input.saleId ?? null,
        month: input.month,
        year: input.year,
        notes: input.notes ?? null,
        expiresAt,
      })
      .returning();

    return bottle;
  }

  async updateBottle(id: string, input: UpdateCustomerBottleInput) {
    const bottle = await this.findBottleById(id);

    if (!bottle) {
      throw new CustomersRepositoryError("BOTTLE_NOT_FOUND", "Galao nao encontrado.");
    }

    const month = input.month ?? bottle.month;
    const year = input.year ?? bottle.year;
    const expiresAt = calculateBottleExpiresAt(month, year);

    const [updated] = await db
      .update(customerBottles)
      .set({
        ...input,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(customerBottles.id, id))
      .returning();

    return updated;
  }

  async deactivateBottle(id: string) {
    const [bottle] = await db
      .update(customerBottles)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(customerBottles.id, id))
      .returning();

    return bottle;
  }

  async findRecentSalesByCustomerId(customerId: string, limit = 20) {
    return db.query.sales.findMany({
      where: eq(sales.customerId, customerId),
      orderBy: [desc(sales.createdAt)],
      limit,
      with: {
        items: {
          orderBy: [asc(saleItems.createdAt)],
        },
      },
    });
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter api test -- --run src/modules/customers/customers.repository.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/customers/
git commit -m "feat(api): add customers repository with bottle management"
```

---

### Task 4: Customer Service + Tests

**Files:**
- Create: `apps/api/src/modules/customers/customers.service.ts`
- Create: `apps/api/src/modules/customers/customers.service.test.ts`
- Create: `apps/api/src/modules/customers/customers.schemas.ts`

**Interfaces:**
- Consumes: `CustomersRepository` from Task 3, shared contracts from Task 1
- Produces: `CustomersService` class with methods: `listCustomers`, `getCustomerDetail`, `createCustomer`, `updateCustomer`, `toggleActive`, `checkDuplicates`, `addBottle`, `updateBottle`, `deactivateBottle`

- [ ] **Step 1: Write the schemas re-export**

```ts
// apps/api/src/modules/customers/customers.schemas.ts
export {
  createCustomerBottleSchema,
  createCustomerSchema,
  customerBottleResponseSchema,
  customerDetailResponseSchema,
  customerResponseSchema,
  customersListResponseSchema,
  duplicateCheckResponseSchema,
  updateCustomerBottleSchema,
  updateCustomerSchema,
} from "shared";
export type {
  CreateCustomerBottleInput,
  CreateCustomerInput,
  CustomerBottleResponse,
  CustomerDetailResponse,
  CustomerResponse,
  CustomersListResponse,
  DuplicateCheckResponse,
  UpdateCustomerBottleInput,
  UpdateCustomerInput,
} from "shared";
```

- [ ] **Step 2: Write the failing service test**

```ts
// apps/api/src/modules/customers/customers.service.test.ts
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { CustomersService } from "./customers.service";

const now = new Date("2026-06-22T00:00:00.000Z");

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function makeCustomer(overrides: Partial<CustomerRow> = {}): CustomerRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    name: "João Silva",
    phone: "(11) 99999-0000",
    address: null,
    notes: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

type BottleRow = {
  id: string;
  customerId: string;
  saleId: string | null;
  month: number;
  year: number;
  notes: string | null;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

function makeBottle(overrides: Partial<BottleRow> = {}): BottleRow {
  return {
    id: "22222222-2222-2222-2222-222222222222",
    customerId: "11111111-1111-1111-1111-111111111111",
    saleId: null,
    month: 6,
    year: 2024,
    notes: null,
    isActive: true,
    expiresAt: new Date("2027-06-30T23:59:59.999Z"),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

class FakeRepository {
  customers = [makeCustomer()];
  bottles = [makeBottle()];

  findMany = vi.fn(async () => this.customers);
  findById = vi.fn(async (id: string) => this.customers.find((c) => c.id === id));
  create = vi.fn(async (input) => makeCustomer(input));
  update = vi.fn(async (id: string, input) => makeCustomer({ id, ...input }));
  setActive = vi.fn(async (id: string, isActive: boolean) => makeCustomer({ id, isActive }));
  findDuplicates = vi.fn(async () => []);
  findBottlesByCustomerId = vi.fn(async () => this.bottles);
  findBottleById = vi.fn(async (id: string) => this.bottles.find((b) => b.id === id));
  createBottle = vi.fn(async (input) => makeBottle(input));
  updateBottle = vi.fn(async (id: string, input) => makeBottle({ id, ...input }));
  deactivateBottle = vi.fn(async (id: string) => makeBottle({ id, isActive: false }));
  findRecentSalesByCustomerId = vi.fn(async () => []);
}

const adminUser = { id: "33333333-3333-3333-3333-333333333333", role: "ADMIN" as const };
const operatorUser = { id: "44444444-4444-4444-4444-444444444444", role: "OPERATOR" as const };

describe("CustomersService", () => {
  it("lists customers with summary and bottle alerts", async () => {
    const repository = new FakeRepository();
    const service = new CustomersService(repository as never);

    const result = await service.listCustomers();

    expect(result.customers).toHaveLength(1);
    expect(result.summary.total).toBe(1);
    expect(result.summary.active).toBe(1);
  });

  it("throws NotFoundException when getting a non-existent customer", async () => {
    const repository = new FakeRepository();
    const service = new CustomersService(repository as never);

    await expect(service.getCustomerDetail("non-existent")).rejects.toThrow(NotFoundException);
  });

  it("throws BadRequestException when creating a customer with duplicate phone", async () => {
    const repository = new FakeRepository();
    repository.findDuplicates = vi.fn(async () => [
      { id: "55555555-5555-5555-5555-555555555555", name: "Outro João", phone: "(11) 99999-0000" },
    ]);
    const service = new CustomersService(repository as never);

    await expect(
      service.createCustomer(operatorUser, {
        name: "João Silva",
        phone: "(11) 99999-0000",
        address: null,
        notes: null,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("allows both ADMIN and OPERATOR to create customers", async () => {
    const repository = new FakeRepository();
    const service = new CustomersService(repository as never);

    await expect(
      service.createCustomer(operatorUser, {
        name: "Maria Santos",
        phone: null,
        address: null,
        notes: null,
      }),
    ).resolves.toBeDefined();
  });

  it("throws when trying to add a bottle to a non-existent customer", async () => {
    const repository = new FakeRepository();
    const service = new CustomersService(repository as never);

    await expect(
      service.addBottle("non-existent", operatorUser, { month: 6, year: 2024, notes: null }),
    ).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter api test -- --run src/modules/customers/customers.service.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Write the service implementation**

```ts
// apps/api/src/modules/customers/customers.service.ts
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { isBottleExpired, isBottleNearExpiration, type SessionUser } from "shared";

import { CustomersRepository } from "./customers.repository";
import { createCustomerBottleSchema, createCustomerSchema, updateCustomerBottleSchema, updateCustomerSchema } from "./customers.schemas";
import type {
  CreateCustomerBottleInput,
  CreateCustomerInput,
  CustomerBottleResponse,
  CustomerDetailResponse,
  CustomerResponse,
  CustomersListResponse,
  DuplicateCheckResponse,
  UpdateCustomerBottleInput,
  UpdateCustomerInput,
} from "./customers.schemas";

type PermissionUser = Pick<SessionUser, "id" | "role">;
type CustomerRow = NonNullable<Awaited<ReturnType<CustomersRepository["findById"]>>>;
type BottleRow = NonNullable<Awaited<ReturnType<CustomersRepository["findBottleById"]>>>;

@Injectable()
export class CustomersService {
  constructor(private readonly customersRepository: CustomersRepository) {}

  async listCustomers(): Promise<CustomersListResponse> {
    const customers = await this.customersRepository.findMany();
    const now = new Date();

    const customerResponses = await Promise.all(
      customers.map(async (customer) => {
        const bottles = await this.customersRepository.findBottlesByCustomerId(customer.id);
        const hasAlert = bottles.some(
          (bottle) => isBottleNearExpiration(bottle.expiresAt, now) || isBottleExpired(bottle.expiresAt, now),
        );

        return this.toCustomerResponse(customer, hasAlert);
      }),
    );

    return {
      customers: customerResponses,
      summary: {
        total: customerResponses.length,
        active: customerResponses.filter((c) => c.isActive).length,
        withAlert: customerResponses.filter((c) => c.hasBottleAlert).length,
      },
    };
  }

  async getCustomerDetail(id: string): Promise<CustomerDetailResponse> {
    const customer = await this.customersRepository.findById(id);

    if (!customer) {
      throw new NotFoundException("Cliente nao encontrado.");
    }

    const bottles = await this.customersRepository.findBottlesByCustomerId(id);
    const recentSales = await this.customersRepository.findRecentSalesByCustomerId(id);
    const now = new Date();

    return {
      customer: this.toCustomerResponse(
        customer,
        bottles.some((b) => isBottleNearExpiration(b.expiresAt, now) || isBottleExpired(b.expiresAt, now)),
      ),
      bottles: bottles.map((b) => this.toBottleResponse(b, now)),
      recentSales: recentSales.map((sale) => ({
        id: sale.id,
        totalAmountCents: sale.totalAmountCents,
        paymentMethod: sale.paymentMethod,
        status: sale.status,
        createdAt: sale.createdAt.toISOString(),
        items: sale.items.map((item) => ({
          id: item.id,
          productNameSnapshot: item.productNameSnapshot,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          totalPriceCents: item.totalPriceCents,
        })),
      })),
    };
  }

  async createCustomer(user: PermissionUser, input: CreateCustomerInput): Promise<CustomerResponse> {
    const parsedInput = createCustomerSchema.parse(input);

    const duplicates = await this.customersRepository.findDuplicates(
      parsedInput.name,
      parsedInput.phone ?? null,
    );

    if (duplicates.some((d) => d.phone && d.phone === parsedInput.phone)) {
      throw new BadRequestException("Ja existe um cliente com este telefone.");
    }

    const customer = await this.customersRepository.create(parsedInput);

    return this.toCustomerResponse(customer, false);
  }

  async updateCustomer(id: string, user: PermissionUser, input: UpdateCustomerInput): Promise<CustomerResponse> {
    await this.ensureCustomerExists(id);
    const parsedInput = updateCustomerSchema.parse(input);

    const duplicates = await this.customersRepository.findDuplicates(
      parsedInput.name ?? "",
      parsedInput.phone ?? null,
      id,
    );

    if (duplicates.some((d) => d.phone && d.phone === parsedInput.phone)) {
      throw new BadRequestException("Ja existe um cliente com este telefone.");
    }

    const customer = await this.customersRepository.update(id, parsedInput);

    return this.toCustomerResponse(customer, false);
  }

  async toggleActive(id: string, user: PermissionUser): Promise<CustomerResponse> {
    const customer = await this.ensureCustomerExists(id);
    const toggled = await this.customersRepository.setActive(id, !customer.isActive);

    return this.toCustomerResponse(toggled, false);
  }

  async checkDuplicates(name: string, phone: string | null, excludeId?: string): Promise<DuplicateCheckResponse> {
    const duplicates = await this.customersRepository.findDuplicates(name, phone, excludeId);

    return {
      hasDuplicates: duplicates.length > 0,
      duplicates: duplicates.map((d) => ({ id: d.id, name: d.name, phone: d.phone })),
    };
  }

  async addBottle(customerId: string, user: PermissionUser, input: CreateCustomerBottleInput): Promise<CustomerBottleResponse> {
    await this.ensureCustomerExists(customerId);
    const parsedInput = createCustomerBottleSchema.parse(input);
    const bottle = await this.customersRepository.createBottle({
      customerId,
      ...parsedInput,
    });

    return this.toBottleResponse(bottle, new Date());
  }

  async updateBottle(bottleId: string, user: PermissionUser, input: UpdateCustomerBottleInput): Promise<CustomerBottleResponse> {
    const parsedInput = updateCustomerBottleSchema.parse(input);
    const bottle = await this.customersRepository.updateBottle(bottleId, parsedInput);

    return this.toBottleResponse(bottle, new Date());
  }

  async deactivateBottle(bottleId: string, user: PermissionUser): Promise<CustomerBottleResponse> {
    const bottle = await this.customersRepository.deactivateBottle(bottleId);

    return this.toBottleResponse(bottle, new Date());
  }

  private async ensureCustomerExists(id: string): Promise<CustomerRow> {
    const customer = await this.customersRepository.findById(id);

    if (!customer) {
      throw new NotFoundException("Cliente nao encontrado.");
    }

    return customer;
  }

  private toCustomerResponse(customer: CustomerRow, hasBottleAlert: boolean): CustomerResponse {
    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      notes: customer.notes,
      isActive: customer.isActive,
      hasBottleAlert,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    };
  }

  private toBottleResponse(bottle: BottleRow, now: Date): CustomerBottleResponse {
    return {
      id: bottle.id,
      customerId: bottle.customerId,
      saleId: bottle.saleId,
      month: bottle.month,
      year: bottle.year,
      notes: bottle.notes,
      isActive: bottle.isActive,
      expiresAt: bottle.expiresAt.toISOString(),
      isNearExpiration: isBottleNearExpiration(bottle.expiresAt, now),
      isExpired: isBottleExpired(bottle.expiresAt, now),
      createdAt: bottle.createdAt.toISOString(),
      updatedAt: bottle.updatedAt.toISOString(),
    };
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter api test -- --run src/modules/customers/customers.service.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/customers/
git commit -m "feat(api): add customers service with duplicate check and bottle management"
```

---

### Task 5: Customer Controller + Module + Tests

**Files:**
- Create: `apps/api/src/modules/customers/customers.controller.ts`
- Create: `apps/api/src/modules/customers/customers.controller.test.ts`
- Create: `apps/api/src/modules/customers/customers.module.ts`
- Modify: `apps/api/src/app.module.ts:1-13`

**Interfaces:**
- Consumes: `CustomersService` from Task 4, `AuthService` from existing auth module
- Produces: `CustomersController` with REST endpoints, `CustomersModule` registered in `AppModule`

- [ ] **Step 1: Write the failing controller test**

```ts
// apps/api/src/modules/customers/customers.controller.test.ts
import { BadRequestException } from "@nestjs/common";
import type { SessionUser } from "shared";
import { describe, expect, it, vi } from "vitest";

import { SESSION_COOKIE_NAME } from "../auth/session";
import { CustomersController } from "./customers.controller";

const request = { cookies: { [SESSION_COOKIE_NAME]: "token" } };

function createController() {
  const defaultUser: SessionUser = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Operador",
    email: "operador@planetaagua.local",
    role: "OPERATOR",
  };
  const authService = {
    getUserByToken: vi.fn(async (): Promise<SessionUser> => defaultUser),
  };
  const customersService = {
    listCustomers: vi.fn(),
    getCustomerDetail: vi.fn(),
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    toggleActive: vi.fn(),
    checkDuplicates: vi.fn(),
    addBottle: vi.fn(),
    updateBottle: vi.fn(),
    deactivateBottle: vi.fn(),
  };

  return {
    controller: new CustomersController(authService as never, customersService as never),
    authService,
    customersService,
  };
}

describe("CustomersController", () => {
  it("returns a controlled 400 for invalid create payloads", async () => {
    const { controller } = createController();

    await expect(controller.create(request as never, { name: "" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns a controlled 400 for invalid ids", async () => {
    const { controller } = createController();

    await expect(controller.getById(request as never, "not-a-uuid")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("routes toggle to the intended service method", async () => {
    const { controller, customersService } = createController();
    const id = "11111111-1111-4111-8111-111111111111";

    await controller.toggle(request as never, id);

    expect(customersService.toggleActive).toHaveBeenCalledWith(id, expect.objectContaining({ role: "OPERATOR" }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- --run src/modules/customers/customers.controller.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the controller implementation**

```ts
// apps/api/src/modules/customers/customers.controller.ts
import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";

import { requireRequestUser } from "../auth/current-user";
import { AuthService } from "../auth/auth.service";
import { createCustomerBottleSchema, createCustomerSchema, updateCustomerBottleSchema, updateCustomerSchema } from "./customers.schemas";
import { CustomersService } from "./customers.service";

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

@Controller("customers")
export class CustomersController {
  constructor(
    private readonly authService: AuthService,
    private readonly customersService: CustomersService,
  ) {}

  @Get()
  async list(@Req() request: Request) {
    await requireRequestUser(request, this.authService);
    return this.customersService.listCustomers();
  }

  @Get("duplicates")
  async checkDuplicates(@Req() request: Request, @Query("name") name = "", @Query("phone") phone: string | undefined, @Query("excludeId") excludeId: string | undefined) {
    await requireRequestUser(request, this.authService);
    return this.customersService.checkDuplicates(name, phone ?? null, excludeId);
  }

  @Get(":id")
  async getById(@Req() request: Request, @Param("id") id: string) {
    await requireRequestUser(request, this.authService);
    return this.customersService.getCustomerDetail(parseId(id));
  }

  @Post()
  async create(@Req() request: Request, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    const input = parseBody(createCustomerSchema, body, "Dados do cliente invalidos.");

    return this.customersService.createCustomer(user, input);
  }

  @Patch(":id")
  async update(@Req() request: Request, @Param("id") id: string, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    const customerId = parseId(id);
    const input = parseBody(updateCustomerSchema, body, "Dados do cliente invalidos.");

    return this.customersService.updateCustomer(customerId, user, input);
  }

  @Patch(":id/toggle-active")
  async toggle(@Req() request: Request, @Param("id") id: string) {
    const user = await requireRequestUser(request, this.authService);

    return this.customersService.toggleActive(parseId(id), user);
  }

  @Post(":id/bottles")
  async addBottle(@Req() request: Request, @Param("id") id: string, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    const input = parseBody(createCustomerBottleSchema, body, "Dados do galao invalidos.");

    return this.customersService.addBottle(parseId(id), user, input);
  }

  @Patch(":id/bottles/:bottleId")
  async updateBottle(@Req() request: Request, @Param("id") id: string, @Param("bottleId") bottleId: string, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    const input = parseBody(updateCustomerBottleSchema, body, "Dados do galao invalidos.");

    return this.customersService.updateBottle(parseId(bottleId), user, input);
  }

  @Patch(":id/bottles/:bottleId/deactivate")
  async deactivateBottle(@Req() request: Request, @Param("id") id: string, @Param("bottleId") bottleId: string) {
    const user = await requireRequestUser(request, this.authService);

    return this.customersService.deactivateBottle(parseId(bottleId), user);
  }
}
```

- [ ] **Step 4: Write the module**

```ts
// apps/api/src/modules/customers/customers.module.ts
import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { CustomersController } from "./customers.controller";
import { CustomersRepository } from "./customers.repository";
import { CustomersService } from "./customers.service";

@Module({
  imports: [AuthModule],
  controllers: [CustomersController],
  providers: [CustomersRepository, CustomersService],
})
export class CustomersModule {}
```

- [ ] **Step 5: Register module in AppModule**

```ts
// apps/api/src/app.module.ts
import { Module } from "@nestjs/common";

import { HealthModule } from "./health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { ProductsModule } from "./modules/products/products.module";
import { SalesModule } from "./modules/sales/sales.module";
import { StockModule } from "./modules/stock/stock.module";

@Module({
  imports: [HealthModule, AuthModule, ProductsModule, StockModule, SalesModule, FinanceModule, CustomersModule],
})
export class AppModule {}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter api test -- --run src/modules/customers/customers.controller.test.ts`
Expected: PASS

- [ ] **Step 7: Run all API tests**

Run: `pnpm --filter api test -- --run`
Expected: All pass

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/customers/ apps/api/src/app.module.ts
git commit -m "feat(api): add customers controller, module, and register in app"
```

---

### Task 6: Product Bottle Type Extension

**Files:**
- Modify: `packages/shared/src/products.ts`
- Modify: `apps/api/src/modules/products/products.service.ts`
- Modify: `apps/web/src/app/(app)/produtos/products-ui.tsx`

**Interfaces:**
- Consumes: `bottleTypeEnum` from Task 2
- Produces: Products now include `bottleType` field in create/update forms and responses

- [ ] **Step 1: Update shared product schemas**

Add `bottleType` to `createProductSchema` and `productResponseSchema` in `packages/shared/src/products.ts`:

```ts
export const bottleTypeValues = ["NONE", "COMPLETE", "EXCHANGE"] as const;

export const createProductSchema = z.object({
  name: z.string().trim().min(1),
  description: nullableDescriptionSchema,
  salePriceCents: requiredNonNegativeIntegerSchema,
  stockQuantity: requiredNonNegativeIntegerSchema,
  minimumStock: requiredNonNegativeIntegerSchema,
  bottleType: z.enum(bottleTypeValues).default("NONE"),
});

export const productResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  salePriceCents: z.number().int().min(0),
  stockQuantity: z.number().int().min(0),
  minimumStock: z.number().int().min(0),
  isActive: z.boolean(),
  isLowStock: z.boolean(),
  bottleType: z.enum(bottleTypeValues),
  createdAt: z.string(),
  updatedAt: z.string(),
});
```

- [ ] **Step 2: Update product service toResponse**

Add `bottleType` to the `toResponse` method in `products.service.ts`:

```ts
private toResponse(product: ProductRow): ProductResponse {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    salePriceCents: product.salePriceCents,
    stockQuantity: product.stockQuantity,
    minimumStock: product.minimumStock,
    isActive: product.isActive,
    isLowStock: product.stockQuantity <= product.minimumStock,
    bottleType: product.bottleType,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
```

- [ ] **Step 3: Add bottle type selector to product form**

In `products-ui.tsx`, add a `SelectInput` for `bottleType` in the create/edit drawer:

```tsx
<Field label="Tipo de galao">
  <SelectInput defaultValue={editingProduct?.bottleType ?? "NONE"} name="bottleType">
    <option value="NONE">Nao e galao</option>
    <option value="COMPLETE">Galao completo</option>
    <option value="EXCHANGE">Troca de galao</option>
  </SelectInput>
</Field>
```

And update `productFormToPayload` to include `bottleType`.

- [ ] **Step 4: Rebuild shared and verify typecheck**

Run: `pnpm --filter shared build && pnpm run typecheck`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/products.ts apps/api/src/modules/products/ apps/web/src/app/\(app\)/produtos/
git commit -m "feat(products): add bottleType field for complete/exchange classification"
```

---

### Task 7: Sales Integration — Create Customer Bottle on Complete Sale

**Files:**
- Modify: `apps/api/src/modules/sales/sales.repository.ts`
- Modify: `apps/api/src/modules/sales/sales.repository.test.ts`

**Interfaces:**
- Consumes: `customerBottles` table from Task 2, `bottleType` from Task 6
- Produces: Automatic `customer_bottle` creation when a sale includes a COMPLETE product

- [ ] **Step 1: Write the failing repository test**

Add to `apps/api/src/modules/sales/sales.repository.test.ts`:

```ts
it("creates customer bottles when sale includes COMPLETE bottle products with bottle data", async () => {
  const sale = { id: "77777777-7777-4777-8777-777777777777", status: "COMPLETED" };
  const saleReturning = vi.fn(async () => [sale]);
  const saleInsert = vi.fn(() => ({ returning: saleReturning }));
  const itemsInsert = vi.fn(async () => undefined);
  const bottleInsert = vi.fn(async () => undefined);
  const stockUpdate = vi.fn(async () => undefined);
  const stockMovementInsert = vi.fn(async () => undefined);

  const tx = {
    insert: vi.fn()
      .mockReturnValueOnce({ values: saleInsert })
      .mockReturnValueOnce({ values: itemsInsert })
      .mockReturnValue(bottleInsert),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ for: vi.fn(async () => [{ id: "66666666-6666-4666-8666-666666666666", name: "Galao Completo", salePriceCents: 1200, stockQuantity: 10, isActive: true, bottleType: "COMPLETE" }]) }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn(async () => undefined) }),
    }),
  };
  const transaction = vi.fn(async (callback) => callback(tx));
  const db = { transaction };

  vi.doMock("../../db", () => ({ db }));
  const { SalesRepository } = await import("./sales.repository");

  await new SalesRepository().createSale({
    customerId: "55555555-5555-4555-8555-555555555555",
    userId: "11111111-1111-4111-8111-111111111111",
    paymentMethod: "CASH",
    items: [{ productId: "66666666-6666-4666-8666-666666666666", quantity: 1 }],
    bottle: { month: 6, year: 2024, notes: null },
    deliveryPending: false,
  });

  expect(bottleInsert).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- --run src/modules/sales/sales.repository.test.ts`
Expected: FAIL

- [ ] **Step 3: Update SalesRepository to create bottle from sale**

In `sales.repository.ts`, modify `createSale` to check for COMPLETE products and create customer bottles.

Add imports at the top:
```ts
import { calculateBottleExpiresAt } from "shared";
import { customerBottles } from "../../db/schema";
```

After the sale items are inserted and stock is updated (before `return sale;`), add:

```ts
const completeBottleItems = input.items.filter((item) => {
  const product = productById.get(item.productId);
  return product?.bottleType === "COMPLETE";
});

if (completeBottleItems.length > 0 && input.customerId && input.bottle) {
  for (const item of completeBottleItems) {
    for (let i = 0; i < item.quantity; i++) {
      await tx.insert(customerBottles).values({
        customerId: input.customerId,
        saleId: sale.id,
        month: input.bottle.month,
        year: input.bottle.year,
        notes: input.bottle.notes ?? null,
        expiresAt: calculateBottleExpiresAt(input.bottle.month, input.bottle.year),
      });
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter api test -- --run src/modules/sales/sales.repository.test.ts`
Expected: PASS

- [ ] **Step 5: Run all API tests**

Run: `pnpm --filter api test -- --run`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/sales/
git commit -m "feat(sales): create customer bottle automatically on complete bottle sale"
```

---

### Task 8: Web API Proxies + Web Lib

**Files:**
- Create: `apps/web/src/app/api/customers/route.ts`
- Create: `apps/web/src/app/api/customers/[id]/route.ts`
- Create: `apps/web/src/app/api/customers/[id]/bottles/route.ts`
- Create: `apps/web/src/app/api/customers/[id]/bottles/[bottleId]/route.ts`
- Create: `apps/web/src/app/api/customers/duplicates/route.ts`
- Create: `apps/web/src/lib/customers.ts`

**Interfaces:**
- Consumes: API endpoints from Task 5
- Produces: Next.js API route handlers and client-side fetch helpers

- [ ] **Step 1: Write the web lib**

```ts
// apps/web/src/lib/customers.ts
import {
  customerDetailResponseSchema,
  customersListResponseSchema,
  duplicateCheckResponseSchema,
  type CustomerDetailResponse,
  type CustomersListResponse,
  type DuplicateCheckResponse,
} from "shared";

import { getServerApiUrl } from "./api";

const emptyCustomersResponse: CustomersListResponse = {
  customers: [],
  summary: { total: 0, active: 0, withAlert: 0 },
};

export async function fetchCustomers(cookieHeader: string): Promise<CustomersListResponse> {
  const response = await fetch(`${getServerApiUrl()}/customers`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!response.ok) {
    return emptyCustomersResponse;
  }

  return customersListResponseSchema.parse(await response.json());
}

export async function fetchCustomerDetail(id: string, cookieHeader: string): Promise<CustomerDetailResponse | null> {
  const response = await fetch(`${getServerApiUrl()}/customers/${id}`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return customerDetailResponseSchema.parse(await response.json());
}

export async function checkCustomerDuplicates(name: string, phone: string | null, excludeId: string | undefined, cookieHeader: string): Promise<DuplicateCheckResponse> {
  const params = new URLSearchParams({ name });
  if (phone) params.set("phone", phone);
  if (excludeId) params.set("excludeId", excludeId);

  const response = await fetch(`${getServerApiUrl()}/customers/duplicates?${params}`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!response.ok) {
    return { hasDuplicates: false, duplicates: [] };
  }

  return duplicateCheckResponseSchema.parse(await response.json());
}

export function formatBottleExpiration(expiresAt: string): string {
  const date = new Date(expiresAt);
  return date.toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" });
}

export function getBottleAlertVariant(bottle: { isExpired: boolean; isNearExpiration: boolean }): "danger" | "warning" | null {
  if (bottle.isExpired) return "danger";
  if (bottle.isNearExpiration) return "warning";
  return null;
}
```

- [ ] **Step 2: Write API route handlers**

Follow the same pattern as `apps/web/src/app/api/products/route.ts` and `[id]/route.ts`. Create proxy routes for:
- `GET /api/customers` → `GET /customers`
- `POST /api/customers` → `POST /customers`
- `GET /api/customers/duplicates` → `GET /customers/duplicates`
- `GET /api/customers/[id]` → `GET /customers/[id]`
- `PATCH /api/customers/[id]` → `PATCH /customers/[id]`
- `PATCH /api/customers/[id]/toggle-active` → `PATCH /customers/[id]/toggle-active`
- `POST /api/customers/[id]/bottles` → `POST /customers/[id]/bottles`
- `PATCH /api/customers/[id]/bottles/[bottleId]` → `PATCH /customers/[id]/bottles/[bottleId]`
- `PATCH /api/customers/[id]/bottles/[bottleId]/deactivate` → `PATCH /customers/[id]/bottles/[bottleId]/deactivate`

- [ ] **Step 3: Verify typecheck**

Run: `pnpm run typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/customers/ apps/web/src/lib/customers.ts
git commit -m "feat(web): add customer API proxies and fetch helpers"
```

---

### Task 9: Web UI — Customer List + Drawer + Bottles

**Files:**
- Create: `apps/web/src/app/(app)/clientes/page.tsx`
- Create: `apps/web/src/app/(app)/clientes/customers-ui.tsx`
- Create: `apps/web/src/app/(app)/clientes/customers-ui.test.tsx`

**Interfaces:**
- Consumes: Web lib from Task 8, shared contracts from Task 1
- Produces: Customer list page with search, drawer for create/edit, bottle management

- [ ] **Step 1: Write the page component**

```tsx
// apps/web/src/app/(app)/clientes/page.tsx
import { cookies } from "next/headers";

import { requireUser } from "@/lib/auth";
import { fetchCustomers } from "@/lib/customers";

import { CustomersUi } from "./customers-ui";

export default async function CustomersPage() {
  const user = await requireUser();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  const data = await fetchCustomers(cookieHeader);

  return <CustomersUi userRole={user.role} customers={data.customers} summary={data.summary} />;
}
```

- [ ] **Step 2: Write the UI component**

Follow the pattern from `products-ui.tsx`:
- Dense table with columns: Nome, Telefone, Endereço, Alerta
- Toolbar with search and "Novo cliente" button
- Drawer for create/edit with tabs: Dados, Galões, Vendas
- Bottle list with expiration alerts
- Duplicate warning on save

Key features:
- Search by name/phone
- Badge for bottle alerts (yellow = near expiration, red = expired)
- Drawer with tabs for customer detail
- Bottle management (add/edit/deactivate)
- Form validation with duplicate check

- [ ] **Step 3: Write component tests**

Test:
- Renders customer list
- Search filters customers
- Opens drawer on row click
- Shows bottle alerts
- Duplicate warning on save

- [ ] **Step 4: Verify typecheck and lint**

Run: `pnpm run typecheck && pnpm run lint`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(app\)/clientes/
git commit -m "feat(web): add customers page with list, drawer, and bottle management"
```

---

### Task 10: Final Verification + Cleanup

**Files:**
- None (verification only)

- [ ] **Step 1: Run full typecheck**

Run: `pnpm run typecheck`
Expected: No errors

- [ ] **Step 2: Run full lint**

Run: `pnpm run lint`
Expected: No errors

- [ ] **Step 3: Run all API tests**

Run: `pnpm --filter api test -- --run`
Expected: All pass

- [ ] **Step 4: Run all web tests**

Run: `pnpm --filter web test -- --run`
Expected: All pass

- [ ] **Step 5: Run all shared tests**

Run: `pnpm --filter shared test -- --run`
Expected: All pass

- [ ] **Step 6: Run build**

Run: `pnpm run build`
Expected: Success

- [ ] **Step 7: Final commit (if any cleanup needed)**

```bash
git add -A
git commit -m "chore: final cleanup for customer module"
```
