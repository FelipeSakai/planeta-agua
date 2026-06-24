# Design: UX Improvements - Fontes, Histórico, Caixa e Entregador

## Data

2026-06-23

## Status

Aguardando aprovacao para implementacao.

## 1. Objetivo

Quatro melhorias de UX e funcionalidade para o MVP:
1. Aumentar fontes em ~30% em todo o sistema.
2. Separar histórico de vendas da tela de checkout.
3. Melhorar tela de caixa com detalhamento do dia + feedback ao finalizar venda.
4. Cadastrar entregadores e selecionar qual entregou na venda.

## 2. Item 1: Aumento de Fontes (+30%)

### Tokens de Tipografia

| Token | Atual | Novo | Line-height |
|---|---|---|---|
| body | 16px | 21px | 1.50 |
| body-sm | 14px | 18px | 1.50 |
| body-lg | 18px | 23px | 1.50 |
| caption | 12px | 16px | 1.40 |
| button | 15px | 19px | 1.20 |
| card-title | 22px | 28px | 1.25 |
| headline | 28px | 36px | 1.20 |
| display-md | 40px | 52px | 1.15 |
| display-lg | 56px | 72px | 1.10 |
| display-xl | 72px | 94px | 1.05 |

### Arquivos afetados

- `apps/web/src/app/globals.css` — variáveis CSS de tipografia
- Componentes de UI com tamanhos fixos (PageHeader, MetricCard, etc.)
- Ajustar padding/espacing proporcionalmente onde necessário

## 3. Item 2: Separar Histórico de Vendas

### Navegação

Adicionar dois itens na barra lateral:
- "Nova Venda" -> `/vendas` (ADMIN + OPERATOR)
- "Histórico" -> `/vendas/historico` (ADMIN + OPERATOR)

Remover o item "Vendas" atual e substituir pelos dois acima.

### Tela `/vendas`

- Fica só o checkout (busca de cliente, produtos, carrinho, pagamento)
- Remover a seção de histórico que existe hoje
- Adicionar botão "Ver Histórico" no PageHeader que linka para `/vendas/historico`

### Tela `/vendas/historico`

- Mantém a tabela de vendas com filtros (status, data)
- Ações de cancelar e confirmar entrega
- Mostra nome do entregador quando houver (ver Item 4)

## 4. Item 3: Melhorar Caixa + Feedback de Venda

### Tela de Caixa (`/caixa`)

Além do que já existe (fundo editável, resumo por forma de pagamento, fechamento):

- **Lista de vendas do dia**: horário, cliente, forma de pagamento, valor
- **Lista de despesas do dia**: descrição, forma de pagamento, valor
- **Totais do dia**: total de vendas, total de despesas, saldo esperado
- **Saldo esperado**: fundo de caixa + vendas em dinheiro - despesas em dinheiro

### Feedback ao Finalizar Venda

Na tela `/vendas`, quando uma venda é finalizada com sucesso:
- Mostrar **banner verde** com: "Venda registrada! Total: R$ X,XX — Forma: Dinheiro/Pix/Cartão"
- Se a forma for dinheiro (`CASH`): adicionar "Entrou no caixa de hoje."
- O banner some após 5 segundos ou quando o usuário inicia uma nova venda

### Endpoints necessários

- `GET /finance/cash-register/today/details` — retorna vendas e despesas do dia além do resumo atual

## 5. Item 4: Entregador

### Modelo de Dados

Nova tabela `drivers`:
```ts
drivers: {
  id uuid pk,
  name text not null,
  phone text,
  is_active boolean default true,
  created_at, updated_at,
}
```

Adicionar em `sales`:
```ts
driverId: uuid("driver_id").references(() => drivers.id),
```

### API

- `GET /drivers` — lista entregadores ativos
- `POST /drivers` — cria entregador (nome + telefone)
- `PATCH /drivers/:id` — edita entregador
- `PATCH /drivers/:id/toggle-active` — ativa/inativa

### Tela `/entregadores`

- Lista simples com nome, telefone e botão ativar/inativar
- Drawer para cadastrar/editar (nome + telefone)
- Navegação: "Entregadores" na barra lateral (ADMIN + OPERATOR)

### Seleção na Venda

- Campo "Entregador" (select opcional) no checkout
- Se a venda for marcada como entrega pendente (`deliveryPending = true`), o entregador é obrigatório
- Salvar `driverId` na venda

### Histórico de Vendas

- Mostrar nome do entregador quando a venda tiver um vinculado

## 6. Ordem de Implementação

1. Fontes (+30%) — mudança global de CSS
2. Separar histórico de vendas — mudança de navegação/layout
3. Melhorar caixa + feedback de venda
4. Entregador — novo módulo + integração com vendas

## 7. Fora do Escopo

- Tela mobile para entregador
- Login de entregador
- Roteirização de entregas
- Mapas ou GPS
- Relatórios de entregador
