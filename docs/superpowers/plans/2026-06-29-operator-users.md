# Operator Users Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/usuarios` placeholder with ADMIN-only operator user management.

**Architecture:** Add a focused Nest `users` module that only manages `OPERATOR` rows in the existing `users` table. Add shared schemas/types, Next API proxy routes, web client helpers, and a server-rendered `/usuarios` page with a client UI for create/edit/toggle/reset-password actions.

**Tech Stack:** Next.js App Router, TypeScript, NestJS, Drizzle ORM, Zod, bcryptjs, Vitest, Tailwind CSS.

## Global Constraints

- The MVP has one administrator principal; `/usuarios` manages only `OPERATOR` accounts.
- Entregadores remain separate from users and do not get login accounts.
- Only authenticated `ADMIN` can list, create, edit, activate/inactivate, or reset operator passwords.
- Never persist or expose plaintext passwords; store only bcrypt hashes.
- Do not physically delete users; use `isActive`.
- Keep changes small and follow existing module patterns.

---

## File Structure

- `packages/shared/src/users.ts`: Zod schemas and response/input types for operator users.
- `packages/shared/src/index.ts`: exports user schemas/types.
- `apps/api/src/modules/users/*`: Nest controller, service, repository, schemas, module, and tests.
- `apps/api/src/app.module.ts`: imports `UsersModule`.
- `apps/web/src/lib/users.ts`: server/client helper functions for `/api/users`.
- `apps/web/src/app/api/users/**/route.ts`: Next proxy routes to Nest.
- `apps/web/src/app/(app)/usuarios/page.tsx`: fetches operators and enforces admin.
- `apps/web/src/app/(app)/usuarios/usuarios-ui.tsx`: client UI for operators.
- `apps/web/src/app/(app)/usuarios/usuarios-ui.test.tsx`: replaces placeholder test with real behavior tests.

---

### Task 1: Shared User Contracts

**Files:**
- Create: `packages/shared/src/users.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/users.test.ts`

**Interfaces:**
- Produces `createOperatorUserSchema`, `updateOperatorUserSchema`, `resetOperatorPasswordSchema`.
- Produces `OperatorUserResponse`, `OperatorUsersListResponse`, `CreateOperatorUserInput`, `UpdateOperatorUserInput`, `ResetOperatorPasswordInput`.

- [ ] **Step 1: Write failing shared tests**

Create `packages/shared/src/users.test.ts` with assertions that creating requires name/email/password, password minimum is 8, responses never include password hash, and list response is `{ users: [...] }`.

- [ ] **Step 2: Run failing tests**

Run: `pnpm --dir packages/shared exec vitest run src/users.test.ts`
Expected: FAIL because `./users` does not exist.

- [ ] **Step 3: Implement schemas**

Create `packages/shared/src/users.ts` with operator-only input schemas and response schemas.

- [ ] **Step 4: Export schemas**

Update `packages/shared/src/index.ts` to export all user schemas and types.

- [ ] **Step 5: Verify shared tests**

Run: `pnpm --dir packages/shared exec vitest run src/users.test.ts`
Expected: PASS.

---

### Task 2: API Users Module

**Files:**
- Create: `apps/api/src/modules/users/users.repository.ts`
- Create: `apps/api/src/modules/users/users.service.ts`
- Create: `apps/api/src/modules/users/users.controller.ts`
- Create: `apps/api/src/modules/users/users.module.ts`
- Create: `apps/api/src/modules/users/users.service.test.ts`
- Create: `apps/api/src/modules/users/users.controller.test.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes shared user input/response types.
- Produces API endpoints `GET /users`, `POST /users`, `PATCH /users/:id`, `POST /users/:id/toggle-active`, `POST /users/:id/reset-password`.

- [ ] **Step 1: Write failing service tests**

Test that service lists only operators, hashes passwords, rejects duplicate email, rejects all actions against `ADMIN`, and toggles only operators.

- [ ] **Step 2: Write failing controller tests**

Test that every endpoint requires an `ADMIN` user and rejects `OPERATOR`.

- [ ] **Step 3: Run failing tests**

Run: `pnpm --dir apps/api exec vitest run src/modules/users/users.service.test.ts src/modules/users/users.controller.test.ts`
Expected: FAIL because module files do not exist.

- [ ] **Step 4: Implement repository**

Repository methods: `findOperators()`, `findById(id)`, `findByEmail(email)`, `createOperator(input)`, `updateOperator(id, input)`, `setActive(id, isActive)`, `updatePassword(id, passwordHash)`.

- [ ] **Step 5: Implement service**

Service hashes with bcrypt, maps rows without `passwordHash`, blocks admin rows, and emits clear errors.

- [ ] **Step 6: Implement controller and module**

Controller parses UUID/body with Zod, calls `requireRequestUser`, requires role `ADMIN`, and delegates to service.

- [ ] **Step 7: Register module**

Import `UsersModule` in `apps/api/src/app.module.ts`.

- [ ] **Step 8: Verify API tests**

Run: `pnpm --dir apps/api exec vitest run src/modules/users/users.service.test.ts src/modules/users/users.controller.test.ts`
Expected: PASS.

---

### Task 3: Web API Proxies and Helpers

**Files:**
- Create: `apps/web/src/lib/users.ts`
- Create: `apps/web/src/lib/users.test.ts`
- Create: `apps/web/src/app/api/users/route.ts`
- Create: `apps/web/src/app/api/users/[id]/route.ts`
- Create: `apps/web/src/app/api/users/[id]/toggle-active/route.ts`
- Create: `apps/web/src/app/api/users/[id]/reset-password/route.ts`

**Interfaces:**
- Produces `fetchOperatorUsers(cookieHeader)`, `createOperatorUser(input)`, `updateOperatorUser(id,input)`, `toggleOperatorUser(id)`, `resetOperatorPassword(id,input)`.

- [ ] **Step 1: Write failing helper tests**

Test response parsing and that non-ok API responses surface the API message.

- [ ] **Step 2: Run failing tests**

Run: `pnpm --dir apps/web exec vitest run src/lib/users.test.ts`
Expected: FAIL because helper does not exist.

- [ ] **Step 3: Implement helpers**

Use existing `getServerApiUrl` and JSON fetch patterns from `customers`, `products`, and `sales` helpers.

- [ ] **Step 4: Implement proxy routes**

Forward cookie header, JSON body, status code, and response payload to Nest.

- [ ] **Step 5: Verify helper tests**

Run: `pnpm --dir apps/web exec vitest run src/lib/users.test.ts`
Expected: PASS.

---

### Task 4: Usuarios UI

**Files:**
- Modify: `apps/web/src/app/(app)/usuarios/page.tsx`
- Modify: `apps/web/src/app/(app)/usuarios/usuarios-ui.tsx`
- Modify: `apps/web/src/app/(app)/usuarios/usuarios-ui.test.tsx`

**Interfaces:**
- Consumes `OperatorUserResponse[]` from `fetchOperatorUsers`.
- Produces a client UI with create, edit, toggle active, and reset password actions.

- [ ] **Step 1: Replace placeholder tests with failing UI tests**

Test that the UI renders `Novo operador`, operator rows, active/inactive status, edit controls, toggle controls, and reset password controls; assert placeholder text is gone.

- [ ] **Step 2: Run failing UI tests**

Run: `pnpm --dir apps/web exec vitest run "src/app/(app)/usuarios/usuarios-ui.test.tsx"`
Expected: FAIL because current UI is placeholder.

- [ ] **Step 3: Update page server component**

Keep `requireRole(["ADMIN"])`, build cookie header, fetch operator users, and pass `users` into `UsuariosUi`.

- [ ] **Step 4: Implement client UI**

Add `"use client"`, local form state, submit handlers to Next API routes, and simple reload after successful mutations.

- [ ] **Step 5: Verify UI tests**

Run: `pnpm --dir apps/web exec vitest run "src/app/(app)/usuarios/usuarios-ui.test.tsx"`
Expected: PASS.

---

### Task 5: Final Verification and Commit

**Files:**
- All files from prior tasks.

- [ ] **Step 1: Run focused tests**

Run: `pnpm --dir packages/shared exec vitest run src/users.test.ts && pnpm --dir apps/api exec vitest run src/modules/users/users.service.test.ts src/modules/users/users.controller.test.ts && pnpm --dir apps/web exec vitest run src/lib/users.test.ts "src/app/(app)/usuarios/usuarios-ui.test.tsx"`
Expected: PASS.

- [ ] **Step 2: Run full verification**

Run: `pnpm run typecheck && pnpm run lint && pnpm run test`
Expected: all tasks successful.

- [ ] **Step 3: Commit implementation**

Commit message: `feat: add operator user management`.

---

## Self-Review

- Spec coverage: every requirement is represented: operator-only list/create/edit/toggle/reset, admin-only access, one admin preserved, entregadores separate, no password hash exposure.
- Placeholder scan: no TBD/TODO placeholders remain.
- Type consistency: shared type names are used consistently by API and web tasks.
