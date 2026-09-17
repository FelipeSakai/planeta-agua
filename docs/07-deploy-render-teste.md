# Teste gratuito no Render

O `render.yaml` cria dois Web Services (Next.js e NestJS) e um PostgreSQL no plano gratuito.

## Passos no painel

1. Envie para o GitHub o commit que contém `render.yaml` e os ajustes de deploy.
2. Entre em [Render](https://dashboard.render.com/) com sua conta GitHub.
3. Escolha **New > Blueprint**, conecte o repositório `FelipeSakai/planeta-agua` e selecione a branch que recebeu o commit.
4. Na criação do Blueprint, preencha `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` com dados fictícios de teste e senha forte. Em `API_INTERNAL_URL`, informe `https://planeta-agua-api.onrender.com`. Não coloque a senha no GitHub.
5. Crie os serviços. Quando a API mostrar **Live**, abra `https://planeta-agua-api.onrender.com/health` e confirme `{"ok":true}`. Se o Render atribuir outro nome à API, use o endereço exibido no painel.
6. Confira a URL pública da API no painel. Se for diferente do valor informado no passo 4, abra **Environment** no serviço `planeta-agua-web`, corrija `API_INTERNAL_URL` (sem barra final), salve e faça deploy novamente do serviço web.
7. Abra a URL do serviço web e entre com o e-mail e a senha definidos no passo 4.

A API aplica as migrations e cria o administrador inicial no primeiro início. O script não altera a senha de um administrador já existente. O seed de desenvolvimento não deve ser usado no Render: ele apaga as tabelas antes de preencher dados de exemplo.

## Limites do teste

- Serviços web gratuitos hibernam após um período sem tráfego; a primeira abertura pode demorar.
- O PostgreSQL gratuito do Render expira após 30 dias. Use somente dados fictícios.
- Os dois serviços compartilham a cota mensal de horas gratuitas da conta Render.
