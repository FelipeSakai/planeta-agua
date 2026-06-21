# Spec: Financeiro Basico + Dashboard

## Status

Aprovado pelo usuario em 20/06/2026. Pronto para gerar plano de implementacao.

## Objetivo

Entregar dashboard com dados reais do dia e financeiro basico com controle de caixa diario. O caixa abre automaticamente na primeira venda do dia, permite informar o fundo depois, e no fechamento o operador confere todas as formas de pagamento. Despesas do dia a dia podem ser registradas por OPERATOR e saem do caixa quando pagas em dinheiro.

## Escopo

### Dentro do escopo

- Dashboard `/dashboard` com dados reais do dia.
- Sessao de caixa diaria (`cash_registers`), aberta automaticamente na primeira venda.
- Tela `/caixa` para editar fundo e fechar com conferencia por forma de pagamento.
- Tela `/financeiro/despesas` para registrar, listar, editar e excluir logicamente despesas.
- Tela `/financeiro/resumo` para visualizar entradas, saidas e saldo por periodo (ADMIN).
- Total por forma de pagamento considerando vendas e despesas.
- Permissoes: OPERATOR registra vendas, despesas e fecha caixa; ADMIN acessa financeiro completo.

### Fora do escopo

- Multiplas sessoes de caixa por dia ou turnos.
- Abertura manual de caixa sem venda.
- Relatorios avancados.
- Conciliacao bancaria automatica.
- Nota fiscal / integracao de pagamento.

## Design Direction

- **Register:** product (interface operacional interna).
- **Color strategy:** Restrained, usando `DESIGN.md` existente.
- **Scene sentence:** Operador de loja de agua abrindo/fechando rotina diaria em computador/tablet, precisa de visao rapida do dia e controle de caixa sem burocracia.
- **Anchor references:** resumo de caixa de PDV, dashboard de Stripe, controle de despesas do Notion.

## Layout

### Dashboard `/dashboard`

Grid de metric cards:
- Faturamento do dia.
- Quantidade de vendas do dia.
- Total em dinheiro / Pix / debito / credito / outro (5 mini cards ou lista compacta).
- Produtos com estoque baixo (maximo 10).
- Ultimas 10 vendas com atalho "Nova venda".

Mobile: empilhado.

### Caixa `/caixa`

- Estado atual do caixa de hoje:
  - Status (aberto / fechado).
  - Fundo de caixa (editavel enquanto aberto).
  - Resumo por forma de pagamento: vendas, despesas, esperado.
- Botao "Fechar caixa": abre formulario de conferencia com input de valor contado por pagamento, mostra esperado vs contado e diferenca.
- Apos fechado, tela em modo leitura.

### Despesas `/financeiro/despesas`

- Formulario: descricao, valor, categoria, forma de pagamento, data.
- Tabela/lista de despesas do dia (ou periodo selecionado).
- Acoes: editar, excluir logica.

### Resumo `/financeiro/resumo`

- Filtro de periodo: hoje, semana, mes, custom.
- Cards: total de entradas, total de saidas, saldo.
- Lista: total por forma de pagamento (entradas - saidas).

## Regras de Negocio

1. Existe no maximo uma sessao de caixa por dia.
2. O caixa abre automaticamente na primeira venda do dia com `opening_balance_cents = 0`.
3. O fundo de caixa pode ser editado enquanto o caixa estiver aberto.
4. Despesas sao sempre registraveis. Elas afetam o caixa de hoje quando a data da despesa for hoje e o pagamento for em dinheiro, reduzindo o esperado do caixa de hoje.
5. Fechamento do caixa exige valor contado para cada forma de pagamento; valores nao preenchidos sao tratados como 0.
6. Esperado por forma de pagamento:
   - `CASH`: `opening_balance_cents + vendas em dinheiro - despesas em dinheiro`
   - `PIX`: `vendas em Pix - despesas em Pix`
   - `DEBIT_CARD`: `vendas em debito - despesas em debito`
   - `CREDIT_CARD`: `vendas em credito - despesas em credito`
   - `OTHER`: `vendas em outro - despesas em outro`
7. Diferenca = contado - esperado.
8. Vendas canceladas nao entram no caixa.
9. Despesas excluidas logicamente (`is_deleted = true`) nao entram no caixa nem no resumo financeiro.
10. `OPERATOR` registra despesas e fecha caixa; `ADMIN` acessa financeiro completo.

## Estados e Feedback

| Estado | Comportamento |
|---|---|
| Caixa ainda nao existe | Primeira venda do dia cria sessao com fundo zero. |
| Caixa aberto, fundo zero | Operador pode editar fundo. |
| Caixa aberto, com fundo | Mostra saldo esperado por pagamento. |
| Caixa fechado | Somente leitura; mostra conferencia. |
| Sem vendas ainda | Dashboard vazio com CTAs. |
| Sem despesas | Lista vazia com instrucao curta. |

## Modelo de Dados

### cash_registers

```sql
CREATE TABLE cash_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  opening_balance_cents integer NOT NULL DEFAULT 0,
  opened_at timestamp with time zone NOT NULL DEFAULT now(),
  opened_by_user_id uuid NOT NULL REFERENCES users(id),
  closed_at timestamp with time zone,
  closed_by_user_id uuid REFERENCES users(id),
  counts jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
```

Coluna `counts` estrutura:
```json
{
  "CASH": { "expected": 12000, "counted": 11500, "difference": -500 },
  "PIX": { "expected": 30000, "counted": 30000, "difference": 0 },
  ...
}
```

### expenses

Usar tabela existente e adicionar exclusao logica:
- `is_deleted` boolean DEFAULT false
- `deleted_at` timestamp with time zone
- `deleted_by` uuid REFERENCES users(id)

Campos existentes ja suficientes: `description`, `amount_cents`, `category`, `payment_method`, `date`, `created_by`, `created_at`, `updated_at`.

### Categorias de despesa (fixas no MVP)

- `MARMITA`
- `GASOLINA`
- `MANUTENCAO`
- `OUTRO`

## Endpoints API (novos)

- `GET /finance/dashboard` — resumo do dia (vendas, despesas, estoque baixo, ultimas vendas).
- `GET /cash-register/today` — sessao de caixa de hoje (se existir).
- `POST /cash-register/today/opening-balance` — atualiza fundo de caixa aberto.
- `POST /cash-register/today/close` — fecha caixa com valores contados.
- `GET /expenses` — lista despesas nao excluidas (filtro por data/periodo).
- `POST /expenses` — cria despesa.
- `PATCH /expenses/:id` — edita despesa.
- `DELETE /expenses/:id` — exclusao logica.

## Permissoes

| Rota / Acao | ADMIN | OPERATOR |
|---|---|---|
| Dashboard | ✅ | ✅ |
| Caixa (ver/fechar) | ✅ | ✅ |
| Despesas (CRUD) | ✅ | ✅ |
| Financeiro / Resumo | ✅ | ❌ |

## Decisoes Assumidas

1. Categorias de despesa sao fixas no MVP (Marmita, Gasolina, Manutencao, Outro).
2. Caixa so existe a partir da primeira venda do dia; nao e possivel criar manualmente para dias sem venda.
3. Edicao de despesa apos fechamento do caixa e permitida, mas nao recalcula o caixa ja fechado.
4. Exclusao de despesa e logica (`is_deleted`), preservando historico.
5. `counts` e armazenado como JSONB para flexibilidade por forma de pagamento.

## Dependencias

- Modulo de vendas ja implementado (tabelas `sales`, `sale_items`, status `COMPLETED`/`PENDING_DELIVERY`/`CANCELED`).
- Tabela `expenses` ja existe no schema.
- Autenticacao e roles ja implementadas.

## Referencias do Impeccable Recomendadas

- `reference/layout.md` — grids de dashboard.
- `reference/clarify.md` — microcopy de caixa/despesas.
- `reference/adapt.md` — responsivo.

## Notas de Implementacao

- Reutilizar componentes existentes: `Panel`, `Button`, `TextInput`, `SelectInput`, `Field`, `Badge`, `Alert`, `DataTable`, `EmptyState`, `MetricCard`, `PageHeader`.
- Manter valores em centavos inteiros em todo backend e banco.
- Criar migration Drizzle para `cash_registers` e alteracao em `expenses`.
- Atualizar `packages/shared` com novos contratos de dashboard, caixa e despesas.
- Implementar modulo Nest: `FinanceModule` (ou expandir `SalesModule` se preferir proximidade).
- Tela de dashboard deve ser Server Component para buscar dados reais no servidor.
- Tela `/caixa` e `/financeiro/despesas` podem ser Client Components para interacao.
