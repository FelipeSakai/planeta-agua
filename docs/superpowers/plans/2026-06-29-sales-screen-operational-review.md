# Sales Screen Operational Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve `/vendas` so the operator can register a sale faster, with clearer customer/product/cart/payment hierarchy and consistent design components.

**Architecture:** Keep the existing client component and server data flow. Make the smallest correct UI changes inside `SalesUi`, only extracting tiny local helpers if they reduce repeated markup in the same file. Do not move sale, stock, or payment rules to the frontend.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, shared UI components in `apps/web/src/components/ui`, Vitest server-render tests.

## Global Constraints

- Use the `impeccable` skill before editing the UI.
- Preserve MVP scope: no payment integration, WhatsApp, nota fiscal, reports, or new modules.
- Preserve server-side validation for sale, stock, cash, delivery, and customer rules.
- Do not add new dependencies for this screen review.
- Use existing shared UI components: `Button`, `Field`, `TextInput`, `SelectInput`, `Panel`, `Badge`, `Alert`, `EmptyState`, `Drawer`.
- Keep desktop and mobile usable without horizontal overflow.
- Keep copy clear for non-technical operators.

---

## File Structure

- Modify: `apps/web/src/app/(app)/vendas/sales-ui.tsx`
  - Owns the sales page client UI, local state, customer/product selection, cart editing, payment fields, quick customer drawer, and sale finalization.
- Modify: `apps/web/src/app/(app)/vendas/sales-ui.test.tsx`
  - Server-render tests for visible structure and copy that should remain stable.
- Read only unless a shared inconsistency blocks the screen: `apps/web/src/components/ui/button.tsx`, `apps/web/src/components/ui/form-controls.tsx`, `apps/web/src/components/ui/panel.tsx`, `apps/web/src/components/ui/badge.tsx`, `apps/web/src/components/ui/alert.tsx`.
- Read only: `docs/superpowers/specs/2026-06-29-screen-by-screen-operational-review-design.md`.

---

### Task 1: Lock The Intended Sales Page Structure In Tests

**Files:**
- Modify: `apps/web/src/app/(app)/vendas/sales-ui.test.tsx`

**Interfaces:**
- Consumes: `SalesUi` exported from `./sales-ui`.
- Produces: test assertions for stable sales screen labels and hierarchy.

- [ ] **Step 1: Add tests for the revised operational structure**

Append these assertions inside the existing `describe("SalesUi", () => { ... })` block:

```tsx
  it("renders the sales workflow in the expected operational order", () => {
    const html = renderToStaticMarkup(
      createElement(SalesUi, {
        userRole: "OPERATOR",
        products: [],
        customers: [],
        drivers: [],
      }),
    );

    expect(html).toContain("1. Cliente");
    expect(html).toContain("2. Produto");
    expect(html).toContain("3. Carrinho e pagamento");
    expect(html).toContain("Venda sem cliente");
    expect(html).toContain("Adicionar item");
    expect(html).toContain("Total da venda");
  });

  it("renders clearer cart empty and disabled-finalize guidance", () => {
    const html = renderToStaticMarkup(
      createElement(SalesUi, {
        userRole: "OPERATOR",
        products: [],
        customers: [],
        drivers: [],
      }),
    );

    expect(html).toContain("Adicione produtos para liberar a finalizacao.");
    expect(html).toContain("A venda baixa estoque automaticamente ao finalizar.");
  });
```

- [ ] **Step 2: Update existing assertions whose copy changes intentionally**

Change the current product search assertion from:

```tsx
expect(html).toContain("Digite o nome do produto");
```

to:

```tsx
expect(html).toContain("Buscar produto ativo");
```

- [ ] **Step 3: Run tests to verify they fail before implementation**

Run:

```bash
pnpm --dir apps/web exec vitest run "src/app/(app)/vendas/sales-ui.test.tsx"
```

Expected: FAIL because `1. Cliente`, `2. Produto`, `3. Carrinho e pagamento`, `Venda sem cliente`, `Adicionar item`, `Total da venda`, and the new guidance copy do not exist yet.

---

### Task 2: Improve Page Header, History Link, And Customer Panel

**Files:**
- Modify: `apps/web/src/app/(app)/vendas/sales-ui.tsx`

**Interfaces:**
- Consumes: existing local state and handlers: `selectedCustomer`, `clearSelectedCustomer`, `searchCustomers`, `selectCustomerFromSearch`, `setIsCustomerDrawerOpen`.
- Produces: stable visible labels `1. Cliente` and `Venda sem cliente` for tests and operator orientation.

- [ ] **Step 1: Replace the top header/link block**

Replace lines currently equivalent to:

```tsx
<PageHeader eyebrow="Operacao" title="Vendas" />

<div className="flex justify-end">
  <Link href="/vendas/historico" className="text-base text-[var(--brand)] hover:underline">
    Ver historico -&gt;
  </Link>
</div>
```

with:

```tsx
<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
  <PageHeader
    eyebrow="Operacao"
    title="Vendas"
    description="Registre venda, pagamento e entrega em um fluxo rapido. O estoque baixa automaticamente ao finalizar."
  />
  <Button asChild={false} className="w-full md:w-auto" variant="secondary">
    <Link href="/vendas/historico">Ver historico</Link>
  </Button>
</div>
```

If `Button` does not accept `asChild`, do not add that prop. Use this valid markup instead:

```tsx
<Link
  href="/vendas/historico"
  className="inline-flex min-h-10 w-full items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition duration-150 hover:bg-[var(--card-muted)] md:w-auto"
>
  Ver historico
</Link>
```

- [ ] **Step 2: Replace the customer panel heading**

Replace the customer panel heading block:

```tsx
<div className="flex items-center justify-between gap-3">
  <h2 className="text-base font-semibold text-[var(--foreground)]">Cliente</h2>
  <Button onClick={() => setIsCustomerDrawerOpen(true)} variant="secondary">+ cadastrar</Button>
</div>
```

with:

```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
  <div>
    <h2 className="text-base font-semibold text-[var(--foreground)]">1. Cliente</h2>
    <p className="text-sm text-[var(--muted)]">Selecione um cliente quando precisar registrar galao, endereco ou entrega.</p>
  </div>
  <Button className="w-full sm:w-auto" onClick={() => setIsCustomerDrawerOpen(true)} variant="secondary">
    Cadastrar cliente
  </Button>
</div>
```

- [ ] **Step 3: Add no-customer guidance above the search fields**

Inside the `selectedCustomer ? ... : (...)` branch, add this block before the search grid:

```tsx
<div className="rounded-[var(--radius-control)] border border-[var(--border-soft)] bg-[var(--card-muted)] p-3 text-sm text-[var(--muted)]">
  <span className="font-medium text-[var(--foreground)]">Venda sem cliente:</span> deixe em branco para venda de balcao.
</div>
```

- [ ] **Step 4: Improve search action layout**

Wrap the customer search button in a responsive row:

```tsx
<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
  <Button className="w-full sm:w-auto" disabled={isSearchingCustomers} onClick={searchCustomers} variant="secondary">
    {isSearchingCustomers ? "Buscando..." : "Buscar cliente"}
  </Button>
  <p className="text-xs text-[var(--muted)]">Busque por nome, telefone, codigo ou endereco.</p>
</div>
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
pnpm --dir apps/web exec vitest run "src/app/(app)/vendas/sales-ui.test.tsx"
```

Expected: tests still fail only for product/cart labels not implemented yet.

---

### Task 3: Improve Product Search Panel And Product Results

**Files:**
- Modify: `apps/web/src/app/(app)/vendas/sales-ui.tsx`

**Interfaces:**
- Consumes: `productQuery`, `productResults`, `addProductToCart`, `cartItems`, `formatCentsToBRL`.
- Produces: stable visible labels `2. Produto`, `Adicionar item`, and placeholder `Buscar produto ativo`.

- [ ] **Step 1: Replace product panel heading**

Replace:

```tsx
<div className="flex items-center justify-between gap-3">
  <h2 className="text-base font-semibold text-[var(--foreground)]">Produto</h2>
  <Badge variant="neutral">{cartItems.length} no carrinho</Badge>
</div>
```

with:

```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
  <div>
    <h2 className="text-base font-semibold text-[var(--foreground)]">2. Produto</h2>
    <p className="text-sm text-[var(--muted)]">Adicione produtos ativos. Itens sem estoque aparecem bloqueados.</p>
  </div>
  <Badge variant="neutral">{cartItems.length} no carrinho</Badge>
</div>
```

- [ ] **Step 2: Update product search placeholder**

Change:

```tsx
placeholder="Digite o nome do produto"
```

to:

```tsx
placeholder="Buscar produto ativo"
```

- [ ] **Step 3: Make product results more action-oriented**

Inside each product result button, replace the right price-only span:

```tsx
<span className="font-medium text-[var(--foreground)]">{formatCentsToBRL(product.salePriceCents)}</span>
```

with:

```tsx
<span className="flex flex-col items-end gap-1">
  <span className="font-medium text-[var(--foreground)]">{formatCentsToBRL(product.salePriceCents)}</span>
  <span className="text-xs text-[var(--brand)]">Adicionar item</span>
</span>
```

For disabled out-of-stock products, use:

```tsx
<span className="flex flex-col items-end gap-1">
  <span className="font-medium text-[var(--foreground)]">{formatCentsToBRL(product.salePriceCents)}</span>
  <span className="text-xs text-[var(--muted)]">Indisponivel</span>
</span>
```

Implement this with a conditional expression using the existing `outOfStock` variable.

- [ ] **Step 4: Improve no-product result copy**

Replace:

```tsx
<p className="mt-3 text-sm text-[var(--muted)]">Nenhum produto encontrado.</p>
```

with:

```tsx
<p className="mt-3 rounded-[var(--radius-control)] bg-[var(--card-muted)] p-3 text-sm text-[var(--muted)]">
  Nenhum produto ativo encontrado com esse nome.
</p>
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
pnpm --dir apps/web exec vitest run "src/app/(app)/vendas/sales-ui.test.tsx"
```

Expected: tests still fail only for cart/finalization guidance not implemented yet.

---

### Task 4: Improve Cart, Payment, Delivery, And Finalization Hierarchy

**Files:**
- Modify: `apps/web/src/app/(app)/vendas/sales-ui.tsx`

**Interfaces:**
- Consumes: `cartItems`, `paymentMethod`, `deliveryPending`, `drivers`, `totalAmountCents`, `finalizeSale`, `isSavingSale`, `isPending`.
- Produces: stable visible labels `3. Carrinho e pagamento`, `Total da venda`, and finalization guidance.

- [ ] **Step 1: Replace cart panel heading**

Replace:

```tsx
<div className="flex items-center justify-between gap-3">
  <h2 className="text-base font-semibold text-[var(--foreground)]">Carrinho</h2>
  <Badge variant={totalAmountCents > 0 ? "success" : "neutral"}>{formatCentsToBRL(totalAmountCents)}</Badge>
</div>
```

with:

```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
  <div>
    <h2 className="text-base font-semibold text-[var(--foreground)]">3. Carrinho e pagamento</h2>
    <p className="text-sm text-[var(--muted)]">Confira quantidades, descontos e forma de pagamento antes de finalizar.</p>
  </div>
  <Badge variant={totalAmountCents > 0 ? "success" : "neutral"}>{formatCentsToBRL(totalAmountCents)}</Badge>
</div>
```

- [ ] **Step 2: Improve empty cart state**

Replace:

```tsx
<EmptyState title="Carrinho vazio" description="Adicione um produto para iniciar." />
```

with:

```tsx
<EmptyState title="Carrinho vazio" description="Adicione produtos para liberar a finalizacao." />
```

- [ ] **Step 3: Make cart item controls responsive**

Replace:

```tsx
<div className="grid grid-cols-3 gap-2">
```

with:

```tsx
<div className="grid gap-2 sm:grid-cols-3">
```

- [ ] **Step 4: Improve remove button weight**

Change the remove button text from:

```tsx
Remover
```

to:

```tsx
Remover item
```

Keep `variant="ghost"` because this is not the primary action.

- [ ] **Step 5: Improve delivery checkbox affordance**

Replace the plain label block:

```tsx
<label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
  <input
    checked={deliveryPending}
    type="checkbox"
    onChange={(event) => setDeliveryPending(event.target.checked)}
  />
  Entregar depois
</label>
```

with:

```tsx
<label className="flex items-start gap-3 rounded-[var(--radius-control)] border border-[var(--border-soft)] bg-[var(--card-muted)] p-3 text-sm text-[var(--foreground)]">
  <input
    checked={deliveryPending}
    className="mt-1"
    type="checkbox"
    onChange={(event) => setDeliveryPending(event.target.checked)}
  />
  <span>
    <span className="block font-medium">Entregar depois</span>
    <span className="block text-xs text-[var(--muted)]">Marque quando a venda fica pendente de entrega.</span>
  </span>
</label>
```

- [ ] **Step 6: Improve total block copy**

Replace:

```tsx
<p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted)]">Total</p>
```

with:

```tsx
<p className="text-sm font-medium text-[var(--muted)]">Total da venda</p>
```

- [ ] **Step 7: Add stock/cash guidance before final button**

Add this paragraph immediately before the finalization button:

```tsx
<p className="text-xs text-[var(--muted)]">A venda baixa estoque automaticamente ao finalizar.</p>
```

- [ ] **Step 8: Run focused tests**

Run:

```bash
pnpm --dir apps/web exec vitest run "src/app/(app)/vendas/sales-ui.test.tsx"
```

Expected: all `sales-ui.test.tsx` tests pass.

---

### Task 5: Final Polish Pass And Verification

**Files:**
- Modify if needed: `apps/web/src/app/(app)/vendas/sales-ui.tsx`
- Modify if needed: `apps/web/src/app/(app)/vendas/sales-ui.test.tsx`

**Interfaces:**
- Consumes: completed Tasks 1-4.
- Produces: verified `/vendas` screen ready for user review.

- [ ] **Step 1: Inspect the rendered HTML for accidental regressions**

Run:

```bash
pnpm --dir apps/web exec vitest run "src/app/(app)/vendas/sales-ui.test.tsx"
```

Expected: PASS, including assertions for `1. Cliente`, `2. Produto`, `3. Carrinho e pagamento`, `Venda sem cliente`, `Adicionar item`, and `Total da venda`.

- [ ] **Step 2: Run web typecheck**

Run:

```bash
pnpm --dir apps/web run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Run web lint**

Run:

```bash
pnpm --dir apps/web run lint
```

Expected: exit 0.

- [ ] **Step 4: Review diff for scope control**

Run:

```bash
git diff -- "apps/web/src/app/(app)/vendas/sales-ui.tsx" "apps/web/src/app/(app)/vendas/sales-ui.test.tsx"
```

Expected: diff only changes sales screen layout/copy/tests. No backend rules, payment logic, or schema changes.

- [ ] **Step 5: Report completion of `/vendas` only**

Report these items:

```md
Tela revisada: `/vendas`

Mudancas:
- Fluxo numerado: cliente, produto, carrinho/pagamento.
- Cliente sem cadastro ficou explicito para venda de balcao.
- Busca de produto comunica produto ativo e estoque.
- Carrinho ganhou orientacao de finalizacao e baixa automatica de estoque.
- Controles do carrinho ficaram responsivos.

Verificacoes:
- `pnpm --dir apps/web exec vitest run "src/app/(app)/vendas/sales-ui.test.tsx"`
- `pnpm --dir apps/web run typecheck`
- `pnpm --dir apps/web run lint`
```

Do not start `/caixa` until the user confirms the `/vendas` pass is acceptable.

---

## Self-Review

- Spec coverage: covers the first increment from the screen-by-screen spec: `/vendas`, operational hierarchy, design consistency, responsiveness, copy clarity, and focused verification.
- Placeholder scan: no TBD/TODO/fill-in-later instructions remain.
- Type consistency: plan uses existing `SalesUi`, `Button`, `Link`, `Field`, `TextInput`, `SelectInput`, `Badge`, `Alert`, and `EmptyState` names as currently present in the codebase.
- Scope check: plan avoids backend, schema, new dependency, and out-of-MVP changes.
