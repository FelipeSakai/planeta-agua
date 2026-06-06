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
- `docs/05-decisoes-pendentes.md`;
- `docs/06-ambiente-desenvolvimento.md`;
- `intercom/DESIGN.md`.

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

## Direcao De Design

Para tarefas de interface, usar o `DESIGN.md` instalado em `intercom/DESIGN.md` como sistema visual principal.

Design instalado da colecao `awesome-design-md`:

- Repositorio: `https://github.com/VoltAgent/awesome-design-md`;
- Design instalado: `Intercom`, via `npx getdesign@latest add intercom`;
- Motivo: azul amigavel, interface clara, padroes conversacionais e boa adequacao para operador nao tecnico.

Regras:

- Nao copiar marca, logo ou identidade proprietaria da referencia.
- Adaptar o estilo para uma loja de agua: claro, confiavel, rapido e operacional.
- Evitar UI generica, cinza demais ou com cara de ERP antigo.
- Priorizar legibilidade, velocidade de venda e clareza de estoque.
- Usar cards, badges e CTAs claros para orientar a rotina diaria.

## Plugin E Metodologia De Trabalho Com Agentes

Plugin Superpowers instalado no `.opencode/opencode.json`:

- `https://github.com/obra/superpowers`
- pacote OpenCode: `superpowers@git+https://github.com/obra/superpowers.git`

Usar apenas como inspiracao metodologica: esclarecer objetivo, planejar pequenas entregas, verificar resultado e reduzir complexidade.

Nao instalar outros plugins, skills externas ou alterar configuracoes globais sem pedido explicito do usuario.
