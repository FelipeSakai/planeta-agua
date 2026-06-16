# Stack e Arquitetura

## Stack Recomendada

### Aplicacao

- Next.js App Router;
- React;
- TypeScript;
- Tailwind CSS;
- Server Components quando fizer sentido;
- Server Actions ou Route Handlers para operacoes internas;
- React Hook Form para formularios complexos;
- Zod para validacao.

### Banco e Dados

- PostgreSQL;
- Drizzle ORM;
- Migrations versionadas;
- Transacoes para venda, cancelamento e estoque.

### Autenticacao

Opcoes aceitaveis:

- Auth.js com credenciais;
- Auth propria simples com senha hash, cookie httpOnly e controle de sessao.

Para o MVP, priorizar login simples e seguro em vez de OAuth ou fluxos complexos.

### UI

- Tailwind CSS;
- Componentes locais simples;
- shadcn/ui pode ser usado se acelerar sem engessar o projeto;
- Layout responsivo para desktop e celular.

### Deploy

- Frontend/app: Vercel, Render ou Railway;
- Banco: Neon, Supabase ou Railway;
- Ambiente unico de producao no inicio;
- Backup basico do banco desde o primeiro uso real.

## Arquitetura Atual Recomendada

O projeto passa a usar monorepo Turborepo com:

- `apps/web`: Next.js App Router para frontend;
- `apps/api`: NestJS para backend, autenticacao, regras de negocio e banco;
- `packages/shared`: tipos e schemas compartilhados quando houver uso real nos dois lados.

O Next nao deve acessar PostgreSQL diretamente. Venda, cancelamento, estoque, financeiro e permissoes criticas ficam no Nest.

## Estrutura Inicial Sugerida

```text
apps/
  web/
    src/
      app/
      components/
      features/
      lib/
  api/
    src/
      db/
      features/
      health/
    drizzle.config.ts
packages/
  shared/
    src/
```

## Padrao Por Feature

Cada modulo deve concentrar sua regra de negocio:

```text
features/sales/
  sales.actions.ts
  sales.service.ts
  sales.repository.ts
  sales.schemas.ts
  sales.types.ts
```

Diretrizes:

- `*.actions.ts`: entrada da UI, validacao de sessao, permissao e input.
- `*.service.ts`: regra de negocio e coordenacao de transacoes.
- `*.repository.ts`: acesso ao banco com Drizzle.
- `*.schemas.ts`: validacoes Zod.
- `*.types.ts`: tipos especificos do modulo.

Fluxo padrao:

```text
Page/Form -> HTTP API -> Nest Service -> Repository -> Drizzle/PostgreSQL
```

Nao criar repository generico antes de necessidade real. Cada feature deve ter um repository simples e direto.

## Regras Tecnicas Criticas

### Venda

A finalizacao de venda deve ser transacional:

1. validar usuario;
2. validar produtos ativos;
3. validar estoque suficiente;
4. criar venda;
5. criar itens;
6. baixar estoque;
7. criar movimentos de estoque;
8. confirmar transacao.

O `sales.service.ts` deve controlar a transacao. O `sales.repository.ts` pode receber `db` ou `tx` como parametro para executar operacoes dentro da mesma transacao.

### Cancelamento

Cancelar venda deve ser transacional:

1. validar permissao;
2. validar que a venda ainda nao foi cancelada;
3. alterar status para `CANCELED`;
4. devolver estoque;
5. criar movimento `CANCELED_SALE`.

### Financeiro

No MVP, financeiro nao deve virar modulo contabil.

Entradas sao derivadas das vendas concluidas. Saidas sao despesas simples cadastradas manualmente.

## Decisoes Tecnicas Iniciais

- Usar centavos inteiros para valores monetarios no banco.
- Nao usar float para dinheiro.
- Usar UUID ou cuid para ids.
- Usar soft status em vendas, nao deletar vendas.
- Produto pode ser inativado, mas nao deletado se tiver historico.
- Cliente pode ser opcional ate a decisao final do fluxo.
