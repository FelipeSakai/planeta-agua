# Auth E Layout Interno - Design

## Objetivo

Implementar a base de autenticacao e navegacao interna do Planeta Agua para que as proximas funcionalidades operacionais sejam construidas com usuario autenticado, permissao clara e layout consistente.

Esta entrega cobre login, logout, sessao no banco, seed do usuario administrador, protecao de rotas internas e layout base autenticado.

## Decisoes Aprovadas

- Autenticacao propria simples.
- Sessao persistida no banco com token opaco em cookie `httpOnly`.
- Duracao da sessao: 8 horas.
- Usuario `ADMIN` inicial criado por seed via variaveis de ambiente.
- Layout interno com sidebar fixa no desktop e topo simples no mobile.
- UI guiada por `intercom/DESIGN.md`, sem copiar marca, logo ou identidade proprietaria.

## Escopo

### Inclui

- Tabela `sessions` no schema Drizzle.
- Migration para `sessions`.
- Variaveis de ambiente para seed admin:
  - `ADMIN_NAME`;
  - `ADMIN_EMAIL`;
  - `ADMIN_PASSWORD`.
- Script de seed para criar ou atualizar o admin inicial.
- Tela de login em `src/app/(auth)/login/page.tsx`.
- Server action para login.
- Server action ou rota para logout.
- Cookie de sessao seguro.
- Helpers de auth e permissao.
- Protecao das rotas internas.
- Grupo de rotas autenticadas em `src/app/(app)/`.
- Layout interno com menu principal.
- Dashboard inicial protegido.

### Nao Inclui

- Cadastro completo de usuarios pela interface.
- Recuperacao de senha.
- MFA.
- Login social.
- Refresh token com JWT.
- Auditoria completa de acesso.
- Tela de gerenciamento de sessoes.

Esses itens ficam fora para manter o MVP simples.

## Arquitetura

Estrutura prevista:

```text
src/
  app/
    (auth)/
      login/
        page.tsx
    (app)/
      layout.tsx
      dashboard/
        page.tsx

  features/
    auth/
      auth.actions.ts
      auth.repository.ts
      auth.schemas.ts
      auth.service.ts
      auth.types.ts

  lib/
    auth.ts
    password.ts
    permissions.ts
    session.ts

  db/
    schema.ts
    migrations/

scripts/
  seed-admin.ts
```

Responsabilidades:

- `auth.actions.ts`: entrada da UI, validacao com Zod, redirecionamentos e cookies.
- `auth.service.ts`: regra de login, criacao de sessao, validacao de usuario ativo e logout.
- `auth.repository.ts`: acesso ao banco para usuarios e sessoes.
- `auth.schemas.ts`: schemas de login e seed.
- `lib/password.ts`: hash e comparacao de senha.
- `lib/session.ts`: criacao de token, hash de token, leitura/escrita de cookie e expiracao.
- `lib/auth.ts`: helpers `getCurrentUser`, `requireUser` e `requireRole`.
- `lib/permissions.ts`: regras simples para `ADMIN` e `OPERATOR`.

## Modelo De Dados

Adicionar tabela `sessions`:

```text
sessions
  id uuid primary key
  user_id uuid not null references users.id
  token_hash text not null unique
  expires_at timestamp with timezone not null
  created_at timestamp with timezone not null
```

O cookie nunca deve guardar o hash nem dados do usuario. Ele guarda apenas o token aleatorio opaco.

## Fluxo De Login

```text
loginAction(input)
  -> loginSchema.parse(input)
  -> authService.login(email, password)
      -> buscar usuario ativo por email
      -> comparar senha com bcryptjs
      -> gerar token opaco aleatorio
      -> salvar hash do token em sessions com expiresAt = agora + 8h
  -> gravar cookie httpOnly
  -> redirect('/dashboard')
```

Erros devem ser claros e seguros:

- Mensagem para email/senha invalidos: `E-mail ou senha invalidos.`
- Nao revelar se o email existe.
- Nao logar senha, token ou dados sensiveis.

## Fluxo De Logout

```text
logoutAction()
  -> ler token do cookie
  -> remover sessao correspondente no banco, se existir
  -> limpar cookie
  -> redirect('/login')
```

## Protecao De Rotas

Rotas internas ficam sob `src/app/(app)/`.

O layout autenticado deve chamar `requireUser()` antes de renderizar.

```text
(app)/layout.tsx
  -> requireUser()
  -> se invalido, redirect('/login')
  -> renderiza AppShell
```

Actions operacionais futuras tambem devem chamar `requireUser()` ou `requireRole()` diretamente. Nao confiar apenas na protecao visual da rota.

## Cookie De Sessao

Nome sugerido: `planeta_agua_session`.

Configuracao:

- `httpOnly: true`;
- `sameSite: 'lax'`;
- `secure: true` em producao;
- `path: '/'`;
- `expires` alinhado com `sessions.expires_at`;
- duracao de 8 horas.

## Seed Admin

O seed deve usar:

- `ADMIN_NAME`;
- `ADMIN_EMAIL`;
- `ADMIN_PASSWORD`.

Comportamento:

- Se nao existir usuario com `ADMIN_EMAIL`, criar `ADMIN` ativo.
- Se existir, atualizar nome, senha e garantir role `ADMIN` e `is_active = true`.
- Nunca gravar senha em texto puro.
- Nao usar senha padrao fixa no codigo.

Adicionar script no `package.json`:

```text
db:seed
```

## Permissoes

Perfis iniciais:

- `ADMIN`: acesso completo ao MVP.
- `OPERATOR`: acesso operacional limitado.

Helpers previstos:

```text
requireUser()
requireRole(['ADMIN'])
canAccessFinance(user)
canManageStock(user)
canCancelSale(user)
```

Regras iniciais:

- Apenas `ADMIN` acessa usuarios.
- Apenas `ADMIN` acessa financeiro completo.
- Apenas `ADMIN` altera estoque manualmente.
- Apenas `ADMIN` cancela venda.
- `OPERATOR` registra vendas e consulta produtos/clientes.

## Layout Interno

### Desktop

Sidebar fixa com:

- Dashboard;
- Vendas;
- Produtos;
- Clientes;
- Estoque;
- Financeiro;
- Usuarios, visivel apenas para `ADMIN`.

Topo do conteudo:

- Nome da tela;
- Usuario logado;
- Acao de logout.

### Mobile

Topo simples com:

- Nome `Planeta Agua`;
- Botao de menu;
- Logout acessivel.

O menu pode ser simples no MVP. Nao precisa de animacao sofisticada.

## Direcao Visual

Usar `intercom/DESIGN.md` como guia:

- fundo creme claro;
- cards brancos;
- bordas sutis;
- tipografia limpa;
- botoes com cantos moderados;
- evitar sombras pesadas;
- priorizar legibilidade e operacao rapida.

Adaptacao para Planeta Agua:

- manter visual claro e confiavel;
- usar acentos azuis com moderacao quando fizer sentido para a marca;
- nao usar elementos proprietarios da Intercom.

## Tratamento De Erros

- Login invalido mostra mensagem unica e segura.
- Usuario inativo nao consegue logar.
- Sessao expirada redireciona para `/login`.
- Actions futuras devem retornar erros claros para operador nao tecnico.
- Erros internos nao devem expor stack trace nem detalhes de banco.

## Testes E Verificacao

Verificacoes minimas da entrega:

- `pnpm run typecheck`.
- `pnpm run lint`.
- `pnpm run build`.
- `pnpm db:generate` para criar migration.
- `pnpm db:migrate` com PostgreSQL local rodando.
- `pnpm db:seed` cria o admin inicial.
- Login com admin redireciona para dashboard.
- Logout limpa sessao e volta para login.
- Acesso direto a `/dashboard` sem sessao redireciona para login.

## Riscos E Mitigacoes

- Risco: senha ou token vazarem em logs.
  Mitigacao: nao logar payload sensivel e manter cookie/token opaco.
- Risco: action futura esquecer validacao de usuario.
  Mitigacao: usar `requireUser()` e `requireRole()` como padrao nas actions.
- Risco: criar complexidade excessiva de auth.
  Mitigacao: evitar JWT, refresh token separado, MFA e telas avancadas agora.
- Risco: seed sobrescrever admin real sem querer.
  Mitigacao: seed usa somente `ADMIN_EMAIL` configurado no ambiente e deve ser executado conscientemente.

## Criterio De Aceite

A entrega esta pronta quando um usuario admin criado por seed consegue acessar a area interna, rotas internas exigem sessao valida, logout invalida a sessao no banco e o layout autenticado esta pronto para receber os modulos do MVP.
