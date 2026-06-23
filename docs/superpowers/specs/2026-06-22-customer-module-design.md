# Design: Módulo de Clientes

## Data

2026-06-22

## Status

Aguardando aprovação para implementação.

## 1. Objetivo

Entregar o módulo de **Clientes** do MVP, permitindo cadastro, edição, listagem e controle de múltiplos galões por cliente, com histórico de vendas e alerta de validade dos galões completos.

## 2. Escopo

### Dentro do escopo

- CRUD de clientes (nome, telefone, endereço, observação).
- Listagem simples com busca por nome/telefone.
- Aviso de duplicidade no cadastro/edição (nome ou telefone já existente).
- Ficha do cliente com abas:
  - Dados cadastrais
  - Galões ativos
  - Histórico de vendas
- Controle de **vários galões completos** por cliente.
- Cada galão tem mês/ano de fabricação, observação e data de validade (3 anos).
- Alerta de validade: 30 dias antes do vencimento e quando já vencido.
- Integração com vendas: venda de "Galão Completo" cria novo galão na ficha do cliente; venda de "Galão Troca" aparece só no histórico de vendas.
- Inativação segura de cliente (soft delete), preservando histórico de vendas.

### Fora do escopo

- Controle de débito/crédito do cliente.
- Relatórios avançados de cliente.
- Notificações automáticas (e-mail, WhatsApp).
- Vincular troca a galão específico (o sistema não rastreia qual galão foi trocado).

## 3. Contexto

O schema já possui a tabela `customers` com os campos básicos (`name`, `code`, `phone`, `address`, `notes`). A navegação do sistema já inclui o item "Clientes" em `/clientes`, acessível a `ADMIN` e `OPERATOR`. O módulo de vendas já permite buscar/cadastrar cliente rapidamente e já registra dados de galão nas vendas (`bottle_month`, `bottle_year`, `bottle_notes`).

Este design estende o modelo para suportar múltiplos galões por cliente e vincula automática entre vendas de galão completo e a ficha do cliente.

## 4. Modelo de Dados

### 4.1. Alterações em `customers`

Adicionar campo de inativação:

```ts
isActive: boolean("is_active").notNull().default(true),
```

### 4.2. Nova tabela `customer_bottles`

```ts
export const customerBottles = pgTable("customer_bottles", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  saleId: uuid("sale_id").references(() => sales.id),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps,
});
```

### 4.3. Alterações em `products`

Adicionar campo para identificar o tipo de galão:

```ts
bottleType: bottleTypeEnum("bottle_type").notNull().default("NONE"),
```

Onde `bottleTypeEnum` pode ser `NONE`, `COMPLETE` ou `EXCHANGE`.

### 4.4. Cálculo de validade

- Um galão fabricado em mês `X` de ano `Y` vence no último dia do mês `X` do ano `Y + 3`.
- Exemplo: galão de 06/2024 vence em 30/06/2027.
- O campo `expires_at` é calculado no momento da criação/edição do registro.

## 5. API

### 5.1. Clientes

- `GET /customers?q={search}&page={page}&limit={limit}`
  - Lista clientes ativos.
  - Busca por nome ou telefone (case-insensitive, partial match).
  - Paginação padrão: 20 itens.

- `POST /customers`
  - Cria cliente.
  - Valida duplicidade de nome ou telefone.

- `GET /customers/:id`
  - Retorna cliente + galões ativos + histórico recente de vendas (últimas 20).

- `PATCH /customers/:id`
  - Edita dados cadastrais.
  - Permite manter o próprio nome/telefone sem acusar duplicidade.

- `PATCH /customers/:id/toggle-active`
  - Ativa/inativa cliente (soft delete).

### 5.2. Galões do cliente

- `POST /customers/:id/bottles`
  - Adiciona galão manualmente.
  - Campos: `month`, `year`, `notes`.

- `PATCH /customers/:id/bottles/:bottleId`
  - Edita mês/ano/observação de um galão.

- `PATCH /customers/:id/bottles/:bottleId/deactivate`
  - Desativa um galão (`is_active = false`).

### 5.3. Integração com vendas

- No `SalesService`, ao finalizar uma venda, para cada item cujo produto tenha `bottle_type = COMPLETE`, criar um registro em `customer_bottles` vinculado à venda (`sale_id`).
- Produtos com `bottle_type = EXCHANGE` não criam registro em `customer_bottles`.
- A criação do galão deve ocorrer dentro da mesma transação da venda.

## 6. Interface Web

### 6.1. /clientes — Listagem

- Tabela densa com colunas:
  - Nome
  - Telefone
  - Endereço (truncado)
  - Badge de alerta quando houver galão próximo de vencer ou vencido
- Toolbar com:
  - Campo de busca (placeholder: "Buscar por nome ou telefone")
  - Botão "Novo cliente"
- Clique na linha abre o drawer da ficha do cliente.

### 6.2. Drawer da Ficha do Cliente

- Cabeçalho: nome, telefone, botões "Editar" e "Inativar".
- Abas:
  1. **Dados**: formulário de edição inline (nome, telefone, endereço, observação).
  2. **Galões**: lista dos galões ativos com mês/ano, observação, data de validade e alerta visual. Botão "Adicionar galão".
  3. **Vendas**: histórico de vendas do cliente (data, produtos, total, forma de pagamento).

### 6.3. Alertas visuais

- **Amarelo**: galão vence em até 30 dias.
- **Vermelho**: galão já vencido.
- Badge discreto na listagem quando houver qualquer alerta ativo.

### 6.4. Design system

Seguir o padrão das telas existentes (Produtos/Estoque/Vendas): cards brancos sobre canvas cream, tabela densa, drawer lateral, inputs com borda hairline, badges de estado.

## 7. Regras e Validações

### 7.1. Cliente

- Nome obrigatório, mínimo 2 caracteres.
- Telefone opcional; se preenchido, deve ter formato válido.
- Não permitir criar cliente com nome ou telefone já cadastrado, exceto na edição do próprio registro.
- Cliente inativo não aparece na busca da tela de vendas.

### 7.2. Galão

- Mês entre 1 e 12.
- Ano entre 2000 e ano atual + 1.
- `expires_at` calculado automaticamente.
- Edição manual permitida a qualquer momento.
- Desativação não remove o registro do banco.

### 7.3. Integração com vendas

- Venda de produto `bottle_type = COMPLETE` sempre cria um `customer_bottle`, mesmo que o cliente já tenha outros galões ativos.
- Venda de produto `bottle_type = EXCHANGE` apenas registra a venda.
- Se o cliente for inativado, vendas antigas permanecem vinculadas a ele.

## 8. Testes

- **API**: testes de controller, service e repository do `CustomerModule`.
- **Regras de negócio**: cálculo de validade do galão, validação de duplicidade, criação de galão a partir de venda.
- **Web**: testes de componentes da listagem, drawer de cliente e formulário de galão.
- **Integração**: fluxo de venda de "Galão Completo" → criação automática de `customer_bottle`.

## 9. Dependências

- Depende do módulo de vendas já existente.
- Requer migration para criar `customer_bottles` e adicionar `bottle_type` em `products` e `is_active` em `customers`.
- Requer rebuild de `packages/shared` se novos contratos forem adicionados.

## 10. Notas

- Manter as regras de venda e estoque no servidor, conforme governança do projeto.
- Preservar histórico: nunca deletar fisicamente registros com histórico operacional.
- Valores monetários continuam sendo persistidos em centavos inteiros.
