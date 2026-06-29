# Design: Usuarios Operadores

## Status

Aprovado para planejamento.

## Objetivo

Implementar o cadastro minimo de usuarios do sistema para que o administrador consiga criar e manter contas de operadores. Operador e a pessoa que faz login para registrar vendas e consultar rotinas permitidas. Entregador continua sendo um cadastro separado, sem login, dentro da area de equipe/entregadores.

## Escopo Do MVP

Entram nesta entrega:

- Listar usuarios operadores.
- Criar operador com nome, e-mail e senha inicial.
- Editar nome e e-mail de operador.
- Ativar e inativar operador.
- Redefinir senha de operador.
- Restringir todas as acoes a `ADMIN`.

Ficam fora desta entrega:

- Criar mais de um administrador.
- Alterar o administrador principal pela tela.
- Transformar entregador em usuario do sistema.
- Permissoes customizadas alem de `ADMIN` e `OPERATOR`.
- Auditoria detalhada de alteracoes de usuario.

## Regras De Negocio

- O sistema tera apenas um administrador principal para o MVP.
- A tela `/usuarios` gerencia somente usuarios com papel `OPERATOR`.
- Nenhuma rota de usuarios deve permitir criar, editar, inativar ou redefinir senha de um usuario `ADMIN`.
- Apenas usuario autenticado com papel `ADMIN` pode acessar e executar acoes de usuarios.
- Operador inativo nao pode fazer login.
- Senhas devem ser persistidas somente como hash seguro, nunca em texto puro.
- Usuario nao deve ser deletado fisicamente; inativar e o caminho operacional.
- E-mail de usuario deve ser unico.

## Backend

Criar modulo `users` em `apps/api/src/modules/users` seguindo o padrao do projeto:

- `users.controller.ts`: entrada HTTP, sessao e permissao.
- `users.service.ts`: regras de negocio e validacoes de papel.
- `users.repository.ts`: acesso ao banco.
- `users.schemas.ts`: schemas Zod para entrada.
- `users.errors.ts`: erros de dominio quando necessario.
- testes unitarios para controller/service/repository.

Endpoints propostos:

- `GET /users`: lista operadores, incluindo ativos e inativos.
- `POST /users`: cria operador.
- `PATCH /users/:id`: atualiza nome/e-mail de operador.
- `POST /users/:id/toggle-active`: ativa ou inativa operador.
- `POST /users/:id/reset-password`: redefine senha de operador.

Payloads devem ser simples:

- Criar: `name`, `email`, `password`.
- Atualizar: `name`, `email`.
- Redefinir senha: `password`.

Todas as respostas devem omitir `password_hash`.

## Frontend

Substituir o placeholder de `/usuarios` por uma tela operacional simples:

- Cabecalho: `Usuarios` com descricao indicando que sao operadores do sistema.
- Card de criacao de operador com nome, e-mail e senha.
- Lista/tabela de operadores com nome, e-mail, status e data de criacao.
- Acoes por operador: editar, ativar/inativar e redefinir senha.
- Mensagens claras para erro de e-mail duplicado, senha curta e permissao negada.

A tela deve continuar acessivel apenas para `ADMIN`; `OPERATOR` deve ser redirecionado para `/dashboard` como hoje.

## Data Flow

1. Admin abre `/usuarios`.
2. Server component valida `requireRole(["ADMIN"])`.
3. Web busca operadores via API usando o cookie de sessao.
4. Admin cria/edita/inativa/redefine senha via rotas internas do Next.
5. Rotas internas repassam a requisicao para a API Nest com cookie de sessao.
6. API valida usuario atual, exige `ADMIN`, aplica regra de operador e persiste no banco.
7. Web revalida ou recarrega dados da tela.

## Erros E Mensagens

- Credenciais ou permissao invalida: mensagem generica sem detalhe sensivel.
- E-mail duplicado: `Ja existe um usuario com este e-mail.`
- Operador nao encontrado: `Usuario nao encontrado.`
- Tentativa de alterar admin: `Administrador principal nao pode ser alterado nesta tela.`
- Senha invalida: `Informe uma senha com pelo menos 8 caracteres.`

## Testes

Backend:

- Admin lista apenas operadores.
- Admin cria operador com senha hash.
- Criacao rejeita e-mail duplicado.
- Criacao nunca aceita role `ADMIN` no payload.
- Atualizacao, inativacao e reset de senha rejeitam usuario `ADMIN`.
- Operador autenticado nao consegue acessar endpoints de usuarios.

Frontend:

- Tela renderiza formulario e lista de operadores.
- Tela mostra status ativo/inativo.
- Acoes de criar, editar, ativar/inativar e resetar senha chamam rotas corretas.
- Placeholder antigo deixa de aparecer.

## Criterios De Sucesso

- Admin consegue criar um operador e esse operador consegue fazer login.
- Admin consegue inativar operador e esse operador deixa de conseguir login.
- Admin consegue redefinir senha de operador.
- Nenhuma acao permite criar ou alterar outro admin.
- Entregadores continuam independentes de usuarios.
