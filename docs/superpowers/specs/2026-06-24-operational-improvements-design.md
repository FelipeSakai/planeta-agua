# Design: Melhorias Operacionais - Fontes, Dashboard, Entregas, Recibo e Fechamento

## Data

2026-06-24

## Status

Aguardando aprovacao para implementacao.

## 1. Objetivo

Cinco melhorias de fluxo operacional para o MVP da loja de agua:
1. Reduzir fontes do aumento exagerado de 30% para ~15%.
2. Dashboard com botao "Nova Venda" e pendencias de entrega visiveis.
3. Tela de entregas pendentes com confirmacao individual.
4. Recibo de venda imprimivel em 3 lugares (venda, entregas, historico).
5. Botao "Imprimir fechamento" na tela de caixa.

## 2. Item 1: Reduzir Fontes para ~15%

O aumento anterior de 30% ficou exagerado. Reverter para um aumento moderado.

### Tokens de Tipografia

| Token | Atual (exagerado) | Novo (~15%) |
|---|---|---|
| body | 21px | 18px |
| body-sm | 18px | 15px |
| caption | 16px | 13px |
| button | 19px | 16px |
| card-title | 28px | 24px |
| headline | 36px | 30px |
| display-md | 52px | 46px |

### Arquivos afetados

- `apps/web/src/app/globals.css` — variaveis CSS de tipografia
- Componentes de UI (PageHeader, MetricCard, etc.)

## 3. Item 2: Dashboard com Atalho e Pendencias

### Melhorias no Dashboard

- Adicionar botao grande "Nova Venda" no topo do dashboard que linka para `/vendas`
- Adicionar secao "Entregas Pendentes" mostrando vendas com status `PENDING_DELIVERY`:
  - Cliente, endereco, entregador, valor
  - Link para tela `/entregas`
- Manter o que ja existe: faturamento do dia, vendas do dia, totais por pagamento, estoque baixo, ultimas vendas

### Arquivos afetados

- `apps/web/src/app/(app)/dashboard/page.tsx`
- `apps/api/src/modules/finance/finance.service.ts` (adicionar pendencias no dashboard)

## 4. Item 3: Tela de Entregas Pendentes

### Nova rota `/entregas`

- Lista vendas com status `PENDING_DELIVERY`
- Colunas: cliente, endereco, telefone, entregador, itens, total, forma de pagamento
- Botao "Confirmar Entrega" individual por linha
- Botao "Imprimir Recibo" por linha
- Filtro por entregador (opcional)
- Atualizacao automatica apos confirmar (router.refresh)

### Arquivos afetados

- Criar: `apps/web/src/app/(app)/entregas/page.tsx`
- Criar: `apps/web/src/app/(app)/entregas/deliveries-ui.tsx`
- Adicionar "Entregas" na navegacao lateral (ADMIN + OPERATOR)

## 5. Item 4: Recibo de Venda Imprimivel

### Conteudo do Recibo

Um recibo unico que adapta conforme o tipo de venda:

**Sempre mostra:**
- Nome da loja ("Planeta Agua")
- Data e hora da venda
- Numero/ID da venda
- Nome do cliente (se houver)
- Itens: nome do produto, quantidade, valor unitario, total
- Total geral
- Forma de pagamento

**So quando tem entrega (PENDING_DELIVERY ou entregador):**
- Endereco do cliente
- Telefone do cliente
- Nome do entregador
- Status: "Pendente de entrega" ou "Entregue"

### Como Imprimir

- `window.print()` com CSS de impressao (`@media print`)
- CSS esconde toda a interface e mostra so o recibo
- Recibo formatado para impressora A4 (nao termica 80mm)

### Onde tem botao de imprimir

1. **No momento da venda** — no banner de sucesso, botao "Imprimir recibo" neben der success message
2. **Na tela de entregas** — botao por entrega pendente
3. **No historico de vendas** — botao por venda

### Arquivos afetados

- Criar: `apps/web/src/components/recibo/print-recibo.tsx` (componente do recibo)
- Adicionar CSS de impressao em `apps/web/src/app/globals.css`
- Modificar: `apps/web/src/app/(app)/vendas/sales-ui.tsx` (botao no banner)
- Modificar: `apps/web/src/app/(app)/entregas/deliveries-ui.tsx` (botao por entrega)
- Modificar: `apps/web/src/app/(app)/vendas/historico/history-ui.tsx` (botao por venda)

## 6. Item 5: Imprimir Fechamento do Caixa

### O que mostra

Na tela de caixa (`/caixa`), adicionar botao "Imprimir Fechamento" que imprime:
- Data
- Fundo de caixa
- Total de vendas por forma de pagamento
- Total de despesas por forma de pagamento
- Saldo esperado
- Lista de vendas do dia
- Lista de despesas do dia

### Como Imprimir

- Mesmo metodo: `window.print()` com CSS de impressao
- Esconde a interface e mostra so o fechamento

### Arquivos afetados

- Modificar: `apps/web/src/app/(app)/caixa/cash-ui.tsx` (adicionar botao e area de impressao)

## 7. Ordem de Implementacao

1. Reduzir fontes (~15%)
2. Recibo de venda (componente + CSS de impressao + botoes)
3. Tela de entregas pendentes
4. Dashboard com pendencias
5. Imprimir fechamento do caixa

## 8. Fora do Escopo

- Busca global
- Repetir ultima venda
- Atalho de teclado para finalizar
- Confirmacao em lote
- Impressora termica 80mm
- Geracao de PDF no servidor
- Tela mobile para entregador
