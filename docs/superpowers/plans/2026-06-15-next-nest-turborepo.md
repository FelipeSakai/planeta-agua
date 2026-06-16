# Next + Nest Turborepo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Planeta Agua from a single Next.js full-stack app to a Turborepo monorepo with Next.js frontend in `apps/web` and NestJS backend in `apps/api`.

**Architecture:** The frontend renders UI and calls the backend over HTTP. The backend owns auth, database access, Drizzle migrations, seed scripts, permissions, and critical business rules. The monorepo uses pnpm workspaces plus Turborepo with minimal local caching and no remote cache.

**Tech Stack:** pnpm, Turborepo, Next.js 16, React 19, NestJS, TypeScript, Drizzle ORM, PostgreSQL, Zod, Vitest.

**Git Rule:** Do not commit unless the user explicitly asks. Where a step says to check changes, use `git status --short` and keep changes local.

---

## File Structure

- Create `pnpm-workspace.yaml`: workspace package list.
- Create `turbo.json`: task pipeline for `dev`, `build`, `lint`, `typecheck`, and `test`.
- Modify root `package.json`: make root orchestration-only, add Turbo scripts, add `turbo` dev dependency, remove app-specific scripts after moving them into `apps/web` and `apps/api`.
- Move current Next files into `apps/web`: `src`, `public` if present, `next.config.ts`, `next-env.d.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`.
- Create `apps/web/package.json`: Next app package named `web`.
- Create `apps/web/tsconfig.json`: Next TypeScript config with app-local `@/*` alias.
- Create `apps/web/.env.example`: frontend environment example.
- Create `apps/api/package.json`: Nest app package named `api`.
- Create `apps/api/tsconfig.json`: backend TypeScript config.
- Create `apps/api/tsconfig.build.json`: backend build config.
- Create `apps/api/src/main.ts`: Nest bootstrap.
- Create `apps/api/src/app.module.ts`: root API module.
- Create `apps/api/src/health/health.controller.ts`: healthcheck endpoint.
- Create `apps/api/src/health/health.module.ts`: health module.
- Move `src/db` to `apps/api/src/db`.
- Move `scripts/seed-admin.ts` to `apps/api/scripts/seed-admin.ts`.
- Move `drizzle.config.ts` to `apps/api/drizzle.config.ts` and update paths.
- Create `apps/api/src/env.ts`: backend env validation.
- Create `packages/shared/package.json`: shared package named `shared`.
- Create `packages/shared/tsconfig.json`: shared TypeScript config.
- Create `packages/shared/src/index.ts`: shared exports.
- Create `packages/shared/src/auth.ts`: shared auth/user role types.
- Modify `.env.example`: document root/local variables and point package-specific variables to app examples.
- Modify `README.md`: update local development commands.

---

### Task 1: Add Workspace And Turbo Skeleton

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Modify: `package.json`

- [ ] **Step 1: Create workspace package list**

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 2: Create minimal Turbo pipeline**

Create `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

- [ ] **Step 3: Replace root package scripts with orchestration scripts**

Modify root `package.json` to this shape while preserving `packageManager`, `name`, `version`, and `private`:

```json
{
  "name": "planeta-agua",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@10.23.0",
  "scripts": {
    "dev": "turbo dev",
    "dev:web": "turbo dev --filter=web",
    "dev:api": "turbo dev --filter=api",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "test:run": "turbo test",
    "db:generate": "pnpm --filter api db:generate",
    "db:migrate": "pnpm --filter api db:migrate",
    "db:push": "pnpm --filter api db:push",
    "db:studio": "pnpm --filter api db:studio",
    "db:seed": "pnpm --filter api db:seed"
  },
  "devDependencies": {
    "turbo": "^2.6.1"
  }
}
```

- [ ] **Step 4: Install Turbo and refresh lockfile**

Run: `pnpm install`

Expected: install completes and `pnpm-lock.yaml` changes to include `turbo`.

- [ ] **Step 5: Check current changes**

Run: `git status --short`

Expected: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and `turbo.json` are changed or new. Existing unrelated `next-env.d.ts` may still be modified; do not revert it.

---

### Task 2: Move The Existing Next App Into `apps/web`

**Files:**
- Create directory: `apps/web`
- Move: `src` to `apps/web/src`
- Move if present: `public` to `apps/web/public`
- Move: `next.config.ts` to `apps/web/next.config.ts`
- Move: `next-env.d.ts` to `apps/web/next-env.d.ts`
- Move: `tsconfig.json` to `apps/web/tsconfig.json`
- Move: `postcss.config.mjs` to `apps/web/postcss.config.mjs`
- Move: `eslint.config.mjs` to `apps/web/eslint.config.mjs`
- Move: `vitest.config.ts` to `apps/web/vitest.config.ts`
- Create: `apps/web/package.json`

- [ ] **Step 1: Create app directory**

Run: `mkdir -p apps/web`

Expected: `apps/web` exists.

- [ ] **Step 2: Move Next app files**

Run these commands from the repository root:

```bash
git mv src apps/web/src
git mv next.config.ts apps/web/next.config.ts
git mv next-env.d.ts apps/web/next-env.d.ts
git mv tsconfig.json apps/web/tsconfig.json
git mv postcss.config.mjs apps/web/postcss.config.mjs
git mv eslint.config.mjs apps/web/eslint.config.mjs
git mv vitest.config.ts apps/web/vitest.config.ts
```

If `public` exists, run:

```bash
git mv public apps/web/public
```

Expected: app files live under `apps/web`.

- [ ] **Step 3: Create web package manifest**

Create `apps/web/package.json`:

```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@neondatabase/serverless": "^1.0.2",
    "bcryptjs": "^3.0.3",
    "dotenv": "^17.2.3",
    "drizzle-orm": "^0.45.1",
    "jose": "^6.1.3",
    "next": "16.2.7",
    "postgres": "^3.4.7",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "tsx": "^4.21.0",
    "zod": "^4.1.13"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "drizzle-kit": "^0.31.8",
    "eslint": "^9",
    "eslint-config-next": "16.2.7",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^4.0.16"
  }
}
```

This package temporarily keeps backend-related dependencies so the moved app still builds before API migration. Later tasks remove these from `web` after DB/auth move to `api`.

- [ ] **Step 4: Update web TypeScript config paths**

Ensure `apps/web/tsconfig.json` contains this exact `paths` entry:

```json
"paths": {
  "@/*": ["./src/*"]
}
```

The rest of the moved config can remain unchanged.

- [ ] **Step 5: Install workspace dependencies**

Run: `pnpm install`

Expected: install completes and pnpm recognizes package `web`.

- [ ] **Step 6: Verify web typecheck still reaches the moved app**

Run: `pnpm --filter web typecheck`

Expected: TypeScript runs against `apps/web`. If it fails because generated `.next` types are missing, run `pnpm --filter web build` once, then rerun the typecheck. Fix only path errors caused by the move.

---

### Task 3: Add Minimal Shared Package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/auth.ts`

- [ ] **Step 1: Create shared package manifest**

Create `packages/shared/package.json`:

```json
{
  "name": "shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc --noEmit",
    "lint": "tsc --noEmit",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests"
  },
  "dependencies": {
    "zod": "^4.1.13"
  },
  "devDependencies": {
    "typescript": "^5",
    "vitest": "^4.0.16"
  }
}
```

- [ ] **Step 2: Create shared TypeScript config**

Create `packages/shared/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Add shared auth types**

Create `packages/shared/src/auth.ts`:

```ts
import { z } from "zod";

export const userRoleSchema = z.enum(["ADMIN", "OPERATOR"]);

export type UserRole = z.infer<typeof userRoleSchema>;

export const sessionUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  role: userRoleSchema,
});

export type SessionUser = z.infer<typeof sessionUserSchema>;
```

- [ ] **Step 4: Export shared package surface**

Create `packages/shared/src/index.ts`:

```ts
export * from "./auth";
```

- [ ] **Step 5: Verify shared package**

Run: `pnpm --filter shared typecheck`

Expected: command passes.

---

### Task 4: Create Minimal Nest API App

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/tsconfig.build.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/health/health.controller.ts`
- Create: `apps/api/src/health/health.module.ts`
- Create: `apps/api/src/env.ts`

- [ ] **Step 1: Create API package manifest**

Create `apps/api/package.json`:

```json
{
  "name": "api",
  "version": "0.1.0",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main.js",
    "lint": "eslint \"src/**/*.ts\" \"scripts/**/*.ts\"",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "test": "vitest run --passWithNoTests",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx scripts/seed-admin.ts"
  },
  "dependencies": {
    "@nestjs/common": "^11.1.9",
    "@nestjs/core": "^11.1.9",
    "@nestjs/platform-express": "^11.1.9",
    "bcryptjs": "^3.0.3",
    "cookie-parser": "^1.4.7",
    "dotenv": "^17.2.3",
    "drizzle-orm": "^0.45.1",
    "postgres": "^3.4.7",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.2",
    "shared": "workspace:*",
    "tsx": "^4.21.0",
    "zod": "^4.1.13"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.12",
    "@types/cookie-parser": "^1.4.10",
    "@types/express": "^5.0.5",
    "@types/node": "^20",
    "drizzle-kit": "^0.31.8",
    "eslint": "^9",
    "typescript": "^5",
    "vitest": "^4.0.16"
  }
}
```

- [ ] **Step 2: Create API TypeScript config**

Create `apps/api/tsconfig.json`:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2022",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*.ts", "scripts/**/*.ts", "drizzle.config.ts"]
}
```

- [ ] **Step 3: Create API build config**

Create `apps/api/tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "**/*.test.ts", "scripts/**/*.ts"]
}
```

- [ ] **Step 4: Create backend env validation**

Create `apps/api/src/env.ts`:

```ts
import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32).optional(),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  API_PORT: z.coerce.number().int().positive().default(3333),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  ADMIN_NAME: z.string().min(1).optional(),
  ADMIN_EMAIL: z.email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional()
});

export const env = envSchema.parse(process.env);
```

- [ ] **Step 5: Create health controller**

Create `apps/api/src/health/health.controller.ts`:

```ts
import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    return { ok: true };
  }
}
```

- [ ] **Step 6: Create health module**

Create `apps/api/src/health/health.module.ts`:

```ts
import { Module } from "@nestjs/common";

import { HealthController } from "./health.controller";

@Module({
  controllers: [HealthController]
})
export class HealthModule {}
```

- [ ] **Step 7: Create root app module**

Create `apps/api/src/app.module.ts`:

```ts
import { Module } from "@nestjs/common";

import { HealthModule } from "./health/health.module";

@Module({
  imports: [HealthModule]
})
export class AppModule {}
```

- [ ] **Step 8: Create Nest bootstrap with CORS**

Create `apps/api/src/main.ts`:

```ts
import "reflect-metadata";

import cookieParser from "cookie-parser";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { env } from "./env";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.enableCors({
    origin: env.WEB_ORIGIN,
    credentials: true
  });

  await app.listen(env.API_PORT);
}

void bootstrap();
```

- [ ] **Step 9: Install API dependencies**

Run: `pnpm install`

Expected: Nest dependencies install and pnpm links `shared` into `api`.

- [ ] **Step 10: Verify API typecheck**

Run: `pnpm --filter api typecheck`

Expected: command passes.

---

### Task 5: Move Database, Drizzle Config, And Seed To API

**Files:**
- Move: `apps/web/src/db` to `apps/api/src/db`
- Move: `scripts/seed-admin.ts` to `apps/api/scripts/seed-admin.ts`
- Move: `drizzle.config.ts` to `apps/api/drizzle.config.ts`
- Modify: `apps/api/drizzle.config.ts`
- Modify imports in: `apps/api/scripts/seed-admin.ts`
- Modify imports in API files moved from web if path aliases break

- [ ] **Step 1: Move database files**

Run:

```bash
mkdir -p apps/api/src
git mv apps/web/src/db apps/api/src/db
```

Expected: Drizzle schema and migrations live in `apps/api/src/db`.

- [ ] **Step 2: Move seed script**

Run:

```bash
mkdir -p apps/api/scripts
git mv scripts/seed-admin.ts apps/api/scripts/seed-admin.ts
```

Expected: seed script lives in `apps/api/scripts`.

- [ ] **Step 3: Move Drizzle config**

Run:

```bash
git mv drizzle.config.ts apps/api/drizzle.config.ts
```

Expected: Drizzle config lives in `apps/api`.

- [ ] **Step 4: Update API Drizzle config**

Replace `apps/api/drizzle.config.ts` with:

```ts
import "dotenv/config";

import { defineConfig } from "drizzle-kit";

import { env } from "./src/env";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL
  }
});
```

- [ ] **Step 5: Update DB index if needed**

If `apps/api/src/db/index.ts` imports env from the old web path, update it to:

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "../env";
import * as schema from "./schema";

const client = postgres(env.DATABASE_URL);

export const db = drizzle(client, { schema });
```

- [ ] **Step 6: Update seed imports**

Open `apps/api/scripts/seed-admin.ts` and replace imports from `@/` or `../src/lib/env` with app-local API imports. The top of the file should use this pattern:

```ts
import { db } from "../src/db";
import { users } from "../src/db/schema";
import { env } from "../src/env";
```

Keep the existing seed behavior: create or update admin, hash password, never store plaintext password.

- [ ] **Step 7: Verify Drizzle migration command resolves API config**

Run: `pnpm --filter api db:migrate`

Expected: Drizzle uses `apps/api/drizzle.config.ts` and applies existing migrations. If database is not running, run `docker compose up -d` and repeat.

---

### Task 6: Move Auth Core To API

**Files:**
- Create: `apps/api/src/modules/auth/auth.module.ts`
- Create: `apps/api/src/modules/auth/auth.controller.ts`
- Create: `apps/api/src/modules/auth/auth.service.ts`
- Create: `apps/api/src/modules/auth/auth.repository.ts`
- Create: `apps/api/src/modules/auth/auth.schemas.ts`
- Create: `apps/api/src/modules/auth/session.ts`
- Create: `apps/api/src/modules/auth/password.ts`
- Create: `apps/api/src/modules/auth/auth.guard.ts`
- Modify: `apps/api/src/app.module.ts`
- Reuse logic from moved files under `apps/web/src/features/auth` and `apps/web/src/lib/session.ts` where possible.

- [ ] **Step 1: Create auth schemas**

Create `apps/api/src/modules/auth/auth.schemas.ts`:

```ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1)
});

export type LoginInput = z.infer<typeof loginSchema>;
```

- [ ] **Step 2: Create password helpers**

Create `apps/api/src/modules/auth/password.ts`:

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

- [ ] **Step 3: Create session helpers**

Create `apps/api/src/modules/auth/session.ts`:

```ts
import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE_NAME = "planeta_agua_session";
export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionExpiresAt(now = new Date()) {
  return new Date(now.getTime() + SESSION_DURATION_MS);
}
```

- [ ] **Step 4: Create auth repository**

Create `apps/api/src/modules/auth/auth.repository.ts`:

```ts
import { Injectable } from "@nestjs/common";
import { and, eq, gt } from "drizzle-orm";

import { db } from "../../db";
import { sessions, users } from "../../db/schema";

@Injectable()
export class AuthRepository {
  findActiveUserByEmail(email: string) {
    return db.query.users.findFirst({
      where: and(eq(users.email, email), eq(users.isActive, true))
    });
  }

  async createSession(input: { userId: string; tokenHash: string; expiresAt: Date }) {
    const [session] = await db
      .insert(sessions)
      .values(input)
      .returning();

    return session;
  }

  findUserBySessionHash(tokenHash: string, now = new Date()) {
    return db.query.sessions.findFirst({
      where: and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)),
      with: {
        user: true
      }
    });
  }

  async deleteSessionByHash(tokenHash: string) {
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }
}
```

- [ ] **Step 5: Create auth service**

Create `apps/api/src/modules/auth/auth.service.ts`:

```ts
import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { SessionUser } from "shared";

import { AuthRepository } from "./auth.repository";
import type { LoginInput } from "./auth.schemas";
import { createSessionExpiresAt, createSessionToken, hashSessionToken } from "./session";
import { verifyPassword } from "./password";

@Injectable()
export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  async login(input: LoginInput) {
    const user = await this.authRepository.findActiveUserByEmail(input.email);

    if (!user) {
      throw new UnauthorizedException("E-mail ou senha invalidos.");
    }

    const passwordMatches = await verifyPassword(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException("E-mail ou senha invalidos.");
    }

    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    const expiresAt = createSessionExpiresAt();

    await this.authRepository.createSession({ userId: user.id, tokenHash, expiresAt });

    return {
      token,
      expiresAt,
      user: this.toSessionUser(user)
    };
  }

  async getUserByToken(token: string): Promise<SessionUser | null> {
    const session = await this.authRepository.findUserBySessionHash(hashSessionToken(token));

    if (!session?.user || !session.user.isActive) {
      return null;
    }

    return this.toSessionUser(session.user);
  }

  async logout(token: string) {
    await this.authRepository.deleteSessionByHash(hashSessionToken(token));
  }

  private toSessionUser(user: { id: string; name: string; email: string; role: "ADMIN" | "OPERATOR" }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    } satisfies SessionUser;
  }
}
```

- [ ] **Step 6: Create auth controller**

Create `apps/api/src/modules/auth/auth.controller.ts`:

```ts
import { Body, Controller, Get, Post, Req, Res, UnauthorizedException } from "@nestjs/common";
import type { Request, Response } from "express";

import { env } from "../../env";
import { AuthService } from "./auth.service";
import { loginSchema } from "./auth.schemas";
import { SESSION_COOKIE_NAME } from "./session";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    const input = loginSchema.parse(body);
    const result = await this.authService.login(input);

    response.cookie(SESSION_COOKIE_NAME, result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
      expires: result.expiresAt
    });

    return { user: result.user };
  }

  @Post("logout")
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const token = request.cookies?.[SESSION_COOKIE_NAME];

    if (token) {
      await this.authService.logout(token);
    }

    response.clearCookie(SESSION_COOKIE_NAME, { path: "/" });

    return { ok: true };
  }

  @Get("me")
  async me(@Req() request: Request) {
    const token = request.cookies?.[SESSION_COOKIE_NAME];

    if (!token) {
      throw new UnauthorizedException("Sessao invalida.");
    }

    const user = await this.authService.getUserByToken(token);

    if (!user) {
      throw new UnauthorizedException("Sessao invalida.");
    }

    return { user };
  }
}
```

- [ ] **Step 7: Create auth module**

Create `apps/api/src/modules/auth/auth.module.ts`:

```ts
import { Module } from "@nestjs/common";

import { AuthController } from "./auth.controller";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";

@Module({
  controllers: [AuthController],
  providers: [AuthRepository, AuthService],
  exports: [AuthService]
})
export class AuthModule {}
```

- [ ] **Step 8: Register auth module**

Modify `apps/api/src/app.module.ts`:

```ts
import { Module } from "@nestjs/common";

import { AuthModule } from "./modules/auth/auth.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [HealthModule, AuthModule]
})
export class AppModule {}
```

- [ ] **Step 9: Verify API auth typecheck**

Run: `pnpm --filter api typecheck`

Expected: command passes. Fix import paths only if the moved DB files require local path corrections.

---

### Task 7: Point Next Auth UI At The Nest API

**Files:**
- Create: `apps/web/src/lib/api.ts`
- Modify: `apps/web/src/app/(auth)/login/login-form.tsx`
- Modify: `apps/web/src/app/(auth)/login/page.tsx` if it imports server actions directly
- Modify: `apps/web/src/lib/auth.ts`
- Modify: `apps/web/src/components/layout/app-shell.tsx` if logout still uses a server action
- Remove or stop using: `apps/web/src/features/auth/*` after API auth works
- Remove or stop using: `apps/web/src/lib/session.ts` after API auth works

- [ ] **Step 1: Add frontend API helper**

Create `apps/web/src/lib/api.ts`:

```ts
const browserApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";
const serverApiUrl = process.env.API_INTERNAL_URL ?? browserApiUrl;

export function getBrowserApiUrl() {
  return browserApiUrl;
}

export function getServerApiUrl() {
  return serverApiUrl;
}
```

- [ ] **Step 2: Replace server-side current user lookup**

Replace `apps/web/src/lib/auth.ts` with:

```ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionUser, UserRole } from "shared";

import { getServerApiUrl } from "./api";

type MeResponse = {
  user: SessionUser;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  if (!cookieHeader) {
    return null;
  }

  const response = await fetch(`${getServerApiUrl()}/auth/me`, {
    headers: { cookie: cookieHeader },
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as MeResponse;
  return data.user;
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

- [ ] **Step 3: Update login form to call API**

Modify `apps/web/src/app/(auth)/login/login-form.tsx` so submit calls the backend with credentials. Use this implementation if replacing the whole file is simpler:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { getBrowserApiUrl } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError(null);

    const response = await fetch(`${getBrowserApiUrl()}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? "")
      })
    });

    if (!response.ok) {
      setError("E-mail ou senha invalidos.");
      return;
    }

    startTransition(() => {
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#111111]" htmlFor="email">
          E-mail
        </label>
        <input
          className="min-h-11 w-full rounded-lg border border-[#d3cec6] bg-white px-3 py-2 text-sm outline-none focus:border-[#111111]"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#111111]" htmlFor="password">
          Senha
        </label>
        <input
          className="min-h-11 w-full rounded-lg border border-[#d3cec6] bg-white px-3 py-2 text-sm outline-none focus:border-[#111111]"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        className="min-h-11 w-full rounded-lg bg-[#111111] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        type="submit"
        disabled={isPending}
      >
        {isPending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Update logout to call API**

If `apps/web/src/components/layout/app-shell.tsx` currently receives a server action for logout, replace logout handling with a client-side fetch to `${getBrowserApiUrl()}/auth/logout` using `credentials: "include"`, then route to `/login`. Keep the current visual layout unchanged.

Code pattern:

```tsx
await fetch(`${getBrowserApiUrl()}/auth/logout`, {
  method: "POST",
  credentials: "include"
});
router.push("/login");
router.refresh();
```

- [ ] **Step 5: Add web dependency on shared package**

Modify `apps/web/package.json` dependencies to include:

```json
"shared": "workspace:*"
```

- [ ] **Step 6: Verify web typecheck after API auth switch**

Run: `pnpm --filter web typecheck`

Expected: command passes with no imports from `apps/web/src/db` or `apps/web/src/features/auth` required by active code.

---

### Task 8: Remove Direct Database Access From Web Package

**Files:**
- Delete after replacement: `apps/web/src/features/auth`
- Delete after replacement: `apps/web/src/features/sales`
- Delete after replacement: `apps/web/src/features/stock`
- Delete after replacement: `apps/web/src/lib/password.ts`
- Delete after replacement: `apps/web/src/lib/session.ts`
- Delete after replacement: `apps/web/src/lib/env.ts` if only used for DB/auth server code
- Modify: `apps/web/package.json`

- [ ] **Step 1: Search for direct database imports in web**

Use Grep or run: `rg "@/db|src/db|drizzle|postgres|features/auth|features/sales|features/stock|lib/session|lib/password" apps/web/src`

Expected after Task 7: no active imports from DB/auth service files in Next runtime code. Test files may still reference removed helpers; update or remove those tests with the removed implementation.

- [ ] **Step 2: Delete inactive server-side feature folders from web**

Run only after Step 1 confirms no active imports:

```bash
git rm -r apps/web/src/features/auth apps/web/src/features/sales apps/web/src/features/stock
git rm apps/web/src/lib/password.ts apps/web/src/lib/session.ts
```

If `apps/web/src/lib/env.ts` is only used by removed DB/server code, run:

```bash
git rm apps/web/src/lib/env.ts
```

- [ ] **Step 3: Remove backend-only dependencies from web**

Modify `apps/web/package.json` and remove these dependencies when no active web imports use them:

```json
"@neondatabase/serverless": "^1.0.2",
"bcryptjs": "^3.0.3",
"dotenv": "^17.2.3",
"drizzle-orm": "^0.45.1",
"jose": "^6.1.3",
"postgres": "^3.4.7",
"tsx": "^4.21.0"
```

Keep `zod` if frontend forms or shared schemas use it. Remove `drizzle-kit` from `apps/web/devDependencies`.

- [ ] **Step 4: Install and verify no web DB dependency remains**

Run: `pnpm install`

Run: `pnpm --filter web typecheck`

Expected: install and typecheck pass.

---

### Task 9: Update Environment Examples And Documentation

**Files:**
- Modify: `.env.example`
- Create: `apps/web/.env.example`
- Create: `apps/api/.env.example`
- Modify: `README.md`
- Modify: `docs/06-ambiente-desenvolvimento.md`
- Modify: `docs/02-stack-arquitetura.md`

- [ ] **Step 1: Update root env example**

Replace `.env.example` with:

```text
# Root file for local convenience.
# Copy values into apps/api/.env and apps/web/.env if running apps separately.

DATABASE_URL="postgres://planeta_agua:planeta_agua@localhost:5433/planeta_agua"
AUTH_SECRET="troque-esta-chave-em-producao-com-pelo-menos-32-caracteres"
ADMIN_NAME="Administrador"
ADMIN_EMAIL="admin@planetaagua.local"
ADMIN_PASSWORD="troque-esta-senha-local"
WEB_ORIGIN="http://localhost:3000"
API_PORT="3333"
NEXT_PUBLIC_API_URL="http://localhost:3333"
API_INTERNAL_URL="http://localhost:3333"
```

- [ ] **Step 2: Add API env example**

Create `apps/api/.env.example`:

```text
DATABASE_URL="postgres://planeta_agua:planeta_agua@localhost:5433/planeta_agua"
AUTH_SECRET="troque-esta-chave-em-producao-com-pelo-menos-32-caracteres"
ADMIN_NAME="Administrador"
ADMIN_EMAIL="admin@planetaagua.local"
ADMIN_PASSWORD="troque-esta-senha-local"
WEB_ORIGIN="http://localhost:3000"
API_PORT="3333"
```

- [ ] **Step 3: Add web env example**

Create `apps/web/.env.example`:

```text
NEXT_PUBLIC_API_URL="http://localhost:3333"
API_INTERNAL_URL="http://localhost:3333"
```

- [ ] **Step 4: Update README development commands**

Modify `README.md` development section to:

```md
## Desenvolvimento Local

```bash
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Aplicacoes locais:

- Frontend Next.js: `http://localhost:3000`
- Backend NestJS: `http://localhost:3333`
- Healthcheck da API: `http://localhost:3333/health`
```

- [ ] **Step 5: Update development environment doc**

Modify `docs/06-ambiente-desenvolvimento.md` commands section to include:

```md
Rodar frontend e backend juntos:

```bash
pnpm dev
```

Rodar apenas frontend:

```bash
pnpm dev:web
```

Rodar apenas backend:

```bash
pnpm dev:api
```

Aplicar migrations pelo backend:

```bash
pnpm db:migrate
```
```

- [ ] **Step 6: Update architecture doc stack decision**

Modify `docs/02-stack-arquitetura.md` so the architecture section states:

```md
## Arquitetura Atual Recomendada

O projeto passa a usar monorepo Turborepo com:

- `apps/web`: Next.js App Router para frontend;
- `apps/api`: NestJS para backend, autenticacao, regras de negocio e banco;
- `packages/shared`: tipos e schemas compartilhados quando houver uso real nos dois lados.

O Next nao deve acessar PostgreSQL diretamente. Venda, cancelamento, estoque, financeiro e permissoes criticas ficam no Nest.
```

---

### Task 10: Full Verification

**Files:**
- No file changes expected unless verification reveals a migration error.

- [ ] **Step 1: Install all dependencies**

Run: `pnpm install`

Expected: install completes without peer dependency errors that block execution.

- [ ] **Step 2: Start database**

Run: `docker compose up -d`

Expected: PostgreSQL container is running on port `5433`.

- [ ] **Step 3: Apply migrations**

Run: `pnpm db:migrate`

Expected: existing migrations apply from `apps/api/src/db/migrations`.

- [ ] **Step 4: Seed admin**

Run: `pnpm db:seed`

Expected: admin user is created or updated using env values.

- [ ] **Step 5: Run typecheck**

Run: `pnpm typecheck`

Expected: Turbo runs typecheck for `shared`, `api`, and `web` successfully.

- [ ] **Step 6: Run lint**

Run: `pnpm lint`

Expected: Turbo runs lint successfully. If API lint fails because no flat config exists for the API package, add a minimal `apps/api/eslint.config.mjs` using the same ESLint 9 style as the web config, then rerun.

- [ ] **Step 7: Run tests**

Run: `pnpm test`

Expected: Turbo runs package tests. Packages without tests pass using `--passWithNoTests`.

- [ ] **Step 8: Build all packages**

Run: `pnpm build`

Expected: API builds to `apps/api/dist`; web builds `.next` under `apps/web`.

- [ ] **Step 9: Run both apps locally**

Run: `pnpm dev`

Expected: Next listens on `http://localhost:3000`; Nest listens on `http://localhost:3333`.

- [ ] **Step 10: Verify healthcheck**

Open `http://localhost:3333/health` or run: `curl http://localhost:3333/health`

Expected response:

```json
{"ok":true}
```

- [ ] **Step 11: Verify login flow manually**

Open `http://localhost:3000/login`, log in with seeded admin credentials, and confirm redirect to `/dashboard`.

Expected: dashboard loads and shows authenticated layout.

- [ ] **Step 12: Verify unauthorized dashboard access**

Use a clean browser session or clear cookies, then open `http://localhost:3000/dashboard`.

Expected: user is redirected to `/login`.

- [ ] **Step 13: Verify web has no direct DB imports**

Run: `rg "drizzle|postgres|@/db|src/db|db/schema" apps/web/src apps/web/package.json`

Expected: no direct DB imports or DB dependencies remain in web runtime code.

- [ ] **Step 14: Check final status**

Run: `git status --short`

Expected: only intended migration files are changed. Do not revert unrelated pre-existing changes.

---

## Self-Review

- Spec coverage: The plan covers Turborepo setup, `apps/web`, `apps/api`, `packages/shared`, DB ownership by API, auth migration, envs, docs, and verification.
- Scope: Sales and stock business rules are not fully migrated in this plan. This is intentional because the architecture criterion is to move DB/auth and remove direct DB access from Next before implementing the next feature migration. Sales and stock migration should be the next plan after this foundation passes.
- Placeholder scan: No unfinished requirements remain.
- Type consistency: Package names are `web`, `api`, and `shared`, matching Turbo filters and workspace dependencies.
