# Next + Nest Turborepo - Design

## Objetivo

Separar o Planeta Agua em frontend Next.js e backend NestJS dentro de um monorepo Turborepo, mantendo o foco do MVP em vendas, estoque e financeiro simples.

A mudanca deve deixar as regras criticas no backend sem transformar o projeto em uma arquitetura pesada antes da validacao operacional.

## Decisao Aprovada

- Usar monorepo com Turborepo.
- Manter Next.js como frontend em `apps/web`.
- Criar NestJS como backend em `apps/api`.
- Usar `pnpm` workspaces.
- Manter PostgreSQL, Drizzle ORM e Zod.
- Nomear os pacotes como `web`, `api` e `shared` para simplificar filtros do Turbo.
- Banco, migrations, repositories e regras de negocio ficam no backend Nest.
- Next nao acessa o banco diretamente.
- Nao usar Nx.
- Nao configurar cache remoto, CI avancado ou deploy complexo nesta etapa.

## Estrutura

```text
planeta-agua/
  apps/
    web/
      src/
        app/
        components/
        lib/
    api/
      src/
        modules/
          auth/
          products/
          customers/
          sales/
          stock/
          finance/
          users/
        db/
          schema.ts
          index.ts
          migrations/
        main.ts
  packages/
    shared/
      src/
        schemas/
        types/
  docker-compose.yml
  package.json
  pnpm-workspace.yaml
  turbo.json
```

`packages/shared` deve comecar pequeno. Ele existe para tipos e schemas realmente compartilhados entre frontend e backend. Se um schema for usado apenas no backend, fica no backend.

## Responsabilidades

### `apps/web`

O frontend cuida de:

- telas Next.js App Router;
- componentes visuais;
- formularios e estados de UI;
- chamadas HTTP para o backend;
- tratamento de mensagens para o operador;
- protecao visual de telas conforme sessao retornada pela API.

O frontend nao deve conter regra critica de venda, estoque, permissao ou financeiro.

### `apps/api`

O backend cuida de:

- autenticacao e sessao;
- permissoes `ADMIN` e `OPERATOR`;
- regras de produto, venda, estoque e financeiro;
- transacoes de venda e cancelamento;
- acesso ao PostgreSQL via Drizzle;
- migrations e seed admin;
- validacao server-side com Zod.

### `packages/shared`

O pacote compartilhado pode conter:

- enums de dominio;
- tipos de request/response;
- schemas Zod usados pelos dois lados.

Ele nao deve conter acesso a banco, regra de negocio pesada nem codigo especifico de Next ou Nest.

## Fluxo De Dados

```text
Usuario
  -> Next.js UI
  -> HTTP API NestJS
  -> Controller
  -> Service
  -> Repository
  -> Drizzle
  -> PostgreSQL
```

Venda e cancelamento continuam obrigatoriamente transacionais no backend:

```text
finalizar venda
  -> validar usuario e permissao
  -> validar produtos ativos
  -> validar estoque suficiente
  -> criar venda
  -> criar itens com snapshot de produto/preco
  -> baixar estoque
  -> criar movimentos de estoque
  -> garantir que a venda apareca nos resumos financeiros derivados
  -> confirmar transacao
```

## Autenticacao

A autenticacao deve migrar para o Nest.

Modelo recomendado:

- login via `POST /auth/login`;
- logout via `POST /auth/logout`;
- sessao via cookie `httpOnly`;
- endpoint `GET /auth/me` para o frontend obter usuario atual;
- token opaco persistido com hash no banco, preservando a decisao ja feita na base atual.

O cookie deve ser:

- `httpOnly`;
- `sameSite: 'lax'` em desenvolvimento;
- `secure: true` em producao;
- expiracao definida;
- path `/`.

Como frontend e backend podem rodar em portas diferentes localmente, o plano de implementacao deve cuidar de CORS e credenciais de cookie sem expor token ao JavaScript.

## Configuracao Local

Scripts raiz esperados:

```json
{
  "dev": "turbo dev",
  "dev:web": "turbo dev --filter=web",
  "dev:api": "turbo dev --filter=api",
  "build": "turbo build",
  "lint": "turbo lint",
  "typecheck": "turbo typecheck",
  "test": "turbo test",
  "db:generate": "pnpm --filter api db:generate",
  "db:migrate": "pnpm --filter api db:migrate",
  "db:seed": "pnpm --filter api db:seed"
}
```

Portas locais sugeridas:

- frontend Next: `http://localhost:3000`;
- backend Nest: `http://localhost:3333`;
- PostgreSQL Docker: `localhost:5433`.

Variaveis principais:

- `DATABASE_URL` no backend;
- `AUTH_SECRET` no backend para assinatura/segredo operacional da sessao se necessario;
- `WEB_ORIGIN` no backend para CORS;
- `NEXT_PUBLIC_API_URL` no frontend quando chamadas forem feitas direto do browser;
- `API_INTERNAL_URL` no frontend se houver chamadas server-side.

## Migracao Da Base Atual

A base atual ja tem Next, Drizzle, auth propria, layout protegido e features iniciais em `src/features`.

Migração proposta:

1. Criar estrutura Turborepo sem mudar regras de negocio.
2. Mover app Next atual para `apps/web`.
3. Criar `apps/api` NestJS minimo com healthcheck.
4. Mover `src/db`, migrations e seed para `apps/api`.
5. Migrar auth para Nest mantendo o modelo de sessao opaca.
6. Alterar Next para consumir `/auth/login`, `/auth/logout` e `/auth/me`.
7. Migrar sales e stock para Nest antes de evoluir novas telas.
8. Remover acesso direto do Next ao banco.

Essa ordem reduz risco porque primeiro preserva o que ja existe, depois desloca as regras criticas para o backend.

## Deploy

O monorepo deve permitir deploy separado:

- `apps/web` em Vercel, Render ou Railway;
- `apps/api` em Render, Railway ou outro ambiente Node;
- PostgreSQL em Neon, Supabase, Railway ou banco gerenciado equivalente.

Deploy automatizado completo nao entra nesta etapa. O objetivo agora e deixar a estrutura pronta para deploy separado sem bloquear o MVP local.

## Fora Do Escopo

- Nx;
- cache remoto do Turborepo;
- CI/CD completo;
- Kubernetes ou Docker Compose de producao;
- API publica para terceiros;
- versionamento publico de API;
- microservicos;
- multiempresa;
- nota fiscal;
- integracoes de pagamento ou WhatsApp.

## Testes E Verificacao

Verificacoes minimas apos a migracao:

- `pnpm lint` na raiz;
- `pnpm typecheck` na raiz;
- `pnpm test` na raiz quando houver testes;
- `pnpm build` na raiz;
- `pnpm db:migrate` no backend;
- login local funcionando via Next consumindo Nest;
- dashboard protegido carregando usuario de `GET /auth/me`;
- backend impedindo acesso sem sessao valida.

Fluxos criticos de venda e estoque devem ganhar testes no backend quando forem migrados.

## Riscos E Mitigacoes

- Risco: gastar tempo com monorepo em vez do MVP. Mitigacao: Turborepo minimo, sem cache remoto ou CI avancado.
- Risco: quebrar auth existente durante a migracao. Mitigacao: migrar auth antes de vendas/estoque e validar login/logout/me isoladamente.
- Risco: duplicar schemas entre web e api. Mitigacao: usar `packages/shared` apenas quando o compartilhamento for real.
- Risco: cookie entre portas diferentes no desenvolvimento. Mitigacao: configurar CORS com credenciais e origem explicita.
- Risco: Next continuar importando codigo de banco por acidente. Mitigacao: mover `db` para `apps/api` e revisar imports antes de concluir.

## Criterio De Pronto

A migracao de arquitetura estara pronta quando:

- o repositorio rodar como Turborepo;
- `apps/web` e `apps/api` rodarem em desenvolvimento;
- o banco e migrations estiverem sob `apps/api`;
- login/logout/me funcionarem via API Nest;
- o dashboard protegido continuar acessivel apenas com sessao valida;
- o Next nao importar Drizzle, schema de banco ou repositories;
- os comandos raiz de lint, typecheck e build estiverem funcionando.
