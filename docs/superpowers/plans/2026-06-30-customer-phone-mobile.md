# Customer Phone Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add separate `Telefone` and `Celular` fields for customers and refine `/vendas` search/product behavior without expanding beyond MVP.

**Architecture:** Add a nullable `mobile_phone` column to `customers`, expose it as `mobilePhone` through shared contracts and API DTOs, and keep sale/customer search as a single operational search field. Preserve existing sale/stock rules on the server and make UI changes only around customer/product selection clarity.

**Tech Stack:** PostgreSQL, Drizzle ORM, NestJS, Zod shared contracts, Next.js App Router, React, Tailwind CSS, Vitest.

## Global Constraints

- Cliente has two optional contact fields: `phone` and `mobile_phone`.
- UI labels must be `Telefone` and `Celular`.
- `/vendas` customer search must use one field for `nome`, `telefone`, `celular`, `codigo` and `endereco`.
- `/vendas` must reduce explanatory copy and avoid visual pollution.
- Product search results must close and search text must clear after selecting a product.
- Do not add multiple customer phone tables in this increment.
- Do not add WhatsApp integration or principal contact selection.
- Do not move sale, stock, or finance rules to the frontend.
- Create a new Drizzle migration; do not edit old migrations.

---

## File Structure

- Modify: `apps/api/src/db/schema.ts` adds `mobilePhone: text("mobile_phone")` to `customers`.
- Create: `apps/api/drizzle/0007_customer_mobile_phone.sql` or the next generated Drizzle migration file name, adding `mobile_phone` to `customers`.
- Modify: `packages/shared/src/customers.ts` adds `mobilePhone` to customer input/response/duplicate schemas.
- Modify: `packages/shared/src/sales.ts` adds `mobilePhone` to quick customer input and sale customer response.
- Modify tests: `packages/shared/src/customers.test.ts`, `packages/shared/src/sales.test.ts`.
- Modify API: customer and sales repositories/services/controllers/tests under `apps/api/src/modules/customers` and `apps/api/src/modules/sales`.
- Modify seed: `apps/api/scripts/seed-dev.ts` and seed helpers if present.
- Modify web: `apps/web/src/app/(app)/clientes/customers-ui.tsx`, `apps/web/src/app/(app)/clientes` tests, `apps/web/src/app/(app)/vendas/sales-ui.tsx`, `apps/web/src/app/(app)/vendas/sales-ui.test.tsx`, `apps/web/src/lib/sales.ts`, `apps/web/src/lib/customers.ts` if needed.

---

### Task 1: Data Model And Shared Contracts

**Files:**
- Modify: `apps/api/src/db/schema.ts`
- Create: next migration in `apps/api/drizzle/`
- Modify: `packages/shared/src/customers.ts`
- Modify: `packages/shared/src/sales.ts`
- Test: `packages/shared/src/customers.test.ts`
- Test: `packages/shared/src/sales.test.ts`

**Interfaces:**
- Produces `customers.mobilePhone` mapped to database column `mobile_phone`.
- Produces `mobilePhone?: string | null` for create/update input schemas.
- Produces `mobilePhone: string | null` for customer and sale-customer responses.

- [ ] **Step 1: Write shared contract tests**

Add tests that parse customer create/update/response and quick sale customer payloads with `mobilePhone`:

```ts
expect(createCustomerSchema.parse({ name: "Maria", phone: "1133333333", mobilePhone: "11999999999" })).toMatchObject({
  name: "Maria",
  phone: "1133333333",
  mobilePhone: "11999999999",
});

expect(customerResponseSchema.parse({
  id: "11111111-1111-4111-8111-111111111111",
  name: "Maria",
  phone: "1133333333",
  mobilePhone: "11999999999",
  address: null,
  notes: null,
  isActive: true,
  hasBottleAlert: false,
  createdAt: "2026-06-30T00:00:00.000Z",
  updatedAt: "2026-06-30T00:00:00.000Z",
})).toMatchObject({ mobilePhone: "11999999999" });
```

Add equivalent sales contract expectations:

```ts
expect(quickCustomerInputSchema.parse({ name: "Maria", phone: "1133333333", mobilePhone: "11999999999" })).toMatchObject({
  mobilePhone: "11999999999",
});

expect(saleCustomerResponseSchema.parse({
  id: "11111111-1111-4111-8111-111111111111",
  name: "Maria",
  phone: "1133333333",
  mobilePhone: "11999999999",
  code: null,
  address: null,
  previousBottle: null,
})).toMatchObject({ mobilePhone: "11999999999" });
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm --dir packages/shared exec vitest run src/customers.test.ts src/sales.test.ts
```

Expected: FAIL because `mobilePhone` is not in the schemas.

- [ ] **Step 3: Implement schema and contracts**

In `apps/api/src/db/schema.ts`, add:

```ts
mobilePhone: text("mobile_phone"),
```

after `phone` in `customers`.

In `packages/shared/src/customers.ts`, add `mobilePhone: phoneSchema` to create/update input schemas and `mobilePhone: z.string().nullable()` to customer response and duplicate response items.

In `packages/shared/src/sales.ts`, add `mobilePhone` to `quickCustomerInputSchema` and `saleCustomerResponseSchema`.

- [ ] **Step 4: Add migration**

Create the next migration file under `apps/api/drizzle/` with:

```sql
ALTER TABLE "customers" ADD COLUMN "mobile_phone" text;
```

If Drizzle meta snapshots are maintained in this repo, run the project migration generation command and keep the generated meta consistent instead of hand-writing only SQL.

- [ ] **Step 5: Run shared tests**

Run:

```bash
pnpm --dir packages/shared exec vitest run src/customers.test.ts src/sales.test.ts
```

Expected: PASS.

---

### Task 2: API Customers And Sales Search

**Files:**
- Modify: `apps/api/src/modules/customers/customers.repository.ts`
- Modify: `apps/api/src/modules/customers/customers.service.ts`
- Modify: `apps/api/src/modules/customers/customers.controller.ts` if duplicate endpoint payload needs `mobilePhone`.
- Modify: `apps/api/src/modules/sales/sales.repository.ts`
- Modify: `apps/api/src/modules/sales/sales.service.ts`
- Modify: relevant API tests in `apps/api/src/modules/customers/*.test.ts` and `apps/api/src/modules/sales/*.test.ts`

**Interfaces:**
- Consumes `mobilePhone` from shared schemas.
- Produces customer responses and sale customer search responses with `mobilePhone`.
- `SalesRepository.searchCustomers(query)` must search name, phone, mobilePhone, code, and address.

- [ ] **Step 1: Add failing API tests**

Update sales repository tests to expect search by mobile phone. Add this concrete test to `apps/api/src/modules/sales/sales.repository.test.ts`, adapting only table cleanup/setup names to the existing file if needed:

```ts
it("searches customers by mobile phone", async () => {
  await db.insert(customers).values({ name: "Cliente Celular", phone: null, mobilePhone: "11999999999" });

  const result = await repository.searchCustomers("9999");

  expect(result).toEqual([
    expect.objectContaining({
      name: "Cliente Celular",
      phone: null,
      mobilePhone: "11999999999",
    }),
  ]);
});
```

Update customers service/repository tests to include exact `mobilePhone` expectations in create/update/list responses and duplicate payloads. Example assertion for a returned customer:

```ts
expect(customer).toMatchObject({
  name: "Maria",
  phone: "1133333333",
  mobilePhone: "11999999999",
});
```

- [ ] **Step 2: Run focused API tests to verify failure**

Run:

```bash
pnpm --dir apps/api exec vitest run src/modules/customers src/modules/sales
```

Expected: FAIL on missing `mobilePhone` behavior.

- [ ] **Step 3: Implement API mapping**

Update repository selects/search clauses to include `customers.mobilePhone`.

In `sales.repository.ts`, replace split primary/secondary search with a single query clause when possible:

```ts
const normalizedQuery = primaryQuery.trim() || secondaryQuery.trim();
const queryClause = or(
  ilike(customers.name, `%${normalizedQuery}%`),
  ilike(customers.phone, `%${normalizedQuery}%`),
  ilike(customers.mobilePhone, `%${normalizedQuery}%`),
  ilike(customers.code, `%${normalizedQuery}%`),
  ilike(customers.address, `%${normalizedQuery}%`),
);
```

Keep backward compatibility with the existing function signature by combining `primaryQuery` and `secondaryQuery` into one normalized search string if both are passed.

Update quick customer creation input to include `mobilePhone`.

- [ ] **Step 4: Run focused API tests**

Run:

```bash
pnpm --dir apps/api exec vitest run src/modules/customers src/modules/sales
```

Expected: PASS.

---

### Task 3: Web Customers UI

**Files:**
- Modify: `apps/web/src/app/(app)/clientes/customers-ui.tsx`
- Modify: `apps/web/src/app/(app)/clientes` tests if present
- Modify: `apps/web/src/lib/customers.ts` if it maps payloads/responses explicitly

**Interfaces:**
- Consumes `CustomerResponse.mobilePhone`.
- Produces create/update payloads with `phone` and `mobilePhone`.

- [ ] **Step 1: Add failing UI test expectations**

Update customers UI tests to expect labels/text `Telefone` and `Celular`, and table/card display of both when available.

- [ ] **Step 2: Run focused web customer tests**

Run:

```bash
pnpm --dir apps/web exec vitest run "src/app/(app)/clientes/**/*.test.tsx" "src/lib/customers.test.ts"
```

Expected: FAIL until UI and helpers include `mobilePhone`.

- [ ] **Step 3: Implement UI fields**

In customer create/edit forms, include separate fields:

```tsx
<Field label="Telefone">
  <TextInput name="phone" placeholder="(00) 0000-0000" />
</Field>
<Field label="Celular">
  <TextInput name="mobilePhone" placeholder="(00) 00000-0000" />
</Field>
```

Update table/card display to show compact contact text, for example:

```tsx
{customer.mobilePhone ? `Cel: ${customer.mobilePhone}` : null}
{customer.phone ? `Tel: ${customer.phone}` : null}
```

Search in UI should match name, phone, and mobilePhone.

- [ ] **Step 4: Run focused web customer tests**

Run:

```bash
pnpm --dir apps/web exec vitest run "src/app/(app)/clientes/**/*.test.tsx" "src/lib/customers.test.ts"
```

Expected: PASS.

---

### Task 4: Web Sales UI Search Refinement

**Files:**
- Modify: `apps/web/src/app/(app)/vendas/sales-ui.tsx`
- Modify: `apps/web/src/app/(app)/vendas/sales-ui.test.tsx`
- Modify: `apps/web/src/lib/sales.ts`
- Modify: `apps/web/src/lib/sales.test.ts`

**Interfaces:**
- Consumes `SaleCustomerResponse.mobilePhone`.
- Produces quick customer payload with optional `mobilePhone`.
- Customer search UI uses one state variable and one input.

- [ ] **Step 1: Add failing tests for sales UI behavior/copy**

Update `sales-ui.test.tsx` expectations:

```ts
expect(html).toContain("Buscar cliente");
expect(html).toContain("Nome, telefone, celular, codigo ou endereco");
expect(html).not.toContain("Busque por nome, telefone, codigo ou endereco.");
expect(html).toContain("Celular");
expect(html).toContain("Telefone");
```

Add a helper-level test in `src/lib/sales.test.ts` ensuring quick customer payload accepts `mobilePhone`.

- [ ] **Step 2: Run focused tests to verify failure**

Run:

```bash
pnpm --dir apps/web exec vitest run "src/app/(app)/vendas/sales-ui.test.tsx" src/lib/sales.test.ts
```

Expected: FAIL until UI/helper are updated.

- [ ] **Step 3: Simplify customer search state**

In `sales-ui.tsx`, replace `primaryCustomerQuery` and `secondaryCustomerQuery` with one `customerQuery` state.

Update `searchCustomers()` to call:

```ts
const query = customerQuery.trim();
const result = await searchSaleCustomers(query);
```

When a customer is selected, clear `customerQuery` and `customerResults`.

- [ ] **Step 4: Make product selection close results**

In `addProductToCart(product)`, after updating cart, add:

```ts
setProductQuery("");
```

This closes the product result list after selection and prevents accidental repeated clicks from the open list.

- [ ] **Step 5: Reduce copy in `/vendas`**

Remove long helper paragraphs added earlier. Keep short headings and placeholders:

- Customer heading: `Cliente` or `1. Cliente`.
- Product heading: `Produto` or `2. Produto`.
- Cart heading: `Carrinho e pagamento`.
- Customer search placeholder: `Nome, telefone, celular, codigo ou endereco`.
- Product search placeholder: `Buscar produto ativo`.

Remove the extra paragraph `Busque um produto e use Adicionar item para colocar no carrinho.` unless a test explicitly requires it; prefer testing the actual product result when possible.

- [ ] **Step 6: Add mobile phone to quick customer drawer**

Add state `quickCustomerMobilePhone` and field:

```tsx
<Field label="Celular">
  <TextInput inputMode="tel" value={quickCustomerMobilePhone} onChange={(event) => setQuickCustomerMobilePhone(event.target.value)} />
</Field>
<Field label="Telefone">
  <TextInput inputMode="tel" value={quickCustomerPhone} onChange={(event) => setQuickCustomerPhone(event.target.value)} />
</Field>
```

Send `mobilePhone: quickCustomerMobilePhone.trim() || null` in `createSaleCustomer()`.

- [ ] **Step 7: Run focused sales web tests**

Run:

```bash
pnpm --dir apps/web exec vitest run "src/app/(app)/vendas/sales-ui.test.tsx" src/lib/sales.test.ts
```

Expected: PASS.

---

### Task 5: Seed, Local DB, And Full Verification

**Files:**
- Modify: `apps/api/scripts/seed-dev.ts` and seed helper files if customers are generated elsewhere.
- No production data import script in this increment.

**Interfaces:**
- Produces dev customers with combinations of `phone`, `mobilePhone`, both, and neither.

- [ ] **Step 1: Update seed data**

Ensure seeded customers include realistic combinations:

```ts
{ phone: "1133333333", mobilePhone: "11999999999" }
{ phone: null, mobilePhone: "11988888888" }
{ phone: "1132222222", mobilePhone: null }
```

- [ ] **Step 2: Run broad tests**

Run:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
```

Expected: all pass.

- [ ] **Step 3: Apply DB changes locally**

Run:

```bash
pnpm run db:push
ALLOW_SEED=true pnpm run db:seed
```

Expected: schema updated and seed completes.

- [ ] **Step 4: Manual smoke test**

Use dev server and verify:

- `/clientes` shows and edits `Telefone` and `Celular`.
- `/vendas` customer search finds by celular.
- Selecting product closes product results.
- Selecting customer closes customer results.
- Quick customer creation can save celular and telefone.

---

## Self-Review

- Spec coverage: covers data model, contracts, API, seed, customers UI, sales UI, search, and reduced copy.
- Placeholder scan: no TBD/TODO/fill-in-later text remains.
- Type consistency: database uses `mobile_phone`, TypeScript uses `mobilePhone`, existing `phone` remains `phone`.
- Scope check: no multiple-phone table, no WhatsApp integration, no principal contact selection, no legacy importer.
