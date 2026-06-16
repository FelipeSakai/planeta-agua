# Ambiente De Desenvolvimento

## Requisitos

- Node.js compativel com Next.js 16;
- pnpm;
- Docker;
- Docker Compose.

## Banco Local

Subir PostgreSQL:

```bash
docker compose up -d
```

URL local:

```text
postgres://planeta_agua:planeta_agua@localhost:5433/planeta_agua
```

## Variaveis De Ambiente

Copiar `.env.example` para `.env` e ajustar se necessario.

Variaveis principais:

- `DATABASE_URL`;
- `AUTH_SECRET`.

## Comandos

Instalar dependencias:

```bash
pnpm install
```

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

Gerar migration:

```bash
pnpm db:generate
```

Aplicar migrations pelo backend:

```bash
pnpm db:migrate
```

Abrir Drizzle Studio:

```bash
pnpm db:studio
```
