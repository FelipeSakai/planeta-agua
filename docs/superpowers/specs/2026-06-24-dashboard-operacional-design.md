# Design: Dashboard Operacional e Navegacao de Equipe

## Data

2026-06-24

## Status

Aprovado para planejamento.

## 1. Objetivo

Transformar o dashboard em uma mesa de trabalho para o operador abrir de manha e usar durante o dia. O foco principal deve ser iniciar uma venda rapidamente, sem rolar a pagina. Informacoes de apoio devem destacar pendencias reais: entregas, caixa e estoque critico.

Tambem ajustar a navegacao para reduzir ruido: entregadores nao devem aparecer como modulo principal separado. Eles devem ficar dentro de uma area de equipe/usuarios.

## 2. Problemas Atuais

- O dashboard esta confuso a olho nu, com muitos blocos parecidos.
- Os atalhos operacionais ficam no fim da tela, exigindo rolagem.
- O foco visual nao deixa claro qual acao o operador deve tomar primeiro.
- `Entregadores` como item separado no menu aumenta a sensacao de sistema inchado.
- Recibo/impressao pode nao estar mostrando produtos, o que precisa ser tratado como bug operacional.

## 3. Direcao Aprovada

O dashboard deve priorizar **Nova venda** como acao dominante.

Hierarquia desejada:

1. Nova venda como CTA principal grande.
2. Pendencias do dia visiveis sem rolagem.
3. Caixa de hoje com status simples.
4. Estoque critico como alerta operacional.
5. Ultimas vendas e pagamento como informacao secundaria.

## 4. Novo Layout do Dashboard

### Topo

- Saudacao simples: `Bom dia, {nome}` quando houver nome do usuario; fallback `Resumo do dia`.
- CTA principal grande: `Nova venda`.
- Acoes secundarias proximas, menores:
  - `Ver entregas`;
  - `Caixa`;
  - `Produtos`.

### Primeira Dobra

Sem rolar, o operador deve ver:

- Card grande de `Nova venda`.
- Card de `Entregas pendentes` com quantidade e link direto.
- Card de `Caixa de hoje` com status, vendas, despesas e saldo esperado.
- Card de `Estoque critico` com quantidade de produtos abaixo do minimo.

### Abaixo da Primeira Dobra

- `Ultimas vendas` em formato compacto.
- `Resumo por pagamento` mais legivel.
- Usar barras simples em CSS para distribuicao por forma de pagamento quando houver vendas no dia.
- Nao adicionar biblioteca de grafico nesta etapa.

## 5. Equipe, Usuarios e Entregadores

### Decisao

Remover `Entregadores` do menu principal.

Preferencia de design: criar uma area `Equipe` no menu, com abas internas:

- `Usuarios`;
- `Entregadores`.

Motivo: entregador nao precisa ser usuario de login agora, mas faz parte da equipe operacional. Isso reduz ruido sem misturar conceitos no banco ou nas permissoes.

### Permissoes

- `Usuarios`: manter restrito a `ADMIN`.
- `Entregadores`: manter acessivel para `ADMIN` e `OPERATOR`, porque o operador pode precisar ajustar entregador durante a rotina.

## 6. Recibo e Impressao

Tratar como bug prioritario nesta etapa.

Comportamento esperado:

- Todo recibo deve mostrar produtos sempre.
- Validar nos tres pontos:
  - banner apos venda;
  - historico;
  - entregas.
- Se a venda tiver entrega, mostrar tambem endereco, telefone, entregador e status.

Investigacao necessaria antes da correcao:

- Confirmar se `sale.items` chega preenchido no detalhe da venda.
- Confirmar se `PrintRecibo` renderiza as linhas da tabela.
- Confirmar se o CSS de impressao nao esta escondendo `table`, `tbody` ou `tr`.
- Confirmar se o botao de impressao esta sendo acionado antes do detalhe da venda carregar.

## 7. Fora do Escopo

- Relatorios avancados.
- Graficos complexos.
- Biblioteca pesada de chart sem necessidade clara.
- Transformar entregador em usuario/login.
- Tela mobile exclusiva de entregador.
- Mudancas de banco para unificar usuario e entregador.

## 8. Criterios de Sucesso

- Operador consegue clicar em `Nova venda` sem rolar.
- Pendencias de entrega aparecem na primeira dobra.
- Status do caixa fica claro sem abrir outra tela.
- Estoque critico aparece como alerta, nao como bloco perdido.
- Menu lateral fica mais limpo sem `Entregadores` solto.
- Recibo impresso mostra todos os produtos.

## 9. Observacoes de Implementacao

- Reusar componentes existentes: `PageHeader`, `Panel`, `MetricCard`, `Button`, `Badge`, `EmptyState`.
- Se precisar criar novo componente, preferir um componente pequeno para o card principal do dashboard.
- Manter o dashboard rapido e leve; usar CSS simples para barras se necessario.
- Atualizar testes de dashboard, navegacao e recibo.
