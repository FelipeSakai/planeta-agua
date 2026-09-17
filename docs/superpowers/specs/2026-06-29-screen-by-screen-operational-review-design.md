# Revisao Tela Por Tela: Design E Operacao

## Objetivo

Revisar o sistema Planeta Agua tela por tela para elevar qualidade operacional e visual sem aumentar escopo do MVP. Cada tela deve ficar mais facil de usar na rotina da loja, com hierarquia clara, componentes consistentes, responsividade adequada e mensagens compreensiveis para operador nao tecnico.

## Escopo

Entram nesta revisao:

- Login.
- Dashboard.
- Vendas.
- Historico de vendas.
- Produtos.
- Clientes.
- Estoque.
- Caixa.
- Financeiro: resumo e despesas.
- Usuarios.
- Equipe, entregadores e entregas.
- Componentes compartilhados quando forem a causa de inconsistencias recorrentes.

Nao entram nesta revisao:

- Novos modulos fora do MVP.
- Nota fiscal.
- WhatsApp.
- Pagamento integrado.
- Relatorios avancados.
- Multiempresa.
- Redesenho de marca ou troca completa de design system.

## Ordem De Trabalho

1. `/vendas`.
2. `/caixa`.
3. `/estoque`.
4. `/dashboard`.
5. `/produtos`.
6. `/clientes`.
7. `/vendas/historico`.
8. `/financeiro/resumo` e `/financeiro/despesas`.
9. `/usuarios`.
10. `/equipe`, `/entregadores` e `/entregas`.
11. `/login` como passada final de acabamento, por ser importante mas menos frequente durante a operacao.

Essa ordem prioriza o fluxo principal do MVP: vender, baixar estoque, conferir caixa e entender o dia.

## Criterios Por Tela

Cada tela sera revisada contra os seguintes criterios:

- Operacao: tarefa principal visivel, poucos cliques, fluxo direto e sem acoes concorrentes com o mesmo peso visual.
- Hierarquia: uma acao primaria clara por contexto; acoes secundarias e perigosas com peso adequado.
- Consistencia: uso de `Button`, `Field`, `TextInput`, `Panel`, `Badge`, `DataTable`, `EmptyState` e demais componentes compartilhados quando aplicavel.
- Leitura: titulos, descricoes, labels e estados com texto claro para operador nao tecnico.
- Responsividade: desktop e celular sem quebra de layout, sem scroll horizontal indevido e com alvos de toque adequados.
- Estados: vazio, carregando, erro, sucesso, desabilitado e permissao negada tratados quando relevantes.
- Regras criticas: venda, estoque, caixa, financeiro e usuarios preservam validacoes no servidor e permissao adequada.
- Design system: usar a skill `impeccable` antes de alterar qualquer tela e manter alinhamento com o sistema visual do projeto.

## Fluxo De Execucao Por Tela

Para cada tela:

1. Ler a implementacao atual, testes relacionados e componentes compartilhados usados.
2. Auditar problemas operacionais e visuais em uma lista curta.
3. Aplicar a menor mudanca correta que resolva os problemas da tela.
4. Atualizar ou adicionar testes focados quando o comportamento ou texto relevante mudar.
5. Rodar verificacoes focadas da tela e, quando necessario, `typecheck` e `lint` do app web.
6. Reportar resultado antes de seguir para a proxima tela.

## Padroes Esperados

- Formularios devem usar labels visiveis, nao depender apenas de placeholder.
- Botoes devem usar variantes compartilhadas e ter texto de acao especifico.
- Acoes destrutivas ou sensiveis devem ter peso visual e texto coerentes com risco.
- Tabelas e listas devem favorecer leitura rapida e acao direta.
- Badges devem comunicar status operacional, nao decorar.
- Cards e paineis nao devem ser aninhados sem necessidade.
- Mensagens de erro devem indicar a acao esperada do operador.
- A tela deve continuar leve e rapida, sem bibliotecas visuais novas salvo necessidade explicita.

## Verificacao

As verificacoes minimas por tela sao:

- Teste focado existente ou novo para a tela alterada.
- `pnpm --dir apps/web run typecheck` quando houver alteracao TypeScript relevante.
- `pnpm --dir apps/web run lint` ao final de cada bloco de alteracoes.

Antes de finalizar um conjunto maior de telas, rodar no minimo:

- `pnpm run typecheck`.
- `pnpm run lint`.
- `pnpm run test`.
- `pnpm run build` quando for preparar push ou merge.

## Riscos E Mitigacoes

- Risco: transformar a revisao em redesign amplo demais.
  Mitigacao: alterar uma tela por vez e preservar componentes existentes quando funcionam.
- Risco: melhorar aparencia mas piorar velocidade operacional.
  Mitigacao: priorizar numero de cliques, clareza das acoes e leitura em contexto de loja.
- Risco: quebrar regras criticas de venda, estoque ou financeiro.
  Mitigacao: nao mover regra para frontend e rodar testes focados dos fluxos criticos.
- Risco: inconsistencias surgirem por ajustes pontuais.
  Mitigacao: quando uma inconsistencia se repetir, corrigir no componente compartilhado em vez de copiar classes.

## Primeiro Incremento

O primeiro incremento sera a revisao de `/vendas`, por ser a tela central do MVP. A revisao deve focar em acelerar registro de venda, deixar cliente/produtos/carrinho/pagamento mais claros, evidenciar estoque insuficiente e manter finalizacao/cancelamento com mensagens seguras.
