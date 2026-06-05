# Roadmap

## Fase 0 - Planejamento

Entregaveis:

- Escopo fechado do MVP;
- Stack definida;
- Modelo inicial de dados;
- Decisoes pendentes mapeadas;
- Instrucoes para IA criadas.

## Fase 1 - Setup Tecnico

Tarefas:

- Criar projeto Next.js;
- Configurar TypeScript;
- Configurar Tailwind;
- Configurar banco PostgreSQL;
- Configurar Drizzle;
- Criar variaveis de ambiente;
- Criar primeira migration;
- Criar seed com usuario admin.

Entregavel:

- Aplicacao rodando localmente com banco conectado.

## Fase 2 - Auth e Layout

Tarefas:

- Login;
- Logout;
- Protecao de rotas;
- Perfis `ADMIN` e `OPERATOR`;
- Layout interno com menu;
- Dashboard vazio ou com dados mockados.

Entregavel:

- Usuario autenticado acessa area interna.

## Fase 3 - Produtos e Clientes

Tarefas:

- CRUD de produtos;
- Ativar/inativar produto;
- Estoque minimo;
- CRUD simples de clientes;
- Validacoes de formulario.

Entregavel:

- Cadastros basicos prontos para venda.

## Fase 4 - Vendas e Estoque

Tarefas:

- Tela de nova venda;
- Busca de produto;
- Carrinho;
- Validacao de estoque;
- Finalizacao transacional;
- Baixa automatica de estoque;
- Historico de vendas;
- Cancelamento com devolucao de estoque.

Entregavel:

- Fluxo principal do MVP funcionando.

## Fase 5 - Financeiro e Dashboard

Tarefas:

- Resumo de vendas do dia;
- Total por forma de pagamento;
- Despesas simples;
- Entradas e saidas por periodo;
- Produtos com estoque baixo;
- Ultimas vendas.

Entregavel:

- Visao operacional diaria pronta.

## Fase 6 - Validacao Real

Tarefas:

- Cadastrar produtos reais;
- Testar vendas simuladas;
- Rodar paralelo com processo atual;
- Conferir estoque fisico x sistema;
- Ajustar tela de vendas;
- Corrigir falhas criticas.

Entregavel:

- MVP validado ou lista objetiva de ajustes obrigatorios.

## Ordem de Prioridade

1. Venda funcionando com estoque correto.
2. Produtos e estoque confiaveis.
3. Dashboard simples.
4. Financeiro basico.
5. Refinos de UX.
