---
name: loja-agua-mvp
description: Use quando trabalhar no MVP de loja de agua, especialmente escopo, vendas, estoque, produtos, clientes, financeiro, arquitetura ou regras de negocio.
---

# Loja Agua MVP

Use esta skill para manter o desenvolvimento alinhado ao MVP do Planeta Agua.

## Fonte De Verdade

Leia os documentos do projeto antes de alterar escopo ou implementar modulos novos:

- `briefing-mvp-sistema-loja-agua.md`;
- `AGENTS.md`;
- `docs/01-produto-mvp.md`;
- `docs/02-stack-arquitetura.md`;
- `docs/03-roadmap.md`;
- `docs/04-modelo-dados.md`;
- `docs/05-decisoes-pendentes.md`.

## Regra Central

O MVP deve validar se a loja consegue operar melhor com o novo sistema do que com o sistema legado ou papel.

Prioridade absoluta:

1. Registrar venda corretamente.
2. Baixar estoque corretamente.
3. Mostrar resumo financeiro simples.
4. Reduzir atrito operacional.

## Evitar No MVP

- ERP completo;
- Nota fiscal;
- Integracoes complexas;
- Multiempresa;
- Relatorios complexos;
- Automacoes antes do fluxo manual funcionar bem.

## Checklist Para Funcionalidades

Antes de implementar uma funcionalidade, responder:

- Isso ajuda diretamente venda, estoque ou financeiro simples?
- Isso reduz erro ou tempo operacional?
- Isso pode ser validado em uso real rapidamente?
- Existe uma versao mais simples para o MVP?

Se a resposta for negativa, recomendar deixar para depois.
