# Redesign UI/UX Do Sistema

## Objetivo

Reformular as telas existentes do Planeta Agua para uma interface moderna, clara e operacional, mantendo desempenho leve para computadores fracos. O redesign nao deve ser apenas estetico: ele deve criar uma base reutilizavel de UX/UI para acelerar as proximas telas do MVP, especialmente vendas, estoque, produtos, dashboard e financeiro simples.

## Contexto

O sistema atual ja usa uma base clara inspirada no `intercom/DESIGN.md`, mas as telas ainda estao muito proximas de uma primeira versao funcional: muitos cards iguais, listas simples e pouca estrutura para grande volume de dados.

A tela de estoque e o ponto mais critico. Com muitos produtos cadastrados, a visualizacao atual em lista fica ruim para conferencia, operacao diaria e futuros relatorios. O redesign deve tratar estoque como uma tela de trabalho densa, com busca, filtros, ordenacao e indicadores claros.

## Principios De Design

1. **Moderno, mas facil de usar**: a interface deve parecer atual sem exigir aprendizado desnecessario.
2. **Operacional antes de bonito**: cada elemento deve ajudar venda, estoque, produto ou financeiro.
3. **Denso com clareza**: telas com muitos registros devem usar tabelas modernas, filtros e indicadores visuais, nao listas longas sem controle.
4. **Leve para PCs fracos**: evitar bibliotecas pesadas de animacao, efeitos caros, sombras complexas e renderizacao desnecessaria.
5. **Reutilizavel por padrao**: criar assets, componentes e padroes de UI como um profissional de UX/UI faria, evitando estilizar cada tela manualmente.
6. **Relatorios nascem da operacao**: estoque e financeiro devem organizar dados de forma que depois facilitem relatorios simples, sem antecipar um ERP completo.

## Anti-Referencias

O redesign deve evitar:

- ERP antigo: cinza, duro, pesado, sem hierarquia e dificil de operar.
- SaaS enfeitado: bonito demais, com animacoes e efeitos que nao ajudam a rotina.
- Planilha web crua: tabela sem contexto, alertas, filtros ou fluxo guiado.

## Sistema Visual Base

### Direcao

Usar uma linguagem de produto interno moderno: superficie clara, contraste alto, navegacao previsivel, dados bem alinhados e acento visual controlado. A referencia Intercom continua valida como inspiracao de clareza, cards brancos e tipografia limpa, mas adaptada para uma loja de agua e para telas operacionais densas.

### Tokens Reutilizaveis

Criar tokens ou classes centralizadas para:

- Cores de fundo, superficie, texto, texto secundario, borda e acento.
- Estados: sucesso, alerta, erro, informacao, estoque baixo, inativo e carregando.
- Espacamentos de pagina, secao, painel, tabela e formulario.
- Raios de borda para botao, input, painel e tabela.
- Foco visivel e estados hover/active.
- Duracao e easing de microinteracoes.

### Movimento

Animacoes devem ser sutis e leves:

- 150ms a 200ms para hover, focus, abertura de detalhes e feedback de botao.
- Preferir `transition`, `transform` e `opacity` simples em CSS.
- Respeitar `prefers-reduced-motion`.
- Nao usar animacoes de entrada orquestradas em pagina inteira.

## Assets E Componentes Reutilizaveis

O redesign deve criar uma camada de assets/componentes locais reutilizaveis em vez de repetir classes Tailwind em cada tela.

### Componentes Base

- `Button`: variantes primary, secondary, ghost e danger, com loading/disabled/focus.
- `Input`, `Textarea`, `Select`: controles consistentes para formularios.
- `Field`: label, ajuda, erro e controle de spacing.
- `Badge`: status como ativo, inativo, estoque baixo, OK, entrada, ajuste e venda.
- `Alert`: mensagens de erro, sucesso e aviso para operador.
- `PageHeader`: titulo, descricao, acoes principais e metadados.
- `MetricCard`: resumo numerico sem virar grid generico excessivo.
- `Toolbar`: busca, filtros, ordenacao e acoes de tabela.
- `DataTable`: tabela responsiva, densa e acessivel.
- `EmptyState`: estado vazio com proximo passo claro.
- `LoadingSkeleton`: carregamento leve sem spinner central desnecessario.
- `Panel` ou `Surface`: caixa de conteudo com borda e spacing padronizados.

### Padroes De UX

- Acoes principais ficam no topo direito ou na toolbar, nao espalhadas pela tela.
- Tabelas devem ter busca e filtros quando puderem crescer.
- Estados criticos devem aparecer perto do dado afetado e tambem no resumo quando necessario.
- Formularios de acoes frequentes devem ser curtos, com labels claros e feedback imediato.
- Fluxos administrativos devem evitar modal como primeira solucao; preferir painel inline, painel lateral simples ou secao expansivel.

## Tela De Estoque

### Problema Atual

A tela atual mistura resumo, dois formularios grandes, lista de produtos e historico recente. Isso funciona com poucos itens, mas fica ruim quando houver muitos produtos, porque nao ha busca, filtro, ordenacao, densidade de linha ou separacao clara entre consulta e mutacao.

### Nova Estrutura

1. **Cabecalho da pagina**
   - Titulo: Estoque.
   - Descricao curta focada em conferencia e movimentacoes.
   - Acao principal para administrador: registrar entrada ou ajuste.

2. **Faixa de resumo operacional**
   - Total de produtos.
   - Produtos com estoque baixo.
   - Unidades em estoque.
   - Ultima movimentacao.

3. **Toolbar da tabela**
   - Busca por nome do produto.
   - Filtro por status: todos, baixo, OK, inativo.
   - Ordenacao: menor estoque, maior estoque, nome, movimentacao recente.
   - Futuro ponto de extensao para exportacao ou relatorio simples.

4. **Tabela densa moderna**
   - Colunas: produto, status, estoque atual, estoque minimo, diferenca, ultima movimentacao e acoes.
   - Linha compacta em desktop.
   - Em mobile, virar lista compacta com os mesmos dados principais.
   - Destaque visual para estoque baixo sem depender apenas de cor.

5. **Acoes de estoque**
   - Administrador pode abrir uma area de acao para entrada ou ajuste.
   - Entrada e ajuste devem usar o mesmo vocabulario visual de formulario.
   - Operador visualiza, mas nao altera.

6. **Movimentacoes recentes**
   - Ficar abaixo da tabela ou em aba secundaria.
   - Ter filtro simples por produto/tipo no futuro.
   - Preparar estrutura visual para relatorios depois, sem implementar relatorios avancados agora.

## Produtos

Produtos devem seguir a mesma direcao de estoque:

- Trocar lista simples por tabela/lista densa com busca.
- Mostrar preco, estoque, minimo, status e acoes em colunas consistentes.
- Formulario deve usar componentes base e preservar regra: estoque editavel apenas na criacao; edicao usa modulo de estoque.
- Produto inativo deve ser visivel na administracao, mas bem diferenciado.

## Dashboard

Dashboard deve virar uma tela de orientacao diaria, nao apenas tres cards:

- Resumo do dia: vendas, faturamento e estoque baixo.
- Atalho forte para nova venda quando o modulo existir.
- Bloco de alertas operacionais, especialmente estoque baixo.
- Ultimas vendas quando o modulo existir.
- Visual leve, sem graficos pesados no MVP.

## Relatorios Simples E Fechamento De Caixa

Relatorios simples entram no MVP porque ajudam a fechar o caixa do dia e conferir a contabilizacao basica da loja. Isso nao deve virar modulo de BI ou relatorio avancado; deve ser uma tela operacional curta, voltada para conferencia.

### Escopo MVP

- Relatorio diario de vendas.
- Relatorio mensal de vendas.
- Total vendido por periodo.
- Quantidade de vendas por periodo.
- Total por forma de pagamento.
- Lista de vendas do periodo com status, horario, operador, forma de pagamento e valor.
- Separar vendas concluidas e canceladas para nao misturar caixa real com historico.

### Fechamento De Caixa Simples

- Tela deve ajudar o administrador a conferir o dia antes de fechar o caixa.
- Mostrar totais por dinheiro, Pix, credito, debito e outros.
- Mostrar total geral de vendas concluidas.
- Mostrar cancelamentos do periodo como informacao separada.
- Nao precisa implementar fechamento contabil formal no primeiro ciclo.
- Nao precisa bloquear edicoes ou gerar lancamento contabil automatico.

### Direcao De UI

- Usar filtros de data rapidos: hoje, ontem, este mes e periodo personalizado.
- Usar cards de resumo no topo e tabela densa abaixo.
- Permitir impressao/exportacao simples apenas depois do fluxo principal estar validado, salvo decisao explicita.
- Evitar graficos pesados no MVP; se houver visualizacao, deve ser simples e leve.

## Login

Login deve ser simples e confiavel:

- Card central limpo.
- Identidade visual do Planeta Agua sem exagero.
- Mensagens claras para erro de credencial.
- Campos e botao usando componentes base.

## Shell E Navegacao

O app shell deve parecer mais profissional e escalar com novos modulos:

- Sidebar desktop clara, com item ativo evidente.
- Header compacto com usuario, papel e logout.
- Mobile com menu simples e acessivel.
- Separar visualmente modulos principais: Dashboard, Vendas, Produtos, Estoque, Clientes, Financeiro, Usuarios.
- Nao esconder fluxos importantes em menus complexos.

## Fora Do Escopo Desta Spec

- Implementar relatorios avancados.
- Criar graficos complexos.
- Mudar regras de negocio de estoque, produto ou permissao.
- Adicionar nova biblioteca pesada de UI/animacao sem necessidade clara.
- Reescrever backend ou contratos de API.

## Criterios De Aceite

- Telas existentes usam componentes/assets reutilizaveis em vez de classes duplicadas sem padrao.
- Estoque suporta melhor muitos produtos com tabela densa, busca, filtros e ordenacao client-side.
- Operador nao tecnico entende status, erros e proximas acoes sem explicacao externa.
- Interface permanece leve, sem dependencias pesadas desnecessarias.
- Layout funciona em desktop e celular.
- Movimento e feedback visual existem, mas sao sutis e respeitam reducao de movimento.
- Regras atuais de permissao e operacao sao preservadas.
