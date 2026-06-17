# Products Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Products module so admins can create, edit, activate, and deactivate products while operators can consult products.

**Architecture:** Nest owns product validation, permissions, services, repositories, and PostgreSQL access through Drizzle. Next renders `/produtos`, talks to same-origin route handlers under `/api/products`, and never imports database code. Shared package contains product schemas/types used by both apps.

**Tech Stack:** Turborepo, pnpm, Next.js App Router, NestJS, TypeScript, Drizzle ORM, PostgreSQL, Zod, Vitest.

**Git Rule:** Commit only when explicitly requested. During execution, keep changes local until the user asks to commit.

---

## File Structure

- Modify `packages/shared/src/index.ts`: export product contracts.
- Create `packages/shared/src/products.ts`: product schemas, types, money conversion helpers.
- Create `packages/shared/src/products.test.ts`: shared product validation and money formatting tests.
- Create `apps/api/src/modules/auth/current-user.ts`: helper to read authenticated user from request cookie.
- Modify `apps/api/src/modules/auth/auth.module.ts`: export `AuthRepository` if current-user helper needs it indirectly through `AuthService` only no change is needed; preferred no change.
- Create `apps/api/src/modules/products/products.schemas.ts`: API-local schema exports reusing shared schemas.
- Create `apps/api/src/modules/products/products.repository.ts`: Drizzle product queries/mutations.
- Create `apps/api/src/modules/products/products.service.ts`: product business rules and permission checks.
- Create `apps/api/src/modules/products/products.service.test.ts`: products service unit tests using a fake repository.
- Create `apps/api/src/modules/products/products.controller.ts`: Nest REST endpoints.
- Create `apps/api/src/modules/products/products.module.ts`: Nest module wiring.
- Modify `apps/api/src/app.module.ts`: import `ProductsModule`.
- Create `apps/web/src/lib/products.ts`: client/server helpers for products UI.
- Create `apps/web/src/lib/products.test.ts`: money/product UI helper tests.
- Create `apps/web/src/app/api/products/route.ts`: same-origin proxy for `GET /products` and `POST /products`.
- Create `apps/web/src/app/api/products/[id]/route.ts`: same-origin proxy for `GET /products/:id` and `PATCH /products/:id`.
- Create `apps/web/src/app/api/products/[id]/activate/route.ts`: proxy for activation.
- Create `apps/web/src/app/api/products/[id]/deactivate/route.ts`: proxy for deactivation.
- Create `apps/web/src/app/(app)/produtos/page.tsx`: protected products page.
- Create `apps/web/src/app/(app)/produtos/products-ui.tsx`: client UI for list/form/actions.
- Create `apps/web/src/app/(app)/produtos/products-ui.test.tsx`: role-based UI tests without DOM dependency.

---

### Task 1: Shared Product Contracts

**Files:**
- Create: `packages/shared/src/products.ts`
- Create: `packages/shared/src/products.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Write failing shared product tests**

Create `packages/shared/src/products.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { createProductSchema, formatCentsToBRL, parseBRLToCents, productResponseSchema } from "./products";

describe("product shared contracts", () => {
  it("accepts a valid product payload", () => {
    expect(
      createProductSchema.parse({
        name: "Galao 20L",
        description: "Agua mineral",
        salePriceCents: 1200,
        stockQuantity: 10,
        minimumStock: 3,
      }),
    ).toEqual({
      name: "Galao 20L",
      description: "Agua mineral",
      salePriceCents: 1200,
      stockQuantity: 10,
      minimumStock: 3,
    });
  });

  it("normalizes blank descriptions to null", () => {
    expect(
      createProductSchema.parse({
        name: "Galao 20L",
        description: "   ",
        salePriceCents: 1200,
        stockQuantity: 10,
        minimumStock: 3,
      }).description,
    ).toBeNull();
  });

  it("rejects empty names and negative numbers", () => {
    expect(() =>
      createProductSchema.parse({
        name: " ",
        salePriceCents: -1,
        stockQuantity: -1,
        minimumStock: -1,
      }),
    ).toThrow();
  });

  it("describes product responses with low-stock flag", () => {
    expect(
      productResponseSchema.parse({
        id: "11111111-1111-1111-1111-111111111111",
        name: "Galao 20L",
        description: null,
        salePriceCents: 1200,
        stockQuantity: 3,
        minimumStock: 3,
        isActive: true,
        isLowStock: true,
        createdAt: "2026-06-15T00:00:00.000Z",
        updatedAt: "2026-06-15T00:00:00.000Z",
      }).isLowStock,
    ).toBe(true);
  });

  it("formats and parses BRL values", () => {
    expect(formatCentsToBRL(1250)).toBe("R$ 12,50");
    expect(parseBRLToCents("12,50")).toBe(1250);
    expect(parseBRLToCents("R$ 1.234,56")).toBe(123456);
  });
});
```

- [ ] **Step 2: Run shared tests to verify failure**

Run: `pnpm --filter shared test -- src/products.test.ts`

Expected: FAIL because `./products` does not exist.

- [ ] **Step 3: Implement shared products contracts**

Create `packages/shared/src/products.ts`:

```ts
import { z } from "zod";

const nullableDescriptionSchema = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : null;
  });

export const createProductSchema = z.object({
  name: z.string().trim().min(1),
  description: nullableDescriptionSchema,
  salePriceCents: z.coerce.number().int().min(0),
  stockQuantity: z.coerce.number().int().min(0),
  minimumStock: z.coerce.number().int().min(0),
});

export const updateProductSchema = createProductSchema;

export const productResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  salePriceCents: z.number().int().min(0),
  stockQuantity: z.number().int().min(0),
  minimumStock: z.number().int().min(0),
  isActive: z.boolean(),
  isLowStock: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const productsListResponseSchema = z.object({
  products: z.array(productResponseSchema),
  summary: z.object({
    total: z.number().int().min(0),
    active: z.number().int().min(0),
    lowStock: z.number().int().min(0),
  }),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductResponse = z.infer<typeof productResponseSchema>;
export type ProductsListResponse = z.infer<typeof productsListResponseSchema>;

export function formatCentsToBRL(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100);
}

export function parseBRLToCents(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.round(parsed * 100);
}
```

Modify `packages/shared/src/index.ts`:

```ts
export * from "./auth";
export * from "./products";
```

- [ ] **Step 4: Verify shared products tests pass**

Run: `pnpm --filter shared test -- src/products.test.ts`

Expected: PASS.

---

### Task 2: API Products Service And Repository

**Files:**
- Create: `apps/api/src/modules/products/products.repository.ts`
- Create: `apps/api/src/modules/products/products.schemas.ts`
- Create: `apps/api/src/modules/products/products.service.ts`
- Create: `apps/api/src/modules/products/products.service.test.ts`

- [ ] **Step 1: Write failing service tests**

Create `apps/api/src/modules/products/products.service.test.ts`:

```ts
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { ProductsService } from "./products.service";

const now = new Date("2026-06-15T00:00:00.000Z");

function makeProduct(overrides: Partial<Awaited<ReturnType<FakeProductsRepository["create"]>>> = {}) {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Galao 20L",
    description: null,
    salePriceCents: 1200,
    stockQuantity: 3,
    minimumStock: 3,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

class FakeProductsRepository {
  products = [makeProduct()];
  findMany = vi.fn(async () => this.products);
  findById = vi.fn(async (id: string) => this.products.find((product) => product.id === id));
  create = vi.fn(async (input) => makeProduct(input));
  update = vi.fn(async (id: string, input) => makeProduct({ id, ...input }));
}

describe("ProductsService", () => {
  it("adds low-stock flags and summary when listing products", async () => {
    const service = new ProductsService(new FakeProductsRepository() as never);

    const result = await service.listProducts();

    expect(result.products[0].isLowStock).toBe(true);
    expect(result.summary).toEqual({ total: 1, active: 1, lowStock: 1 });
  });

  it("allows admins to create products", async () => {
    const repository = new FakeProductsRepository();
    const service = new ProductsService(repository as never);

    await service.createProduct({ role: "ADMIN" }, {
      name: "Fardo 12x500ml",
      description: null,
      salePriceCents: 1800,
      stockQuantity: 8,
      minimumStock: 2,
    });

    expect(repository.create).toHaveBeenCalledWith({
      name: "Fardo 12x500ml",
      description: null,
      salePriceCents: 1800,
      stockQuantity: 8,
      minimumStock: 2,
    });
  });

  it("blocks operators from creating products", async () => {
    const service = new ProductsService(new FakeProductsRepository() as never);

    await expect(
      service.createProduct({ role: "OPERATOR" }, {
        name: "Fardo 12x500ml",
        description: null,
        salePriceCents: 1800,
        stockQuantity: 8,
        minimumStock: 2,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("throws when updating a missing product", async () => {
    const repository = new FakeProductsRepository();
    repository.findById.mockResolvedValueOnce(undefined);
    const service = new ProductsService(repository as never);

    await expect(
      service.updateProduct("missing", { role: "ADMIN" }, {
        name: "Produto",
        description: null,
        salePriceCents: 100,
        stockQuantity: 1,
        minimumStock: 1,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 2: Run service tests to verify failure**

Run: `pnpm --filter api test -- src/modules/products/products.service.test.ts`

Expected: FAIL because product service files do not exist.

- [ ] **Step 3: Add API schemas**

Create `apps/api/src/modules/products/products.schemas.ts`:

```ts
export { createProductSchema, updateProductSchema } from "shared";
export type { CreateProductInput, ProductResponse, ProductsListResponse, UpdateProductInput } from "shared";
```

- [ ] **Step 4: Add repository**

Create `apps/api/src/modules/products/products.repository.ts`:

```ts
import { Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";

import { db } from "../../db";
import { products } from "../../db/schema";
import type { CreateProductInput, UpdateProductInput } from "./products.schemas";

@Injectable()
export class ProductsRepository {
  findMany() {
    return db.query.products.findMany({
      orderBy: [asc(products.name)],
    });
  }

  findById(id: string) {
    return db.query.products.findFirst({
      where: eq(products.id, id),
    });
  }

  async create(input: CreateProductInput) {
    const [product] = await db.insert(products).values(input).returning();
    return product;
  }

  async update(id: string, input: UpdateProductInput & { isActive?: boolean }) {
    const [product] = await db
      .update(products)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    return product;
  }
}
```

- [ ] **Step 5: Add service**

Create `apps/api/src/modules/products/products.service.ts`:

```ts
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { UserRole } from "shared";

import { ProductsRepository } from "./products.repository";
import type { CreateProductInput, ProductResponse, UpdateProductInput } from "./products.schemas";

type PermissionUser = { role: UserRole };
type ProductRow = Awaited<ReturnType<ProductsRepository["findMany"]>>[number];

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async listProducts() {
    const products = (await this.productsRepository.findMany()).map((product) => this.toResponse(product));

    return {
      products,
      summary: {
        total: products.length,
        active: products.filter((product) => product.isActive).length,
        lowStock: products.filter((product) => product.isLowStock).length,
      },
    };
  }

  async getProduct(id: string) {
    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw new NotFoundException("Produto nao encontrado.");
    }

    return this.toResponse(product);
  }

  async createProduct(user: PermissionUser, input: CreateProductInput) {
    this.requireAdmin(user);
    return this.toResponse(await this.productsRepository.create(input));
  }

  async updateProduct(id: string, user: PermissionUser, input: UpdateProductInput) {
    this.requireAdmin(user);
    await this.ensureProductExists(id);
    return this.toResponse(await this.productsRepository.update(id, input));
  }

  async activateProduct(id: string, user: PermissionUser) {
    this.requireAdmin(user);
    await this.ensureProductExists(id);
    return this.toResponse(await this.productsRepository.update(id, { isActive: true } as UpdateProductInput & { isActive: boolean }));
  }

  async deactivateProduct(id: string, user: PermissionUser) {
    this.requireAdmin(user);
    await this.ensureProductExists(id);
    return this.toResponse(await this.productsRepository.update(id, { isActive: false } as UpdateProductInput & { isActive: boolean }));
  }

  private async ensureProductExists(id: string) {
    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw new NotFoundException("Produto nao encontrado.");
    }
  }

  private requireAdmin(user: PermissionUser) {
    if (user.role !== "ADMIN") {
      throw new ForbiddenException("Voce nao tem permissao para alterar produtos.");
    }
  }

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
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }
}
```

- [ ] **Step 6: Verify service tests pass**

Run: `pnpm --filter api test -- src/modules/products/products.service.test.ts`

Expected: PASS. If TypeScript rejects the fake repository types, add explicit `type ProductRowForTest` inside the test rather than weakening production types.

---

### Task 3: API Products Controller And Auth Helper

**Files:**
- Create: `apps/api/src/modules/auth/current-user.ts`
- Create: `apps/api/src/modules/products/products.controller.ts`
- Create: `apps/api/src/modules/products/products.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Add current user helper**

Create `apps/api/src/modules/auth/current-user.ts`:

```ts
import { UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";

import { AuthService } from "./auth.service";
import { SESSION_COOKIE_NAME } from "./session";

export async function requireRequestUser(request: Request, authService: AuthService) {
  const token = request.cookies?.[SESSION_COOKIE_NAME];

  if (!token) {
    throw new UnauthorizedException("Sessao invalida.");
  }

  const user = await authService.getUserByToken(token);

  if (!user) {
    throw new UnauthorizedException("Sessao invalida.");
  }

  return user;
}
```

- [ ] **Step 2: Add products controller**

Create `apps/api/src/modules/products/products.controller.ts`:

```ts
import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import type { Request } from "express";

import { AuthService } from "../auth/auth.service";
import { requireRequestUser } from "../auth/current-user";
import { ProductsService } from "./products.service";
import { createProductSchema, updateProductSchema } from "./products.schemas";

@Controller("products")
export class ProductsController {
  constructor(
    private readonly authService: AuthService,
    private readonly productsService: ProductsService,
  ) {}

  @Get()
  async list(@Req() request: Request) {
    await requireRequestUser(request, this.authService);
    return this.productsService.listProducts();
  }

  @Get(":id")
  async getById(@Req() request: Request, @Param("id") id: string) {
    await requireRequestUser(request, this.authService);
    return { product: await this.productsService.getProduct(id) };
  }

  @Post()
  async create(@Req() request: Request, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    const input = createProductSchema.parse(body);
    return { product: await this.productsService.createProduct(user, input) };
  }

  @Patch(":id")
  async update(@Req() request: Request, @Param("id") id: string, @Body() body: unknown) {
    const user = await requireRequestUser(request, this.authService);
    const input = updateProductSchema.parse(body);
    return { product: await this.productsService.updateProduct(id, user, input) };
  }

  @Patch(":id/activate")
  async activate(@Req() request: Request, @Param("id") id: string) {
    const user = await requireRequestUser(request, this.authService);
    return { product: await this.productsService.activateProduct(id, user) };
  }

  @Patch(":id/deactivate")
  async deactivate(@Req() request: Request, @Param("id") id: string) {
    const user = await requireRequestUser(request, this.authService);
    return { product: await this.productsService.deactivateProduct(id, user) };
  }
}
```

- [ ] **Step 3: Add products module**

Create `apps/api/src/modules/products/products.module.ts`:

```ts
import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ProductsController } from "./products.controller";
import { ProductsRepository } from "./products.repository";
import { ProductsService } from "./products.service";

@Module({
  imports: [AuthModule],
  controllers: [ProductsController],
  providers: [ProductsRepository, ProductsService],
})
export class ProductsModule {}
```

- [ ] **Step 4: Register products module**

Modify `apps/api/src/app.module.ts`:

```ts
import { Module } from "@nestjs/common";

import { HealthModule } from "./health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ProductsModule } from "./modules/products/products.module";

@Module({
  imports: [HealthModule, AuthModule, ProductsModule],
})
export class AppModule {}
```

- [ ] **Step 5: Verify API typecheck and tests**

Run: `pnpm --filter api typecheck`

Expected: PASS.

Run: `pnpm --filter api test`

Expected: PASS.

---

### Task 4: Web Product API Proxies And Helpers

**Files:**
- Create: `apps/web/src/lib/products.ts`
- Create: `apps/web/src/lib/products.test.ts`
- Create: `apps/web/src/app/api/products/route.ts`
- Create: `apps/web/src/app/api/products/[id]/route.ts`
- Create: `apps/web/src/app/api/products/[id]/activate/route.ts`
- Create: `apps/web/src/app/api/products/[id]/deactivate/route.ts`

- [ ] **Step 1: Write failing web products helper tests**

Create `apps/web/src/lib/products.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { getProductStatusLabel, productFormToPayload } from "./products";

describe("web product helpers", () => {
  it("converts form data to an API payload", () => {
    const formData = new FormData();
    formData.set("name", "Galao 20L");
    formData.set("description", "Agua mineral");
    formData.set("salePrice", "12,50");
    formData.set("stockQuantity", "10");
    formData.set("minimumStock", "3");

    expect(productFormToPayload(formData)).toEqual({
      name: "Galao 20L",
      description: "Agua mineral",
      salePriceCents: 1250,
      stockQuantity: 10,
      minimumStock: 3,
    });
  });

  it("labels active and inactive products", () => {
    expect(getProductStatusLabel(true)).toBe("Ativo");
    expect(getProductStatusLabel(false)).toBe("Inativo");
  });
});
```

- [ ] **Step 2: Run helper tests to verify failure**

Run: `pnpm --filter web test -- src/lib/products.test.ts`

Expected: FAIL because `./products` does not exist.

- [ ] **Step 3: Implement products helper**

Create `apps/web/src/lib/products.ts`:

```ts
import { createProductSchema, parseBRLToCents, productsListResponseSchema, type ProductsListResponse } from "shared";

import { getServerApiUrl } from "./api";

export function productFormToPayload(formData: FormData) {
  return createProductSchema.parse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    salePriceCents: parseBRLToCents(String(formData.get("salePrice") ?? "")),
    stockQuantity: Number(formData.get("stockQuantity") ?? 0),
    minimumStock: Number(formData.get("minimumStock") ?? 0),
  });
}

export function getProductStatusLabel(isActive: boolean) {
  return isActive ? "Ativo" : "Inativo";
}

export async function fetchProducts(cookieHeader: string): Promise<ProductsListResponse> {
  const response = await fetch(`${getServerApiUrl()}/products`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!response.ok) {
    return { products: [], summary: { total: 0, active: 0, lowStock: 0 } };
  }

  return productsListResponseSchema.parse(await response.json());
}
```

- [ ] **Step 4: Add products list/create proxy**

Create `apps/web/src/app/api/products/route.ts`:

```ts
import { NextResponse } from "next/server";

import { getServerApiUrl } from "@/lib/api";

function cookieHeader(request: Request) {
  return request.headers.get("cookie") ?? "";
}

export async function GET(request: Request) {
  const response = await fetch(`${getServerApiUrl()}/products`, {
    headers: { cookie: cookieHeader(request) },
    cache: "no-store",
  });

  return NextResponse.json(await response.json(), { status: response.status });
}

export async function POST(request: Request) {
  const response = await fetch(`${getServerApiUrl()}/products`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookieHeader(request) },
    body: await request.text(),
    cache: "no-store",
  });

  return NextResponse.json(await response.json(), { status: response.status });
}
```

- [ ] **Step 5: Add product detail/update proxy**

Create `apps/web/src/app/api/products/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";

import { getServerApiUrl } from "@/lib/api";

type RouteContext = { params: Promise<{ id: string }> };

function cookieHeader(request: Request) {
  return request.headers.get("cookie") ?? "";
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const response = await fetch(`${getServerApiUrl()}/products/${id}`, {
    headers: { cookie: cookieHeader(request) },
    cache: "no-store",
  });

  return NextResponse.json(await response.json(), { status: response.status });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const response = await fetch(`${getServerApiUrl()}/products/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: cookieHeader(request) },
    body: await request.text(),
    cache: "no-store",
  });

  return NextResponse.json(await response.json(), { status: response.status });
}
```

- [ ] **Step 6: Add activation proxies**

Create `apps/web/src/app/api/products/[id]/activate/route.ts`:

```ts
import { NextResponse } from "next/server";

import { getServerApiUrl } from "@/lib/api";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const response = await fetch(`${getServerApiUrl()}/products/${id}/activate`, {
    method: "PATCH",
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
  });

  return NextResponse.json(await response.json(), { status: response.status });
}
```

Create `apps/web/src/app/api/products/[id]/deactivate/route.ts`:

```ts
import { NextResponse } from "next/server";

import { getServerApiUrl } from "@/lib/api";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const response = await fetch(`${getServerApiUrl()}/products/${id}/deactivate`, {
    method: "PATCH",
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
  });

  return NextResponse.json(await response.json(), { status: response.status });
}
```

- [ ] **Step 7: Verify web helper tests pass**

Run: `pnpm --filter web test -- src/lib/products.test.ts`

Expected: PASS.

---

### Task 5: Products Page UI

**Files:**
- Create: `apps/web/src/app/(app)/produtos/page.tsx`
- Create: `apps/web/src/app/(app)/produtos/products-ui.tsx`
- Create: `apps/web/src/app/(app)/produtos/products-ui.test.tsx`

- [ ] **Step 1: Write failing products UI tests**

Create `apps/web/src/app/(app)/produtos/products-ui.test.tsx`:

```tsx
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ProductsUi } from "./products-ui";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}));

const products = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Galao 20L",
    description: null,
    salePriceCents: 1200,
    stockQuantity: 2,
    minimumStock: 3,
    isActive: true,
    isLowStock: true,
    createdAt: "2026-06-15T00:00:00.000Z",
    updatedAt: "2026-06-15T00:00:00.000Z",
  },
];

describe("ProductsUi", () => {
  it("hides mutation controls from operators", () => {
    const html = renderToStaticMarkup(createElement(ProductsUi, { userRole: "OPERATOR", products, summary: { total: 1, active: 1, lowStock: 1 } }));

    expect(html).toContain("Galao 20L");
    expect(html).toContain("Estoque baixo");
    expect(html).not.toContain("Novo produto");
    expect(html).not.toContain("Editar");
  });

  it("shows mutation controls to admins", () => {
    const html = renderToStaticMarkup(createElement(ProductsUi, { userRole: "ADMIN", products, summary: { total: 1, active: 1, lowStock: 1 } }));

    expect(html).toContain("Novo produto");
    expect(html).toContain("Editar");
    expect(html).toContain("Inativar");
  });
});
```

- [ ] **Step 2: Run UI tests to verify failure**

Run: `pnpm --filter web test -- src/app/\(app\)/produtos/products-ui.test.tsx`

Expected: FAIL because `products-ui` does not exist.

- [ ] **Step 3: Implement products UI**

Create `apps/web/src/app/(app)/produtos/products-ui.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCentsToBRL, type ProductResponse, type UserRole } from "shared";

import { getProductStatusLabel, productFormToPayload } from "@/lib/products";

type ProductsUiProps = {
  userRole: UserRole;
  products: ProductResponse[];
  summary: { total: number; active: number; lowStock: number };
};

export function ProductsUi({ userRole, products, summary }: ProductsUiProps) {
  const router = useRouter();
  const [editingProduct, setEditingProduct] = useState<ProductResponse | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isAdmin = userRole === "ADMIN";

  async function saveProduct(formData: FormData) {
    setError(null);
    const payload = productFormToPayload(formData);
    const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
    const response = await fetch(url, {
      method: editingProduct ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setError("Confira os dados do produto.");
      return;
    }

    setFormOpen(false);
    setEditingProduct(null);
    startTransition(() => router.refresh());
  }

  async function toggleProduct(product: ProductResponse) {
    const action = product.isActive ? "deactivate" : "activate";
    const response = await fetch(`/api/products/${product.id}/${action}`, { method: "PATCH" });

    if (!response.ok) {
      setError("Voce nao tem permissao para alterar produtos.");
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-[#626260]">Produtos</p>
          <h1 className="mt-2 text-4xl font-medium tracking-[-0.8px]">Cadastro de produtos</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#626260]">Consulte produtos, precos e estoque. Alteracoes ficam restritas ao administrador.</p>
        </div>
        {isAdmin ? (
          <button className="rounded-lg bg-[#111111] px-4 py-2 text-sm font-medium text-white" onClick={() => { setEditingProduct(null); setFormOpen(true); }} type="button">
            Novo produto
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-[#d3cec6] bg-white p-5"><p className="text-sm text-[#626260]">Total</p><strong className="mt-3 block text-3xl font-medium">{summary.total}</strong></article>
        <article className="rounded-2xl border border-[#d3cec6] bg-white p-5"><p className="text-sm text-[#626260]">Ativos</p><strong className="mt-3 block text-3xl font-medium">{summary.active}</strong></article>
        <article className="rounded-2xl border border-[#d3cec6] bg-white p-5"><p className="text-sm text-[#626260]">Estoque baixo</p><strong className="mt-3 block text-3xl font-medium">{summary.lowStock}</strong></article>
      </div>

      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {isAdmin && formOpen ? (
        <form action={saveProduct} className="grid gap-4 rounded-2xl border border-[#d3cec6] bg-white p-5 md:grid-cols-2">
          <label className="space-y-2"><span className="text-sm font-medium">Nome</span><input className="h-11 w-full rounded-lg border border-[#d3cec6] px-3" name="name" required defaultValue={editingProduct?.name ?? ""} /></label>
          <label className="space-y-2"><span className="text-sm font-medium">Preco de venda</span><input className="h-11 w-full rounded-lg border border-[#d3cec6] px-3" name="salePrice" required defaultValue={editingProduct ? String(editingProduct.salePriceCents / 100).replace(".", ",") : ""} /></label>
          <label className="space-y-2"><span className="text-sm font-medium">Estoque atual</span><input className="h-11 w-full rounded-lg border border-[#d3cec6] px-3" name="stockQuantity" min="0" type="number" required defaultValue={editingProduct?.stockQuantity ?? 0} /></label>
          <label className="space-y-2"><span className="text-sm font-medium">Estoque minimo</span><input className="h-11 w-full rounded-lg border border-[#d3cec6] px-3" name="minimumStock" min="0" type="number" required defaultValue={editingProduct?.minimumStock ?? 0} /></label>
          <label className="space-y-2 md:col-span-2"><span className="text-sm font-medium">Descricao</span><textarea className="min-h-24 w-full rounded-lg border border-[#d3cec6] px-3 py-2" name="description" defaultValue={editingProduct?.description ?? ""} /></label>
          <div className="flex gap-2 md:col-span-2"><button className="rounded-lg bg-[#111111] px-4 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={isPending} type="submit">Salvar</button><button className="rounded-lg border border-[#d3cec6] bg-white px-4 py-2 text-sm font-medium" onClick={() => { setFormOpen(false); setEditingProduct(null); }} type="button">Cancelar</button></div>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[#d3cec6] bg-white">
        {products.length === 0 ? <p className="p-5 text-sm text-[#626260]">Nenhum produto cadastrado.</p> : null}
        {products.map((product) => (
          <article className="grid gap-3 border-b border-[#ebe7e1] p-5 last:border-b-0 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_auto] lg:items-center" key={product.id}>
            <div><h2 className="text-lg font-medium">{product.name}</h2><p className="text-sm text-[#626260]">{product.description ?? "Sem descricao"}</p></div>
            <p className="text-sm"><span className="text-[#626260]">Preco</span><br />{formatCentsToBRL(product.salePriceCents)}</p>
            <p className="text-sm"><span className="text-[#626260]">Estoque</span><br />{product.stockQuantity} / min. {product.minimumStock}</p>
            <div className="flex flex-wrap gap-2"><span className="rounded-full bg-[#f5f1ec] px-3 py-1 text-xs font-medium">{getProductStatusLabel(product.isActive)}</span>{product.isLowStock ? <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">Estoque baixo</span> : null}</div>
            {isAdmin ? <div className="flex gap-2"><button className="rounded-lg border border-[#d3cec6] px-3 py-2 text-sm" onClick={() => { setEditingProduct(product); setFormOpen(true); }} type="button">Editar</button><button className="rounded-lg border border-[#d3cec6] px-3 py-2 text-sm" onClick={() => void toggleProduct(product)} type="button">{product.isActive ? "Inativar" : "Ativar"}</button></div> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Implement products page**

Create `apps/web/src/app/(app)/produtos/page.tsx`:

```tsx
import { cookies } from "next/headers";

import { requireUser } from "@/lib/auth";
import { fetchProducts } from "@/lib/products";
import { ProductsUi } from "./products-ui";

export default async function ProductsPage() {
  const user = await requireUser();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  const data = await fetchProducts(cookieHeader);

  return <ProductsUi userRole={user.role} products={data.products} summary={data.summary} />;
}
```

- [ ] **Step 5: Verify products UI tests pass**

Run: `pnpm --filter web test -- src/app/\(app\)/produtos/products-ui.test.tsx`

Expected: PASS.

---

### Task 6: Verification

**Files:**
- No expected file changes unless verification reveals a bug.

- [ ] **Step 1: Run API tests**

Run: `pnpm --filter api test`

Expected: PASS.

- [ ] **Step 2: Run web tests**

Run: `pnpm --filter web test`

Expected: PASS.

- [ ] **Step 3: Run shared tests**

Run: `pnpm --filter shared test`

Expected: PASS.

- [ ] **Step 4: Run monorepo typecheck**

Run: `pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Run monorepo lint**

Run: `pnpm lint`

Expected: PASS.

- [ ] **Step 6: Run monorepo build**

Run: `pnpm build`

Expected: PASS.

- [ ] **Step 7: Check web has no DB imports**

Run: `rg "drizzle|postgres|@/db|src/db|db/schema" apps/web/src apps/web/package.json`

Expected: no matches.

- [ ] **Step 8: Manual smoke test**

Run: `docker compose up -d`

Run: `pnpm db:migrate`

Run: `pnpm db:seed`

Run: `pnpm dev`

Open `http://localhost:3000/produtos` as admin.

Expected:
- page loads;
- admin can create a product;
- product appears in the list;
- editing changes the product;
- inactivating changes the status;
- operator account, when available, does not see mutation controls.

---

## Self-Review

- Spec coverage: The plan covers API list/get/create/update/activate/deactivate, role permissions, Next `/produtos`, low-stock display, active/inactive badges, centavos handling, route handlers, and verification.
- Scope: No categories, barcode, suppliers, advanced pagination, imports, or gallon-specific stock were added.
- Type consistency: Product fields match `products` schema: `salePriceCents`, `stockQuantity`, `minimumStock`, `isActive`.
- Risk note: The service code for `activateProduct` and `deactivateProduct` uses a cast because repository `update` is shared with full product update. During implementation, prefer improving repository typing if this causes type issues rather than weakening validation.
