# Dashboard Theme Design

## Objetivo

Corrigir a hierarquia visual e as cores do dashboard e adicionar modo noturno manual para o sistema interno do Planeta Agua.

O foco e operacional: leitura rapida, contraste forte, poucos cliques e comportamento consistente entre claro e escuro.

## Escopo

Entram nesta entrega:

- Tema claro e escuro global com escolha manual do operador.
- Persistencia da escolha de tema no navegador.
- Botao de alternancia no layout autenticado.
- Ajuste dos tokens globais de cor para suportar os dois temas.
- Remocao de usos visuais rigidos como `bg-white` em componentes base quando quebrarem tema.
- Polimento do dashboard usando tokens, nao cores soltas.
- Testes de regressao para tema, dashboard e componentes afetados.

Ficam fora desta entrega:

- Redesign completo de todas as telas.
- Preferencia por usuario no banco.
- Modo automatico por sistema operacional.
- Bibliotecas de tema ou grafico.

## Decisoes

- O modo noturno sera manual, escolhido pelo operador.
- A preferencia sera persistida localmente no navegador, sem mudar schema de banco.
- O tema deve ser aplicado no nivel do documento ou shell para que tokens CSS funcionem em todas as telas.
- O dashboard deve continuar sendo a mesa de trabalho do dia.
- O CTA principal de venda continua dominante no topo.

## Tema Claro

- Fundo geral: azul muito claro, sem branco puro como canvas principal.
- Cards: superficie clara com borda suave.
- Texto: azul/carvao escuro.
- Muted: azul acinzentado com contraste AA.
- Accent: azul operacional para acao primaria, estado ativo e barras simples.

## Tema Escuro

- Fundo geral: azul-petroleo quase preto.
- Cards: azul-grafite, distintos do fundo.
- Bordas: azul acinzentado escuro, visivel sem brilho excessivo.
- Texto: quase branco com bom contraste.
- Muted: azul claro acinzentado, ainda legivel.
- Accent: ciano/azul claro para manter identificacao de acao sem saturar a tela.

## Dashboard

O dashboard deve evitar o problema atual de texto branco sobre card branco e nao deve depender de `--foreground` como fundo bruto.

Estrutura visual:

- Bloco principal no topo com superficie de destaque propria.
- CTA `Comecar venda` claro e dominante.
- Acoes secundarias no mesmo bloco, com menor peso visual.
- Pendencias agora em card legivel nos dois temas.
- Metric cards com tonos semanticos consistentes.
- Listas e barras de pagamento usando tokens globais.

## Componentes Base

Componentes compartilhados devem usar tokens:

- `Panel`: `--card`, `--border`; deve permitir fundo customizado sem conflito.
- App shell: sidebar, header e menu mobile devem usar tokens de superficie, nunca `bg-white` fixo.
- Itens ativos/inativos da navegacao devem funcionar nos dois temas.
- Botao de tema deve usar o vocabulario existente de botoes.

## Persistencia Do Tema

Comportamento esperado:

- Sem preferencia salva, iniciar em tema claro.
- Ao clicar no toggle, alternar entre claro e escuro.
- A escolha deve persistir entre reloads.
- O estado visual do botao deve indicar a acao ou tema atual com texto simples para operador.

## Acessibilidade

- Texto normal deve manter contraste AA.
- Foco visivel deve funcionar nos dois temas.
- O toggle precisa ser um botao real, com texto compreensivel.
- O dashboard nao deve depender apenas de cor para estados criticos; textos como `Pendente`, `Aberto`, `Estoque critico` continuam visiveis.

## Testes

Testes esperados:

- Tokens claros e escuros existem no CSS global.
- `Panel` nao injeta fundo branco quando recebe fundo customizado.
- Shell renderiza controle de tema.
- Dashboard renderiza sem classes conflitantes que recriem texto invisivel no hero.
- Testes focados de dashboard e componentes base passam.

## Criterios De Aceite

- Dashboard fica legivel no tema claro.
- Dashboard fica legivel no tema escuro.
- Usuario consegue alternar manualmente claro/escuro.
- Escolha persiste ao recarregar a pagina.
- Nenhuma regra de venda, estoque, entrega ou financeiro e alterada.
- `pnpm run typecheck`, `pnpm run lint` e testes focados passam.
