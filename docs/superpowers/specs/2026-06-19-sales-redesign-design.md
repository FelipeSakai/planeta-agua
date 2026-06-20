# Spec: Redesign da Tela de Vendas

## Status

Aprovado pelo usuário em 19/06/2026. Pronto para gerar plano de implementação.

## Objetivo

Redesenhar a tela `/vendas` para reduzir a densidade textual, acelerar o fluxo de balcão e separar o histórico em uma página própria. O operador deve registrar uma venda do início ao fim sem precisar rolar a tela.

## Escopo

### Dentro do escopo

- Redesign da tela `/vendas`.
- Nova página `/vendas/historico`.
- Busca de cliente com dois campos separados (nome/telefone e código/endereço).
- Busca de produto por campo único com dropdown de sugestões.
- Carrinho lateral fixo com quantidade numérica, preço editável e desconto por item.
- Status `PENDING_DELIVERY` para vendas pagas pendentes de entrega.
- Ação de confirmar entrega na tela de histórico.

### Fora do escopo

- Venda fiado (`PENDING_PAYMENT`) — não entra nesta entrega.
- Rascunho de venda (`DRAFT`) — não entra nesta entrega.
- Múltiplas formas de pagamento em uma única venda.
- Relatórios avançados.

## Design Direction

- **Register:** product (interface operacional interna).
- **Color strategy:** Restrained, usando `DESIGN.md` existente.
- **Scene sentence:** O operador está atrás do balcão de uma loja de água, em ambiente claro, atendendo clientes em sequência rápida, com pouco tempo para ler textos longos.
- **Anchor references:** checkout de supermercado (carrinho lateral fixo), busca de cliente do iFood/Registro.br (busca com sugestões), PDV moderno.

## Layout

### Desktop / Tablet

```
+----------------------------------+----------------------+
|  Cliente                         |  CARRINHO            |
|  [nome/telefone] [cod/endereco]  |  - item 1  qtd preco |
|                                  |  - item 2  qtd preco |
|  Produto                         |                      |
|  [buscar produto...      ]       |  Total: R$ 0,00      |
|  [sugestão 1]                     |  [forma pagamento]   |
|  [sugestão 2]                     |  [Finalizar venda]   |
|                                  |                      |
+----------------------------------+----------------------+
```

- Sidebar direita fixa (~360px): carrinho, total, forma de pagamento, botão "Finalizar".
- Área principal à esquerda: cliente e busca de produto.
- Histórico não aparece mais na mesma página.

### Mobile

Empilhado: cliente → busca de produto → carrinho expansível → pagamento.

## Componentes da tela de venda

### 1. Bloco de cliente

- Dois inputs de busca lado a lado no desktop, empilhados no mobile:
  - **Principal:** nome ou telefone.
  - **Secundário:** código do cliente ou endereço.
- O campo secundário busca no campo `code` (novo) ou `address` do cliente.
- Dropdown de sugestões quando houver resultados.
- Se múltiplos matches, mostra lista selecionável com nome, telefone, código e endereço resumido.
- Botão discreto "+ cadastrar" ao lado dos campos.
- Quando um cliente é selecionado, mostra apenas nome, telefone e botão "trocar". Campos de galão aparecem compactados abaixo.
- Remove textos explicativos como "Você pode finalizar a venda sem cliente...".

### 2. Bloco de produto

- Um campo de busca central: placeholder "Digite o nome do produto".
- Resultados aparecem em dropdown abaixo do campo (máximo 8 itens).
- Cada resultado mostra: nome, estoque atual e preço.
- Clique no resultado adiciona 1 unidade ao carrinho e limpa o campo de busca.
- Produto inativo não aparece nos resultados.
- Se estoque for zero, o resultado aparece desabilitado com mensagem curta "sem estoque".

### 3. Carrinho lateral

Lista de itens com as seguintes colunas/linhas:

- Nome do produto.
- Input numérico de quantidade (mínimo 1).
- Preço unitário editável: mostra o preço padrão, mas permite alterar (ex: R$ 15,00 → R$ 13,00).
- Campo de desconto por item em reais (opcional).
- Subtotal calculado: `(quantidade × preço unitário) - desconto`.
- Botão de remover item.

Ações abaixo da lista:

- Select de forma de pagamento.
- Checkbox "Entregar depois".
- Total destacado.
- Botão "Finalizar venda".

### 4. Finalização

- Se "Entregar depois" estiver marcado, a venda é criada com status `PENDING_DELIVERY`.
- Se não estiver marcado, a venda é criada com status `COMPLETED`.
- Em ambos os casos, o estoque é baixado no ato da criação.
- Após finalização, o carrinho é limpo e a busca é resetada.

## Nova página de histórico

Rota: `/vendas/historico`

### Layout

- Cabeçalho com título "Histórico de vendas".
- Tabs ou filtros rápidos: Hoje, Concluídas, Pendentes de entrega, Canceladas.
- Tabela com colunas: cliente, total, pagamento, status, horário, ações.

### Ações por status

| Status | Ações disponíveis |
|---|---|
| `COMPLETED` | Cancelar venda (com motivo). |
| `PENDING_DELIVERY` | Confirmar entrega (muda para `COMPLETED`) ou Cancelar venda. |
| `CANCELED` | Somente consulta. |

### Regras de cancelamento

- Apenas `ADMIN` e `OPERATOR` podem cancelar.
- Cancelar devolve o estoque e cria movimentação `CANCELED_SALE`.
- Cancelamento sempre exige motivo.

## Estados e feedback

| Estado | Comportamento |
|---|---|
| Vazio | Carrinho mostra total zerado e mensagem curta "Adicione produtos". |
| Buscando cliente | Loader discreto no campo; resultados em dropdown. |
| Nenhum cliente encontrado | Mensagem curta no dropdown com link "Cadastrar novo". |
| Produto sem estoque | Resultado desabilitado no dropdown. |
| Erro ao finalizar | Alerta no topo com ação clara. |
| Sucesso | Carrinho limpo; mensagem curta de confirmação. |

## Mudanças no modelo de dados

### Customers

Adicionar coluna opcional:

- `code`: código curto interno do cliente (ex: `C001`), usado para busca rápida no PDV.

### Status de venda

Adicionar `PENDING_DELIVERY` ao enum de status de `sales`.

Valores finais:

- `COMPLETED`
- `CANCELED`
- `PENDING_DELIVERY`

### Sale items

Adicionar colunas opcionais:

- `discount_cents`: desconto aplicado no item (inteiro, centavos).
- `final_unit_price_cents`: preço unitário efetivo após edição (caso o operador altere o preço).

Se `final_unit_price_cents` for nulo, usa `unit_price_cents`.

### Movimentação de estoque

- Venda `COMPLETED` ou `PENDING_DELIVERY`: cria movimentação `SALE`.
- Cancelamento: cria movimentação `CANCELED_SALE` e devolve estoque.
- Confirmação de entrega: não gera movimentação de estoque (estoque já foi baixado no ato da venda).

## Decisões assumidas

1. **Desconto é por item**, não no total da venda. Facilita rastreamento no histórico.
2. **OPERATOR pode editar preço unitário.** O preço efetivo é salvo no snapshot do item.
3. **Qualquer perfil autenticado pode confirmar entrega.** Ação simples e operacional.
4. **Estoque é baixado no ato da venda**, mesmo para `PENDING_DELIVERY`. Evita vender estoque comprometido duas vezes.
5. **Histórico não aparece mais em `/vendas`.** A tela de venda fica exclusiva para operação.

## Referências do Impeccable recomendadas

- `reference/layout.md` — reorganização da página.
- `reference/clarify.md` — redução de texto e microcopy.
- `reference/adapt.md` — responsivo.
- `reference/animate.md` — transições sutis no carrinho.

## Notas de implementação

- Reutilizar componentes existentes: `Panel`, `Button`, `TextInput`, `SelectInput`, `Field`, `Badge`, `Alert`, `DataTable`, `Drawer`, `EmptyState`.
- Criar novos componentes se necessário: `CustomerSearch`, `ProductSearch`, `CartSidebar`, `SaleHistoryTabs`.
- Manter validação no servidor para estoque, preços e descontos.
- Atualizar `packages/shared/src/sales.ts` com novos contratos.
- Criar migration do Drizzle para adicionar `code` em customers, `PENDING_DELIVERY` em sales e colunas de desconto/preço efetivo em sale_items.
