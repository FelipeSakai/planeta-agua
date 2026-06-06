# Auth And Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build secure first-party authentication, admin seeding, route protection, and the authenticated internal layout for the Planeta Agua MVP.

**Architecture:** Authentication uses an opaque session token stored in an `httpOnly` cookie and a hashed token stored in PostgreSQL. UI calls Server Actions, actions validate input and delegate to `features/auth`, while route protection uses server helpers in `lib/auth.ts` from the authenticated layout.

**Tech Stack:** Next.js 16 App Router, TypeScript, Drizzle ORM, PostgreSQL, Zod, bcryptjs, Node crypto, Vitest.

**Git Rule:** Do not commit or push unless the user explicitly asks. Steps that would normally commit are replaced with local status checks.

---

## File Structure

- Create `vitest.config.ts`: unit test configuration.
- Modify `package.json`: add `test`, `test:run`, `db:seed`, and dev dependency `vitest`, plus runtime dependency `tsx` for the seed script.
- Modify `.env.example`: add admin seed variables.
- Modify `src/lib/env.ts`: validate admin seed variables as optional values.
- Modify `src/db/schema.ts`: add `sessions` table and relations.
- Create `src/lib/password.ts`: password hashing and verification.
- Create `src/lib/password.test.ts`: unit tests for password helpers.
- Create `src/lib/session.ts`: session token generation, hashing, cookie name, expiry helpers.
- Create `src/lib/session.test.ts`: unit tests for session helpers.
- Create `src/lib/permissions.ts`: role permission helpers.
- Create `src/lib/permissions.test.ts`: unit tests for permissions.
- Create `src/features/auth/auth.schemas.ts`: login and admin seed schemas.
- Create `src/features/auth/auth.repository.ts`: Drizzle access for users and sessions.
- Create `src/features/auth/auth.service.ts`: login, logout, session lookup, admin seed.
- Create `src/features/auth/auth.actions.ts`: login and logout Server Actions.
- Create `src/lib/auth.ts`: current-user and route guard helpers.
- Create `scripts/seed-admin.ts`: command-line admin seed runner.
- Create `src/app/(auth)/login/page.tsx`: login form page.
- Create `src/app/(auth)/login/login-form.tsx`: client form component.
- Create `src/app/(app)/layout.tsx`: protected internal layout.
- Create `src/app/(app)/dashboard/page.tsx`: protected dashboard page.
- Modify `src/components/layout/app-shell.tsx`: accept user, active navigation, role-based items, logout action.
- Modify `src/app/page.tsx`: redirect root to `/dashboard`.
- Modify `src/app/globals.css`: align base surface with installed Intercom design.

---

### Task 1: Test Setup

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Add test scripts and dependencies**

Modify `package.json` so scripts include:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx scripts/seed-admin.ts"
  },
  "dependencies": {
    "tsx": "^4.21.0"
  },
  "devDependencies": {
    "vitest": "^4.0.16"
  }
}
```

Preserve all existing dependencies while adding only `tsx` and `vitest`.

- [ ] **Step 2: Create Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Install dependencies**

Run:

```bash
pnpm install
```

Expected: `pnpm-lock.yaml` updates and install completes without errors.

- [ ] **Step 4: Run empty test suite**

Run:

```bash
pnpm test:run
```

Expected: Vitest runs. It may report no tests yet if no test files exist at this point.

---

### Task 2: Sessions Schema And Environment

**Files:**
- Modify: `.env.example`
- Modify: `.env`
- Modify: `src/lib/env.ts`
- Modify: `src/db/schema.ts`
- Generated: `src/db/migrations/*.sql`

- [ ] **Step 1: Add admin seed variables to env examples**

Update `.env.example`:

```text
DATABASE_URL="postgres://planeta_agua:planeta_agua@localhost:5433/planeta_agua"
AUTH_SECRET="troque-esta-chave-em-producao-com-pelo-menos-32-caracteres"
ADMIN_NAME="Administrador"
ADMIN_EMAIL="admin@planetaagua.local"
ADMIN_PASSWORD="troque-esta-senha-local"
```

Update local `.env` with the same keys. The `.env` file remains ignored by Git.

- [ ] **Step 2: Update env validation**

Replace `src/lib/env.ts` with:

```ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32).optional(),
  ADMIN_NAME: z.string().min(1).optional(),
  ADMIN_EMAIL: z.email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  ADMIN_NAME: process.env.ADMIN_NAME,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  NODE_ENV: process.env.NODE_ENV,
});
```

- [ ] **Step 3: Add sessions table**

Modify `src/db/schema.ts`:

```ts
export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

Add `sessions: many(sessions)` to `usersRelations` and add:

```ts
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));
```

- [ ] **Step 4: Generate migration**

Run:

```bash
pnpm db:generate
```

Expected: a new migration file is generated for `sessions`.

- [ ] **Step 5: Apply migration locally**

Run:

```bash
docker compose up -d
pnpm db:migrate
```

Expected: PostgreSQL is running and migrations apply successfully.

---

### Task 3: Password Helpers

**Files:**
- Create: `src/lib/password.test.ts`
- Create: `src/lib/password.ts`

- [ ] **Step 1: Write failing password tests**

Create `src/lib/password.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("password helpers", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("senha-segura-123");

    expect(hash).not.toBe("senha-segura-123");
    await expect(verifyPassword("senha-segura-123", hash)).resolves.toBe(true);
  });

  it("rejects an invalid password", async () => {
    const hash = await hashPassword("senha-segura-123");

    await expect(verifyPassword("senha-errada", hash)).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm test:run src/lib/password.test.ts
```

Expected: fails because `src/lib/password.ts` does not exist.

- [ ] **Step 3: Implement password helpers**

Create `src/lib/password.ts`:

```ts
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
```

- [ ] **Step 4: Run tests and verify pass**

Run:

```bash
pnpm test:run src/lib/password.test.ts
```

Expected: password tests pass.

---

### Task 4: Session Helpers

**Files:**
- Create: `src/lib/session.test.ts`
- Create: `src/lib/session.ts`

- [ ] **Step 1: Write failing session tests**

Create `src/lib/session.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { createSessionExpiry, createSessionToken, hashSessionToken, SESSION_COOKIE_NAME } from "./session";

describe("session helpers", () => {
  it("uses the expected cookie name", () => {
    expect(SESSION_COOKIE_NAME).toBe("planeta_agua_session");
  });

  it("creates opaque random tokens", () => {
    const first = createSessionToken();
    const second = createSessionToken();

    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(43);
  });

  it("hashes tokens deterministically without returning the raw token", () => {
    const token = "raw-token";

    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
    expect(hashSessionToken(token)).not.toBe(token);
  });

  it("creates an expiry eight hours in the future", () => {
    const now = new Date("2026-06-05T12:00:00.000Z");
    const expiresAt = createSessionExpiry(now);

    expect(expiresAt.toISOString()).toBe("2026-06-05T20:00:00.000Z");
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm test:run src/lib/session.test.ts
```

Expected: fails because `src/lib/session.ts` does not exist.

- [ ] **Step 3: Implement session helpers**

Create `src/lib/session.ts`:

```ts
import { createHash, randomBytes } from "crypto";

export const SESSION_COOKIE_NAME = "planeta_agua_session";
export const SESSION_DURATION_HOURS = 8;

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionExpiry(now = new Date()) {
  return new Date(now.getTime() + SESSION_DURATION_HOURS * 60 * 60 * 1000);
}

export function isProduction() {
  return process.env.NODE_ENV === "production";
}
```

- [ ] **Step 4: Run tests and verify pass**

Run:

```bash
pnpm test:run src/lib/session.test.ts
```

Expected: session tests pass.

---

### Task 5: Permission Helpers

**Files:**
- Create: `src/lib/permissions.test.ts`
- Create: `src/lib/permissions.ts`

- [ ] **Step 1: Write failing permission tests**

Create `src/lib/permissions.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { canAccessFinance, canCancelSale, canManageStock, canManageUsers } from "./permissions";

const admin = { role: "ADMIN" as const };
const operator = { role: "OPERATOR" as const };

describe("permissions", () => {
  it("allows admin sensitive actions", () => {
    expect(canAccessFinance(admin)).toBe(true);
    expect(canCancelSale(admin)).toBe(true);
    expect(canManageStock(admin)).toBe(true);
    expect(canManageUsers(admin)).toBe(true);
  });

  it("blocks operator sensitive actions", () => {
    expect(canAccessFinance(operator)).toBe(false);
    expect(canCancelSale(operator)).toBe(false);
    expect(canManageStock(operator)).toBe(false);
    expect(canManageUsers(operator)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm test:run src/lib/permissions.test.ts
```

Expected: fails because `src/lib/permissions.ts` does not exist.

- [ ] **Step 3: Implement permissions**

Create `src/lib/permissions.ts`:

```ts
import type { UserRole } from "@/features/auth/types";

type UserWithRole = {
  role: UserRole;
};

function isAdmin(user: UserWithRole) {
  return user.role === "ADMIN";
}

export function canAccessFinance(user: UserWithRole) {
  return isAdmin(user);
}

export function canCancelSale(user: UserWithRole) {
  return isAdmin(user);
}

export function canManageStock(user: UserWithRole) {
  return isAdmin(user);
}

export function canManageUsers(user: UserWithRole) {
  return isAdmin(user);
}
```

- [ ] **Step 4: Run tests and verify pass**

Run:

```bash
pnpm test:run src/lib/permissions.test.ts
```

Expected: permission tests pass.

---

### Task 6: Auth Schemas, Repository, And Service

**Files:**
- Create: `src/features/auth/auth.schemas.ts`
- Create: `src/features/auth/auth.repository.ts`
- Create: `src/features/auth/auth.service.ts`

- [ ] **Step 1: Create auth schemas**

Create `src/features/auth/auth.schemas.ts`:

```ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const adminSeedSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(8),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type AdminSeedInput = z.infer<typeof adminSeedSchema>;
```

- [ ] **Step 2: Implement auth repository**

Create `src/features/auth/auth.repository.ts`:

```ts
import { and, eq, gt } from "drizzle-orm";

import { db } from "@/db";
import { sessions, users } from "@/db/schema";

type Database = typeof db;

export async function findActiveUserByEmail(email: string, client: Database = db) {
  const [user] = await client.select().from(users).where(and(eq(users.email, email), eq(users.isActive, true))).limit(1);
  return user ?? null;
}

export async function findUserById(id: string, client: Database = db) {
  const [user] = await client.select().from(users).where(and(eq(users.id, id), eq(users.isActive, true))).limit(1);
  return user ?? null;
}

export async function upsertAdminUser(input: { name: string; email: string; passwordHash: string }, client: Database = db) {
  const [existingUser] = await client.select().from(users).where(eq(users.email, input.email)).limit(1);

  if (existingUser) {
    const [updatedUser] = await client
      .update(users)
      .set({ name: input.name, passwordHash: input.passwordHash, role: "ADMIN", isActive: true, updatedAt: new Date() })
      .where(eq(users.id, existingUser.id))
      .returning();

    return updatedUser;
  }

  const [createdUser] = await client
    .insert(users)
    .values({ name: input.name, email: input.email, passwordHash: input.passwordHash, role: "ADMIN", isActive: true })
    .returning();

  return createdUser;
}

export async function createSession(input: { userId: string; tokenHash: string; expiresAt: Date }, client: Database = db) {
  const [session] = await client.insert(sessions).values(input).returning();
  return session;
}

export async function findValidSessionByTokenHash(tokenHash: string, client: Database = db) {
  const [session] = await client
    .select()
    .from(sessions)
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return session ?? null;
}

export async function deleteSessionByTokenHash(tokenHash: string, client: Database = db) {
  await client.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}
```

- [ ] **Step 3: Implement auth service**

Create `src/features/auth/auth.service.ts`:

```ts
import { createSessionExpiry, createSessionToken, hashSessionToken } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";

import type { AdminSeedInput, LoginInput } from "./auth.schemas";
import {
  createSession,
  deleteSessionByTokenHash,
  findActiveUserByEmail,
  findUserById,
  findValidSessionByTokenHash,
  upsertAdminUser,
} from "./auth.repository";

export class InvalidCredentialsError extends Error {
  constructor() {
    super("E-mail ou senha invalidos.");
    this.name = "InvalidCredentialsError";
  }
}

export async function login(input: LoginInput) {
  const user = await findActiveUserByEmail(input.email);

  if (!user) {
    throw new InvalidCredentialsError();
  }

  const passwordIsValid = await verifyPassword(input.password, user.passwordHash);

  if (!passwordIsValid) {
    throw new InvalidCredentialsError();
  }

  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = createSessionExpiry();

  await createSession({ userId: user.id, tokenHash, expiresAt });

  return { token, expiresAt };
}

export async function logout(token: string) {
  await deleteSessionByTokenHash(hashSessionToken(token));
}

export async function getUserBySessionToken(token: string) {
  const session = await findValidSessionByTokenHash(hashSessionToken(token));

  if (!session) {
    return null;
  }

  return findUserById(session.userId);
}

export async function seedAdmin(input: AdminSeedInput) {
  const passwordHash = await hashPassword(input.password);
  return upsertAdminUser({ name: input.name, email: input.email, passwordHash });
}
```

- [ ] **Step 4: Run validation**

Run:

```bash
pnpm run typecheck
pnpm run lint
```

Expected: both pass.

---

### Task 7: Auth Actions And Server Guards

**Files:**
- Create: `src/features/auth/auth.actions.ts`
- Create: `src/lib/auth.ts`

- [ ] **Step 1: Implement auth actions**

Create `src/features/auth/auth.actions.ts`:

```ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME, isProduction } from "@/lib/session";

import { loginSchema } from "./auth.schemas";
import { InvalidCredentialsError, login, logout } from "./auth.service";

export type LoginActionState = {
  error?: string;
};

export async function loginAction(_state: LoginActionState, formData: FormData): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Informe e-mail e senha." };
  }

  try {
    const session = await login(parsed.data);
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction(),
      path: "/",
      expires: session.expiresAt,
    });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return { error: error.message };
    }

    return { error: "Nao foi possivel entrar agora." };
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await logout(token);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
```

- [ ] **Step 2: Implement server guards**

Create `src/lib/auth.ts`:

```ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { SessionUser, UserRole } from "@/features/auth/types";
import { getUserBySessionToken } from "@/features/auth/auth.service";

import { SESSION_COOKIE_NAME } from "./session";

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const user = await getUserBySessionToken(token);

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireRole(roles: UserRole[]) {
  const user = await requireUser();

  if (!roles.includes(user.role)) {
    redirect("/dashboard");
  }

  return user;
}
```

- [ ] **Step 3: Run validation**

Run:

```bash
pnpm run typecheck
pnpm run lint
```

Expected: both pass.

---

### Task 8: Admin Seed Script

**Files:**
- Create: `scripts/seed-admin.ts`
- Modify: `.env.example`

- [ ] **Step 1: Implement seed script**

Create `scripts/seed-admin.ts`:

```ts
import "dotenv/config";

import { env } from "../src/lib/env";
import { adminSeedSchema } from "../src/features/auth/auth.schemas";
import { seedAdmin } from "../src/features/auth/auth.service";

async function main() {
  const input = adminSeedSchema.parse({
    name: env.ADMIN_NAME,
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
  });

  const user = await seedAdmin(input);

  console.log(`Admin pronto: ${user.email}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Erro ao criar admin.");
  process.exit(1);
});
```

- [ ] **Step 2: Run seed**

Run:

```bash
docker compose up -d
pnpm db:seed
```

Expected: output includes `Admin pronto: admin@planetaagua.local` or the email configured in `.env`.

---

### Task 9: Login UI

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/login/login-form.tsx`

- [ ] **Step 1: Create login page**

Create `src/app/(auth)/login/page.tsx`:

```tsx
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#f5f1ec] px-6 py-10 text-[#111111]">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <p className="text-sm font-medium text-[#626260]">Planeta Agua</p>
          <h1 className="max-w-xl text-5xl font-medium tracking-[-1.2px] md:text-6xl">Operacao da loja em uma tela clara.</h1>
          <p className="max-w-lg text-lg leading-8 text-[#626260]">
            Entre para registrar vendas, acompanhar estoque e consultar o resumo financeiro do dia.
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Create login form**

Create `src/app/(auth)/login/login-form.tsx`:

```tsx
"use client";

import { useActionState } from "react";

import { loginAction } from "@/features/auth/auth.actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {});

  return (
    <form action={action} className="rounded-2xl border border-[#d3cec6] bg-white p-6 md:p-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-medium tracking-[-0.4px]">Entrar</h2>
        <p className="text-sm text-[#626260]">Use seu e-mail e senha de operador.</p>
      </div>

      <div className="mt-6 space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium">E-mail</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="h-11 w-full rounded-lg border border-[#d3cec6] bg-white px-3 text-base outline-none focus:border-[#111111]"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Senha</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="h-11 w-full rounded-lg border border-[#d3cec6] bg-white px-3 text-base outline-none focus:border-[#111111]"
          />
        </label>
      </div>

      {state.error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 h-11 w-full rounded-lg bg-[#111111] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Run validation**

Run:

```bash
pnpm run typecheck
pnpm run lint
```

Expected: both pass.

---

### Task 10: Protected App Layout And Dashboard

**Files:**
- Modify: `src/components/layout/app-shell.tsx`
- Create: `src/app/(app)/layout.tsx`
- Create: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace AppShell**

Replace `src/components/layout/app-shell.tsx` with:

```tsx
import type { ReactNode } from "react";

import type { SessionUser } from "@/features/auth/types";
import { logoutAction } from "@/features/auth/auth.actions";

type AppShellProps = {
  user: SessionUser;
  children: ReactNode;
};

const navigation = [
  { label: "Dashboard", href: "/dashboard", roles: ["ADMIN", "OPERATOR"] },
  { label: "Vendas", href: "/vendas", roles: ["ADMIN", "OPERATOR"] },
  { label: "Produtos", href: "/produtos", roles: ["ADMIN", "OPERATOR"] },
  { label: "Clientes", href: "/clientes", roles: ["ADMIN", "OPERATOR"] },
  { label: "Estoque", href: "/estoque", roles: ["ADMIN"] },
  { label: "Financeiro", href: "/financeiro", roles: ["ADMIN"] },
  { label: "Usuarios", href: "/usuarios", roles: ["ADMIN"] },
] as const;

export function AppShell({ user, children }: AppShellProps) {
  const visibleNavigation = navigation.filter((item) => item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-[#f5f1ec] text-[#111111]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[#d3cec6] bg-[#f5f1ec] p-5 lg:block">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-[#ebe7e1]">
          <strong className="block text-lg font-medium">Planeta Agua</strong>
          <span className="mt-1 block text-xs text-[#626260]">{user.role}</span>
        </div>

        <nav className="mt-6 flex flex-col gap-1">
          {visibleNavigation.map((item) => (
            <a key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm font-medium text-[#626260] hover:bg-white hover:text-[#111111]">
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-[#d3cec6] bg-[#f5f1ec]/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Planeta Agua</p>
              <p className="text-xs text-[#626260]">{user.name}</p>
            </div>
            <form action={logoutAction}>
              <button className="rounded-lg border border-[#d3cec6] bg-white px-4 py-2 text-sm font-medium" type="submit">
                Sair
              </button>
            </form>
          </div>
        </header>
        <main className="p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create protected layout**

Create `src/app/(app)/layout.tsx`:

```tsx
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth";

export default async function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  return <AppShell user={user}>{children}</AppShell>;
}
```

- [ ] **Step 3: Create dashboard page**

Create `src/app/(app)/dashboard/page.tsx`:

```tsx
export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-[#626260]">Dashboard</p>
        <h1 className="mt-2 text-4xl font-medium tracking-[-0.8px]">Resumo operacional</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-[#d3cec6] bg-white p-5">
          <p className="text-sm text-[#626260]">Vendas hoje</p>
          <strong className="mt-3 block text-3xl font-medium">0</strong>
        </article>
        <article className="rounded-2xl border border-[#d3cec6] bg-white p-5">
          <p className="text-sm text-[#626260]">Faturamento hoje</p>
          <strong className="mt-3 block text-3xl font-medium">R$ 0,00</strong>
        </article>
        <article className="rounded-2xl border border-[#d3cec6] bg-white p-5">
          <p className="text-sm text-[#626260]">Estoque baixo</p>
          <strong className="mt-3 block text-3xl font-medium">0</strong>
        </article>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Redirect root to dashboard**

Replace `src/app/page.tsx` with:

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
```

- [ ] **Step 5: Run validation**

Run:

```bash
pnpm run typecheck
pnpm run lint
pnpm run build
```

Expected: all pass.

---

### Task 11: Full Local Verification

**Files:**
- No new files.

- [ ] **Step 1: Run full automated verification**

Run:

```bash
pnpm test:run
pnpm run typecheck
pnpm run lint
pnpm run build
```

Expected: all pass.

- [ ] **Step 2: Verify database flow**

Run:

```bash
docker compose up -d
pnpm db:migrate
pnpm db:seed
```

Expected: migrations apply and admin seed prints the configured admin email.

- [ ] **Step 3: Verify browser flow manually**

Run:

```bash
pnpm dev
```

Open `http://localhost:3000/login`.

Expected:

- Login page renders.
- Valid admin credentials redirect to `/dashboard`.
- `/dashboard` renders the internal layout.
- `Sair` logs out and redirects to `/login`.
- Direct access to `/dashboard` after logout redirects to `/login`.

- [ ] **Step 4: Check local Git state**

Run:

```bash
git status --short
```

Expected: changed files are visible locally. Do not commit or push unless the user explicitly asks.

---

## Self-Review

- Spec coverage: login, logout, session table, cookie security, seed admin, route protection, permissions, layout, dashboard, visual direction and verification are covered.
- Placeholder scan: no intentionally incomplete implementation steps are included.
- Type consistency: session user type comes from `src/features/auth/types.ts`; role values match `ADMIN` and `OPERATOR`; cookie name is centralized in `src/lib/session.ts`.
- Scope check: user-management UI, password reset, MFA, JWT refresh token, and audit screens are excluded as designed.
