# Login Operacional Compacto E Icones Funcionais

## Contexto

A tela de login atual funciona, mas usa uma composicao mais proxima de uma landing page: texto grande de apresentacao, duas colunas e tom de marketing. Para o MVP da loja, o login deve parecer uma porta de entrada operacional: rapido, claro, confiavel e consistente com o sistema interno.

O produto ainda nao possui biblioteca de icones. A decisao aprovada e introduzir icones de forma pontual e funcional, sem transformar a interface em uma tela decorativa.

## Objetivo

Redesenhar o login como uma tela operacional compacta e iniciar um vocabulario leve de icones para melhorar leitura em navegacao, acoes e estados.

Sucesso significa:

- operador entende rapidamente que esta no sistema interno da loja;
- formulario fica mais direto em desktop e celular;
- erro de login continua claro e acessivel;
- icones ajudam reconhecimento visual sem competir com texto;
- nenhuma regra de autenticacao ou sessao muda neste incremento.

## Direcao Aprovada

Usar a abordagem compacta com icones funcionais.

O login deve ter um card centralizado, sem hero grande. A tela deve comunicar acesso operacional com uma frase curta e um visual calmo. O layout deve usar os tokens atuais do produto (`--background`, `--card`, `--border`, `--foreground`, `--muted`, `--brand`) e os componentes existentes sempre que possivel.

## Layout Do Login

### Estrutura

- Fundo de tela inteira com `var(--background)`.
- Conteudo centralizado verticalmente em telas medias/grandes.
- Card principal com largura limitada, borda, raio do sistema e fundo `var(--card)`.
- Em mobile, o card deve ocupar a largura disponivel com margens confortaveis.
- Evitar duas colunas no login neste momento.

### Conteudo

- Marca: `Planeta Agua`.
- Subtitulo curto: `Acesso operacional`.
- Texto de apoio: `Entre para registrar vendas, consultar estoque e acompanhar o caixa do dia.`
- Formulario com campos `E-mail` e `Senha`.
- Botao primario full width: `Entrar`.
- Apoio discreto abaixo ou acima do formulario: `Sistema interno da loja` ou `Use sua conta de operador`.

### Estados

- Erro de credenciais continua usando `Alert` com texto claro: `E-mail ou senha invalidos.`
- Estado de envio continua usando `Button isLoading`.
- Navegacao para `/dashboard` apos sucesso permanece igual.
- Usuario ja autenticado continua redirecionando para `/dashboard`.

## Icones

### Biblioteca

Adicionar `lucide-react` ao app web.

Motivos:

- componentes React com imports nomeados;
- suporte TypeScript;
- SVG consistente e leve;
- boa compatibilidade com tree-shaking quando icones sao importados diretamente.

### Regras De Uso

- Usar icones apenas quando melhorarem reconhecimento, navegacao ou estado.
- Nao usar icones decorativos grandes no login.
- Tamanho padrao: 16px a 18px em UI operacional.
- Stroke padrao: `strokeWidth={1.75}`.
- Icones puramente visuais devem usar `aria-hidden="true"`.
- Icones nao substituem texto em navegacao principal neste incremento.
- Nao introduzir animacoes nos icones.

### Uso Inicial

Neste incremento, usar icones de forma limitada:

- login: um icone pequeno no cabecalho do card para reforcar acesso seguro/operacional, sem substituir texto;
- app shell/navegacao: adicionar icones discretos aos itens principais da navegacao, mantendo todos os labels textuais;
- acoes/status futuros: seguir o mesmo padrao, mas ficam fora deste incremento.

## Componentes E Arquivos Esperados

- `apps/web/package.json`: adicionar `lucide-react`.
- `apps/web/src/app/(auth)/login/page.tsx`: ajustar estrutura e copy do login.
- `apps/web/src/app/(auth)/login/login-form.tsx`: ajustar cabecalho interno, espacamento e icone pequeno.
- `apps/web/src/app/(auth)/login/login-ui.test.ts`: atualizar expectativas de copy e estrutura.
- `apps/web/src/components/layout/app-shell.tsx`: adicionar icones discretos na navegacao principal sem remover labels.

Nao criar um sistema amplo de icones agora. Se for necessario padronizar props, criar no maximo uma constante ou helper local simples; evitar abstracao global antes de haver uso real em varias telas.

## Acessibilidade

- Manter labels reais para `E-mail` e `Senha`.
- Preservar foco visivel existente.
- Garantir contraste WCAG AA para textos sobre card e fundo.
- Manter `Alert` com `role="alert"` via componente existente.
- Icones nao devem ser o unico indicador de estado.

## Testes

Atualizar testes para cobrir:

- usuario autenticado ainda redireciona para `/dashboard`;
- login de visitante renderiza `Planeta Agua`, `Acesso operacional` e copy operacional;
- formulario ainda tem campos `email` e `password`;
- erro e estado pendente continuam funcionando;
- se houver icone no login, ele nao deve substituir texto essencial.

Verificacoes esperadas apos implementacao:

- `pnpm --dir apps/web run typecheck`
- `pnpm --dir apps/web run lint`
- `pnpm --dir apps/web run test`

## Fora Do Escopo

- Alterar autenticacao, cookies, sessao ou permissoes.
- Criar recuperacao de senha.
- Criar identidade visual nova ou logo.
- Espalhar icones em todas as telas de uma vez.
- Adicionar animacoes, ilustracoes ou efeitos decorativos.
