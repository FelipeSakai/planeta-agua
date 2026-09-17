# Store Default Customer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure every new sale has a customer by using the default customer `Loja` when the operator does not select a real customer.

**Architecture:** Keep the rule enforced at both contract/service and UI layers. Seed creates an active customer named `Loja`; web selects that customer as fallback; API rejects any create sale payload without customer id.

**Tech Stack:** TypeScript, Next.js App Router, NestJS, Drizzle ORM, Zod, Vitest.

## Global Constraints

- Customer name is exactly `Loja`.
- New finalized sales cannot have `customerId: null`.
- No new store/branch/entity model in this MVP.
- Preserve existing sale transaction, stock decrement, finance entry, cancellation, and delivery behavior.
- Existing historical sales with null customer may remain unchanged.

---

### Task 1: Shared Contract Requires Customer

**Files:**
- Modify: `packages/shared/src/sales.ts`
- Modify: `packages/shared/src/sales.test.ts`

**Interfaces:**
- Produces: `createSaleInputSchema` with required `customerId: z.string().uuid()`.
- Consumes: Existing web/API imports of `createSaleInputSchema`.

- [ ] **Step 1: Write failing test**

Add to `packages/shared/src/sales.test.ts`:

```ts
it("rejects sale creation without a customer", () => {
  expect(() =>
    createSaleInputSchema.parse({
      customerId: null,
      paymentMethod: "PIX",
      items: [{ productId: "11111111-1111-4111-8111-111111111111", quantity: 1 }],
      bottle: null,
    }),
  ).toThrow();
});
```

- [ ] **Step 2: Run red test**

Run: `pnpm --dir packages/shared exec vitest run src/sales.test.ts`
Expected: FAIL because `customerId: null` is currently accepted.

- [ ] **Step 3: Implement schema change**

Change `packages/shared/src/sales.ts`:

```ts
export const createSaleInputSchema = z.object({
  customerId: z.string().uuid(),
  paymentMethod: z.enum(paymentMethodValues),
  items: z.array(saleItemInputSchema).min(1),
  bottle: customerBottleRecordSchema,
  deliveryPending: z.boolean().default(false),
  driverId: z.string().uuid().nullable().optional(),
});
```

- [ ] **Step 4: Update existing tests expecting null customer**

Replace `customerId: null` in sale creation contract tests with a fixed UUID:

```ts
customerId: "55555555-5555-4555-8555-555555555555"
```

- [ ] **Step 5: Run green test**

Run: `pnpm --dir packages/shared exec vitest run src/sales.test.ts`
Expected: PASS.

---

### Task 2: API Rejects Missing Customer Clearly

**Files:**
- Modify: `apps/api/src/modules/sales/sales.service.test.ts`
- Modify: `apps/api/src/modules/sales/sales.service.ts`

**Interfaces:**
- Consumes: Updated `createSaleInputSchema`.
- Produces: `BadRequestException("Selecione um cliente para finalizar a venda.")` for null or missing customer.

- [ ] **Step 1: Write failing service test**

Add to `apps/api/src/modules/sales/sales.service.test.ts`:

```ts
it("rejects creating a sale without customer", async () => {
  const repository = createRepository();
  const service = new SalesService(repository as never, createFinanceService() as never);

  await expect(
    service.createSale(operatorUser, {
      customerId: null,
      paymentMethod: "PIX",
      items: [{ productId: "33333333-3333-4333-8333-333333333333", quantity: 1 }],
      bottle: null,
      deliveryPending: false,
    } as never),
  ).rejects.toMatchObject({ message: "Selecione um cliente para finalizar a venda." });
  expect(repository.createSale).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run red test**

Run: `pnpm --dir apps/api exec vitest run src/modules/sales/sales.service.test.ts`
Expected: FAIL with old generic invalid data message.

- [ ] **Step 3: Implement clear validation branch**

In `SalesService.createSale`, before schema parse, add:

```ts
if (!input.customerId) {
  throw new BadRequestException("Selecione um cliente para finalizar a venda.");
}
```

- [ ] **Step 4: Run green test**

Run: `pnpm --dir apps/api exec vitest run src/modules/sales/sales.service.test.ts`
Expected: PASS.

---

### Task 3: Seed Default Customer Loja

**Files:**
- Modify: `apps/api/scripts/seed/customers.ts`

**Interfaces:**
- Produces: exported `storeCustomerId` string.
- Produces: seed customer row `{ id: storeCustomerId, name: "Loja", isActive: true }`.
- Existing `customerIds` remains for sale seed behavior.

- [ ] **Step 1: Add failing seed test if existing seed tests cover customers; otherwise use typecheck and code review**

No existing customer seed unit test exists. Keep this task minimal and verify through `db:seed` after implementation.

- [ ] **Step 2: Implement seed row**

Change `apps/api/scripts/seed/customers.ts`:

```ts
export const storeCustomerId = "00000000-0000-4000-8000-000000000000";

const customerNames = [
  "Loja",
  "Joao Silva", "Maria Santos", "Jose Oliveira", "Ana Costa", "Carlos Souza",
  ...
];
```

Update `customerIds` to exclude the store customer if sale seed should keep rotating through real customers:

```ts
export const customerIds = customerUuids.slice(1);
```

Ensure `Loja` has `phone: null`, `mobilePhone: null`, `address: null`, `notes: "Cliente padrao para vendas feitas na loja"`, `isActive: true`.

- [ ] **Step 3: Verify seed compiles**

Run: `pnpm --dir apps/api run typecheck`
Expected: PASS.

---

### Task 4: Web Uses Loja As Fallback

**Files:**
- Modify: `apps/web/src/lib/sales.ts`
- Modify: `apps/web/src/lib/sales.test.ts`
- Modify: `apps/web/src/app/(app)/vendas/sales-ui.tsx`
- Modify: `apps/web/src/app/(app)/vendas/sales-ui.test.tsx`

**Interfaces:**
- Produces: `saleFormToPayload` now accepts `customerId: string`.
- Produces: `findStoreCustomer(customers: SalesCustomerOption[]): SalesCustomerOption | null` exported from `sales-ui.tsx`.
- UI passes selected customer id or store customer id to `saleFormToPayload`.

- [ ] **Step 1: Write failing helper test**

In `apps/web/src/lib/sales.test.ts`, update the payload test to expect no null customer, and add:

```ts
it("rejects a sale payload without customer id", () => {
  expect(() =>
    saleFormToPayload({
      customerId: null as never,
      paymentMethod: "PIX",
      items: [{ productId: "33333333-3333-4333-8333-333333333333", quantity: 1 }],
      bottleMonth: "",
      bottleYear: "",
      bottleNotes: "",
      deliveryPending: false,
      driverId: null,
    }),
  ).toThrow();
});
```

- [ ] **Step 2: Write failing UI tests**

In `apps/web/src/app/(app)/vendas/sales-ui.test.tsx`, add:

```ts
it("renders the store customer fallback copy", () => {
  const html = renderToStaticMarkup(createElement(SalesUi, { userRole: "OPERATOR", products: [], customers: [], drivers: [] }));

  expect(html).toContain("Venda na loja");
  expect(html).toContain("registrada como Loja");
  expect(html).not.toContain("Venda sem cliente");
});

it("finds the default store customer by name", () => {
  expect(findStoreCustomer([{ id: "c1", name: "Loja", phone: null, mobilePhone: null, code: null, address: null, previousBottle: null }])).toMatchObject({ id: "c1" });
});
```

- [ ] **Step 3: Run red tests**

Run: `pnpm --dir apps/web exec vitest run src/lib/sales.test.ts "src/app/(app)/vendas/sales-ui.test.tsx"`
Expected: FAIL because null is still accepted/copy still says venda sem cliente/no helper exists.

- [ ] **Step 4: Implement helper and UI fallback**

Add `findStoreCustomer` in `sales-ui.tsx`:

```ts
export function findStoreCustomer(customers: SalesCustomerOption[]) {
  return customers.find((customer) => customer.name.trim().toLocaleLowerCase("pt-BR") === "loja") ?? null;
}
```

When building sale payload, compute:

```ts
const storeCustomer = findStoreCustomer(customerDirectory);
const saleCustomerId = selectedCustomerId || storeCustomer?.id || null;
```

If `saleCustomerId` is null, show:

```ts
setError("Cliente Loja nao encontrado. Rode o seed ou cadastre o cliente Loja.");
return;
```

Change copy to:

```tsx
<span className="font-medium text-[var(--foreground)]">Venda na loja:</span> se nenhum cliente for escolhido, a venda sera registrada como Loja.
```

- [ ] **Step 5: Update `saleFormToPayload` input type**

In `apps/web/src/lib/sales.ts`, change:

```ts
customerId: string;
```

- [ ] **Step 6: Run green tests**

Run: `pnpm --dir apps/web exec vitest run src/lib/sales.test.ts "src/app/(app)/vendas/sales-ui.test.tsx"`
Expected: PASS.

---

### Task 5: Final Verification And Seed

**Files:**
- No new files.

**Interfaces:**
- Verifies the complete feature.

- [ ] **Step 1: Run focused tests**

Run:

```bash
pnpm --dir packages/shared exec vitest run src/sales.test.ts
pnpm --dir apps/api exec vitest run src/modules/sales/sales.service.test.ts
pnpm --dir apps/web exec vitest run src/lib/sales.test.ts "src/app/(app)/vendas/sales-ui.test.tsx"
```

Expected: all PASS.

- [ ] **Step 2: Run typecheck and lint**

Run:

```bash
pnpm run typecheck
pnpm run lint
```

Expected: all PASS.

- [ ] **Step 3: Apply schema and seed**

Run:

```bash
pnpm run db:push
ALLOW_SEED=true pnpm run db:seed
```

Expected: seed logs include created customers and no errors.

- [ ] **Step 4: Smoke check dev app**

With API/web already running, login and request `/vendas`:

```bash
curl -s -c "C:/Users/felip/AppData/Local/Temp/opencode/planeta-agua-cookies.txt" -X POST http://localhost:3000/api/auth/login -H "content-type: application/json" --data "{\"email\":\"admin@planetaagua.local\",\"password\":\"admin123\"}" > /dev/null
curl -s -i -b "C:/Users/felip/AppData/Local/Temp/opencode/planeta-agua-cookies.txt" http://localhost:3000/vendas
```

Expected: `HTTP/1.1 200 OK` and HTML contains `Venda na loja`.
