# Modulo De Vendas MVP

## Objetivo

Implementar o fluxo principal de vendas do Planeta Agua com foco em operacao de balcao: registrar venda rapidamente, validar estoque no servidor, baixar estoque automaticamente, gerar entrada financeira derivada e manter historico confiavel para cancelamento e conferencia de caixa.

## Escopo Desta Entrega

Esta spec cobre:

- Tela de nova venda.
- Historico de vendas.
- Cancelamento controlado.
- Formas de pagamento do primeiro dia.
- Cliente opcional.
- Controle simples de galao por cliente no fluxo da venda.

Esta spec nao cobre:

- Fiado ou pagamento posterior.
- Entrega avancada.
- Rastreio individual completo de galao.
- Relatorios avancados.
- Integracao com pagamento.

## Decisoes Fechadas Para Este Modulo

- Cliente sera opcional na venda.
- Cancelamento podera ser feito por `ADMIN` e `OPERATOR`.
- Formas de pagamento iniciais: `CASH`, `PIX`, `DEBIT_CARD`, `CREDIT_CARD`, `OTHER`.
- O fluxo principal sera de balcao, em tela unica e operacional.
- O controle de galao sera simples: mes, ano e observacao curta.

## Fluxo Principal De Venda

1. Usuario autenticado abre `/vendas`.
2. Seleciona cliente, cadastra rapidamente ou segue sem cliente.
3. Busca produtos ativos.
4. Adiciona itens ao carrinho.
5. Ajusta quantidades.
6. Sistema calcula subtotal e total.
7. Usuario escolhe forma de pagamento.
8. Se houver cliente, pode registrar o galao trazido no atendimento.
9. Usuario finaliza venda.
10. Backend valida estoque, cria venda e itens, baixa estoque, cria movimentacoes e confirma a entrada financeira derivada.

## UX Da Tela De Vendas

### Estrutura

Uma tela principal de operacao, sem wizard por etapas.

- Bloco de cliente no topo.
- Busca e insercao de produtos em destaque.
- Carrinho central com edicao rapida de quantidade.
- Resumo lateral ou fixo com total, forma de pagamento e finalizacao.
- Alertas de estoque e validacao perto do ponto de erro.

### Cliente

- Cliente opcional.
- Deve ser possivel buscar cliente existente rapidamente.
- Deve existir acao de cadastro rapido sem sair do fluxo.
- Se nenhum cliente for escolhido, a venda ainda pode ser finalizada.

### Produtos E Carrinho

- Apenas produtos ativos aparecem na busca.
- Busca deve favorecer operacao rapida por nome.
- Ao adicionar produto, ele entra no carrinho com quantidade inicial `1`.
- Quantidade pode ser ajustada inline.
- Remocao de item deve ser simples.
- Total deve ser recalculado automaticamente na interface, mas o valor final confiavel continua sendo calculado no backend.

### Pagamento

- Escolha unica de forma de pagamento no MVP.
- Opcoes: dinheiro, Pix, debito, credito e outros.
- Forma de pagamento faz parte da validacao obrigatoria para finalizar venda.

## Controle Simples De Galao

### Problema

Clientes podem voltar com galoes de validade diferente do historico conhecido. O operador precisa de uma memoria pratica para perceber divergencias e vencimentos sem transformar o MVP em sistema pesado de rastreio unitario.

### Solucao MVP

Criar um registro simples de galao ligado ao cliente e ao atendimento.

Campos:

- mes;
- ano;
- observacao curta.

### Regras

- So aparece no fluxo se a venda tiver cliente.
- O sistema mostra o ultimo galao registrado daquele cliente.
- O operador pode registrar o galao informado no atendimento atual.
- Se o galao atual diferir do ultimo historico conhecido, o sistema mostra alerta nao bloqueante.
- Se o galao estiver fora da validade padrao de 3 anos, o sistema mostra alerta nao bloqueante.
- No MVP, nao existe identificacao unica de galao nem rastreio unitario por ativo.

### Onde Mostrar

- No bloco do cliente dentro da tela de venda.
- Em contexto futuro de cliente, como “ultimo galao conhecido” e “ultimos registros”, sem depender disso para finalizar venda.

## Regras De Negocio De Venda

1. Venda finalizada deve ser transacional no backend.
2. Venda nao pode finalizar com produto inativo.
3. Venda nao pode finalizar sem estoque suficiente.
4. `sale_items` deve guardar snapshot de nome e preco do produto no momento da venda.
5. Valores financeiros devem permanecer em centavos inteiros.
6. Entrada financeira do MVP e derivada da venda concluida.
7. Cancelamento muda status para `CANCELED`, devolve estoque e cria movimentacao `CANCELED_SALE`.
8. Historico operacional nao pode ser apagado fisicamente.

## Cancelamento De Venda

### Permissao

- `ADMIN` e `OPERATOR` podem cancelar.

### Guardas Obrigatorias

- Confirmacao explicita antes de concluir.
- Motivo obrigatorio para cancelamento.
- Registro claro de quem cancelou e quando.
- Venda ja cancelada nao pode ser cancelada novamente.

### UX

- Cancelamento deve existir no historico da venda, nao no fluxo de criacao.
- Como muda estoque e caixa, a acao deve parecer sensivel e rastreavel.

## Historico De Vendas

O MVP deve ter uma tela simples de historico com:

- listagem de vendas recentes;
- status da venda;
- cliente quando houver;
- operador responsavel;
- forma de pagamento;
- valor total;
- horario;
- acao de ver detalhes;
- acao de cancelar quando permitido.

Nao precisa ter filtros avancados nesta etapa, mas deve ser preparada para evoluir para resumo diario/mensal depois.

## Arquitetura E Backend

### Backend Nest

O Nest sera responsavel por:

- validar input;
- validar sessao e permissao;
- carregar produtos ativos;
- validar estoque suficiente;
- criar venda e itens;
- baixar estoque;
- criar movimentacoes;
- derivar a entrada financeira;
- cancelar venda com devolucao de estoque.

### Web Next

O frontend sera responsavel por:

- fluxo operacional da tela;
- proxies same-origin para a API;
- mensagens claras para operador;
- validacao basica de formulario;
- exibicao de alertas de galao e divergencia.

## Estrutura Sugerida

### API

- `apps/api/src/modules/sales/sales.controller.ts`
- `apps/api/src/modules/sales/sales.service.ts`
- `apps/api/src/modules/sales/sales.repository.ts`
- `apps/api/src/modules/sales/sales.service.test.ts`
- `apps/api/src/modules/sales/sales.controller.test.ts`
- `apps/api/src/modules/sales/sales.repository.test.ts`

### Shared

- `packages/shared/src/sales.ts`
- `packages/shared/src/sales.test.ts`

### Web

- `apps/web/src/lib/sales.ts`
- `apps/web/src/app/api/sales/*`
- `apps/web/src/app/(app)/vendas/page.tsx`
- `apps/web/src/app/(app)/vendas/sales-ui.tsx`
- `apps/web/src/app/(app)/vendas/sales-ui.test.tsx`

## Dados Necessarios Alem Da Venda

Para o controle simples de galao, o modulo deve introduzir um registro operacional ligado a cliente e venda atual, em vez de modelar um ativo completo. O objetivo e historico leve e alerta, nao rastreabilidade unitizada.

Campos minimos do registro:

- `customer_id`;
- `sale_id` opcional quando nascer de venda;
- `month`;
- `year`;
- `notes`;
- `created_by`;
- `created_at`.

## Testes Necessarios

### Backend

- finaliza venda com estoque suficiente;
- rejeita venda sem estoque;
- rejeita produto inativo;
- persiste snapshots dos itens;
- cria movimentacoes de estoque;
- cria entrada financeira derivada;
- cancela venda devolvendo estoque;
- impede cancelamento duplicado.

### Frontend

- cliente opcional;
- total calculado no carrinho;
- bloqueio de finalizacao sem forma de pagamento;
- exibicao de alerta de galao vencido;
- exibicao de alerta de divergencia de galao do cliente;
- fluxo de carrinho e remocao de item;
- permissao e UX de cancelamento.

## Criterios De Aceite

- `OPERATOR` consegue registrar venda completa sem atrito excessivo.
- Estoque e baixado automaticamente ao finalizar.
- Venda cancelada devolve estoque e fica marcada no historico.
- Formas de pagamento iniciais ficam registradas corretamente.
- Cliente opcional nao bloqueia o fluxo.
- Se houver cliente, o sistema consegue mostrar o ultimo galao conhecido e alertar sobre divergencia ou validade acima de 3 anos.
- O modulo prepara os dados necessarios para fechamento de caixa e relatorio simples no proximo passo.
