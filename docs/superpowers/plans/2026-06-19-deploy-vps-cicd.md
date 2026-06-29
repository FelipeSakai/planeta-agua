# Deploy VPS com CI/CD - Backlog Futuro

Status: futuro, executar quando o MVP estiver funcionalmente fechado e antes de producao real.

## Objetivo

Preparar o Planeta Agua para deploy em VPS com pipeline minimo de CI/CD, imagens Docker e rotina operacional segura.

## Direcao Recomendada

- GitHub Actions para CI: `typecheck`, `lint`, `test` e `build`.
- Docker para `apps/web` e `apps/api`.
- GitHub Container Registry (`ghcr.io`) para publicar imagens.
- VPS unica com Docker Compose.
- PostgreSQL com volume persistente e backup automatizado.
- Caddy como reverse proxy com HTTPS automatico.

## Itens A Implementar

- `.github/workflows/ci.yml`.
- `.github/workflows/deploy.yml`.
- `apps/web/Dockerfile` e `.dockerignore`.
- `apps/api/Dockerfile` e `.dockerignore`.
- `docker-compose.prod.yml`.
- `Caddyfile`.
- Scripts de deploy e backup em `deploy/scripts/`.
- Documentacao operacional em `docs/07-deploy-producao.md`.

## Cuidados Obrigatorios

- Nunca commitar segredos, `.env`, tokens ou `DATABASE_URL` real.
- Produção e desenvolvimento devem usar bancos separados.
- Definir backup minimo do PostgreSQL antes do uso real.
- Rodar migrations com plano de reversao.
- Deploy que possa interromper venda/estoque deve ocorrer em horario de menor movimento.

## Quando Retomar

Retomar quando:

- Fluxos de produto, venda, estoque e financeiro simples estiverem validados.
- O fluxo principal tiver testes passando.
- Houver decisao sobre dominio, VPS e rotina de backup.
