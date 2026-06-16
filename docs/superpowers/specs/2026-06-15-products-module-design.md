# Products Module - Design

## Objetivo

Implementar o modulo de Produtos no monorepo Next + Nest para permitir cadastro, edicao, ativacao/inativacao e consulta operacional de produtos do MVP.

Produtos desbloqueiam os proximos fluxos de estoque e venda. A primeira entrega deve ser simples, segura e rapida de operar.

## Decisoes Aprovadas

- `ADMIN` pode criar, editar, ativar e inativar produtos.
- `OPERATOR` pode apenas consultar produtos.
- Next nao acessa banco diretamente.
- Regras, validacao server-side e permissoes ficam no Nest.
- Valores monetarios continuam em centavos inteiros no banco e na API.
- Produto nao sera deletado fisicamente.
- Produto inativo continuara visivel na tela de Produtos, mas nao deve aparecer em fluxos futuros de venda.

## Escopo

### Inclui

- API Nest para listar produtos.
- API Nest para buscar produto por id.
- API Nest para criar produto.
- API Nest para editar produto.
- API Nest para ativar/inativar produto.
- Tela protegida `/produtos` no Next.
- Formulario de criar/editar produto para `ADMIN`.
- Visualizacao de produtos para `ADMIN` e `OPERATOR`.
- Destaque de estoque baixo.
- Badges de status ativo/inativo.
- Testes de schemas/regras principais.

### Nao Inclui

- Categorias de produto.
- Codigo de barras.
- Fornecedores.
- Historico visual de alteracoes do produto.
- Importacao em massa.
- Paginacao avancada.
- Busca fuzzy.
- Controle separado de galao cheio/vazio.

Esses itens ficam fora para manter o MVP focado no fluxo principal.

## Modelo De Dados

A tabela `products` ja existe no schema Drizzle:

```text
products
  id
  name
  description
  sale_price_cents
  stock_quantity
  minimum_stock
  is_active
  created_at
  updated_at
```

Nao ha necessidade de nova migration para esta entrega.

## API Nest

Modulo previsto:

```text
apps/api/src/modules/products/
  products.controller.ts
  products.module.ts
  products.repository.ts
  products.schemas.ts
  products.service.ts
```

Endpoints:

```text
GET    /products
GET    /products/:id
POST   /products
PATCH  /products/:id
PATCH  /products/:id/activate
PATCH  /products/:id/deactivate
```

Permissoes:

- `GET /products`: usuario autenticado `ADMIN` ou `OPERATOR`.
- `GET /products/:id`: usuario autenticado `ADMIN` ou `OPERATOR`.
- `POST /products`: somente `ADMIN`.
- `PATCH /products/:id`: somente `ADMIN`.
- `PATCH /products/:id/activate`: somente `ADMIN`.
- `PATCH /products/:id/deactivate`: somente `ADMIN`.

O backend deve reutilizar a sessao atual do cookie `planeta_agua_session` para identificar o usuario.

## Validacao

Criacao e edicao devem validar:

- `name`: texto obrigatorio, sem aceitar vazio depois de trim.
- `description`: opcional, pode ser vazio e deve ser salvo como `null` quando vazio.
- `salePriceCents`: inteiro maior ou igual a `0`.
- `stockQuantity`: inteiro maior ou igual a `0`.
- `minimumStock`: inteiro maior ou igual a `0`.

Edicao pode aceitar os mesmos campos da criacao. Para manter simples no MVP, a tela deve enviar o payload completo do formulario ao salvar.

Erros devem retornar mensagens claras para operador nao tecnico, sem stack trace.

## Regra De Estoque Baixo

Produto esta com estoque baixo quando:

```text
stockQuantity <= minimumStock
```

Esse calculo pode ser retornado pela API como `isLowStock` para simplificar a UI.

## Tela `/produtos`

A tela deve ser protegida pelo layout autenticado atual.

Conteudo:

- titulo `Produtos`;
- resumo simples com total de produtos, ativos e estoque baixo;
- lista em tabela/cards responsivos;
- colunas/campos visiveis: nome, preco, estoque, estoque minimo, status;
- destaque visual para estoque baixo;
- botao `Novo produto` apenas para `ADMIN`;
- acao `Editar` apenas para `ADMIN`;
- acao `Inativar` ou `Ativar` apenas para `ADMIN`.

`OPERATOR` deve conseguir consultar produtos para apoiar a venda, mas nao deve ver controles de alteracao.

## Formulario

Campos:

- Nome;
- Descricao opcional;
- Preco de venda em reais na UI;
- Estoque atual;
- Estoque minimo;
- Status ativo/inativo por acao separada, nao dentro do formulario inicial.

Conversao de dinheiro:

- UI exibe reais, por exemplo `12,50`.
- Antes de enviar para API, converter para centavos inteiros.
- API persiste apenas `salePriceCents`.

## Fluxo De Dados

```text
Usuario
  -> /produtos no Next
  -> route handler ou fetch server-side do Next
  -> API Nest /products
  -> ProductsController
  -> ProductsService
  -> ProductsRepository
  -> Drizzle/PostgreSQL
```

O Next pode usar route handlers internos para manter chamadas same-origin, seguindo o padrao ja usado em `/api/auth/login` e `/api/auth/logout`.

## Erros

Mensagens esperadas:

- produto nao encontrado: `Produto nao encontrado.`
- sem permissao: `Voce nao tem permissao para alterar produtos.`
- validacao: `Confira os dados do produto.`

Logs nao devem expor dados sensiveis de usuario ou cliente.

## Testes

Backend:

- schema aceita produto valido;
- schema rejeita nome vazio;
- schema rejeita valores negativos;
- service calcula `isLowStock` corretamente;
- service impede alteracao quando usuario nao e `ADMIN`.

Frontend:

- `OPERATOR` nao ve botoes de criar/editar/inativar;
- `ADMIN` ve controles de alteracao;
- estoque baixo aparece destacado;
- preco em centavos e formatado em reais.

## Criterio De Pronto

Modulo estara pronto quando:

- `ADMIN` conseguir criar produto pela UI;
- `ADMIN` conseguir editar produto pela UI;
- `ADMIN` conseguir ativar/inativar produto pela UI;
- `OPERATOR` conseguir consultar produtos sem controles de edicao;
- produtos com estoque baixo ficarem visiveis;
- Next nao importar banco diretamente;
- `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` passarem.
