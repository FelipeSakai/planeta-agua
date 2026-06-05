# Planeta Agua

Sistema web interno para gestao operacional de uma loja de agua.

O MVP deve resolver primeiro o nucleo da operacao:

- Produtos;
- Vendas;
- Estoque;
- Resumo financeiro simples.

O objetivo nao e criar um ERP completo no inicio. A primeira versao precisa ser pequena, rapida de usar e validavel na rotina real da loja.

## Documentos Principais

- `briefing-mvp-sistema-loja-agua.md`: briefing original do projeto.
- `docs/01-produto-mvp.md`: escopo funcional do MVP.
- `docs/02-stack-arquitetura.md`: stack recomendada e arquitetura inicial.
- `docs/03-roadmap.md`: fases de execucao.
- `docs/04-modelo-dados.md`: modelo inicial de banco.
- `docs/05-decisoes-pendentes.md`: perguntas que precisam de resposta antes ou durante o desenvolvimento.
- `docs/06-ambiente-desenvolvimento.md`: setup local com pnpm, Docker e Drizzle.
- `AGENTS.md`: instrucoes permanentes para IA trabalhar neste projeto.

## Direcao Inicial

Stack recomendada para comecar:

- Next.js App Router;
- TypeScript;
- Tailwind CSS;
- PostgreSQL;
- Drizzle ORM;
- Zod;
- pnpm;
- Docker para PostgreSQL local;
- Auth.js ou auth propria simples com cookie seguro;
- Deploy inicial em Render/Railway/Vercel + Neon/Supabase.

## Desenvolvimento Local

```bash
pnpm install
docker compose up -d
pnpm dev
```

## Regra de Produto

Sempre priorizar velocidade operacional e confiabilidade de estoque sobre telas bonitas ou funcionalidades avancadas.
