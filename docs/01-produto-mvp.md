# Produto MVP

## Objetivo

Permitir que a loja registre vendas, controle estoque automaticamente e tenha uma visao simples do dinheiro que entrou e saiu no dia.

## Escopo do MVP

Entram na primeira versao:

1. Login basico.
2. Dashboard simples.
3. Produtos.
4. Clientes simples.
5. Vendas.
6. Estoque.
7. Financeiro basico.
8. Usuarios com perfis `ADMIN` e `OPERATOR`.

Ficam fora do MVP:

- Nota fiscal;
- Integracao com pagamento;
- WhatsApp;
- App mobile nativo;
- SaaS multiempresa;
- Relatorios avancados;
- Rotas de entrega avancadas;
- Contas a pagar e receber completas;
- Migracao automatica do sistema legado.

## Fluxo Principal

1. Usuario faz login.
2. Abre a tela de vendas.
3. Seleciona ou cadastra rapidamente um cliente, se necessario.
4. Adiciona produtos.
5. Informa quantidades.
6. Sistema valida estoque.
7. Sistema calcula total.
8. Usuario escolhe forma de pagamento.
9. Usuario finaliza venda.
10. Sistema registra venda, itens, movimentacao de estoque e entrada financeira.

## Telas

### Login

- Usuario ou e-mail.
- Senha.

### Dashboard

- Faturamento do dia.
- Quantidade de vendas do dia.
- Total por forma de pagamento.
- Produtos com estoque baixo.
- Ultimas vendas.
- Atalho para nova venda.

### Produtos

- Listagem.
- Criacao.
- Edicao.
- Ativar/inativar.
- Preco de venda.
- Estoque atual.
- Estoque minimo.

### Clientes

- Listagem.
- Cadastro simples.
- Edicao.
- Telefone.
- Endereco opcional.
- Observacoes opcionais.

### Vendas

- Busca de cliente.
- Busca de produto.
- Carrinho de itens.
- Quantidade por item.
- Total calculado automaticamente.
- Forma de pagamento.
- Finalizacao.
- Cancelamento controlado.

### Estoque

- Quantidade atual por produto.
- Produtos abaixo do minimo.
- Entrada manual.
- Ajuste manual com motivo.
- Historico de movimentacoes.

### Financeiro

- Entradas por venda.
- Despesas simples.
- Resumo por periodo.
- Total por forma de pagamento.

## Regras de Negocio

1. Venda finalizada deve baixar estoque automaticamente.
2. Venda nao pode ser finalizada sem estoque suficiente.
3. Produto inativo nao aparece na venda.
4. Toda alteracao de estoque gera movimentacao.
5. Cancelar venda devolve estoque.
6. Apenas `ADMIN` cadastra usuarios.
7. Apenas `ADMIN` acessa financeiro completo.
8. `OPERATOR` registra vendas e consulta produtos.
9. Estoque abaixo do minimo aparece em alerta.
10. Historico de vendas preserva preco e quantidade do momento da venda.

## Metrica de Sucesso Inicial

Depois de 2 semanas de uso real ou paralelo:

- Pelo menos 80% das vendas registradas no sistema;
- Estoque dos principais produtos batendo com o fisico;
- Usuario principal considera o sistema mais facil que o legado;
- Pelo menos um controle em papel eliminado.
