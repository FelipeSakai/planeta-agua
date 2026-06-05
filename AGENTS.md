<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Instrucoes Para IA - Planeta Agua

Este projeto e um MVP de sistema web interno para loja de agua. A IA deve priorizar simplicidade, confiabilidade operacional e entrega incremental.

## Prioridade Do Produto

O nucleo do MVP e:

1. Produtos;
2. Vendas;
3. Estoque;
4. Financeiro simples.

Nao transformar o projeto em ERP completo antes de validar o fluxo principal.

## Stack Preferida

- Next.js App Router;
- TypeScript;
- Tailwind CSS;
- PostgreSQL;
- Drizzle ORM;
- Zod;
- React Hook Form quando formulario tiver complexidade real.

## Regras De Implementacao

- Manter alteracoes pequenas e objetivas.
- Antes de criar novas abstracoes, verificar se o codigo realmente precisa delas.
- Regras de venda e estoque devem ficar no servidor.
- Venda e cancelamento devem usar transacao de banco.
- Nunca usar `number` decimal/float para persistir dinheiro; usar centavos inteiros.
- Preservar historico de venda mesmo se produto for editado depois.
- Nao deletar registros importantes fisicamente quando houver historico operacional.
- Priorizar telas rapidas de operar em vez de interfaces chamativas.

## UX Do Sistema

- Tela de vendas deve exigir poucos cliques.
- Produto inativo nao deve aparecer na venda.
- Estoque baixo deve ficar visivel no dashboard e no modulo de estoque.
- Erros devem ser claros para operador nao tecnico.
- Interface deve funcionar em desktop e celular, mas o uso principal esperado e operacional interno.

## Fora Do MVP

Nao implementar sem decisao explicita:

- Nota fiscal;
- WhatsApp;
- Integracao com pagamento;
- App mobile nativo;
- Multiempresa;
- Relatorios avancados;
- Controle avancado de entrega;
- Migracao automatica do sistema legado.

## Documentos De Referencia

- `briefing-mvp-sistema-loja-agua.md`;
- `docs/01-produto-mvp.md`;
- `docs/02-stack-arquitetura.md`;
- `docs/03-roadmap.md`;
- `docs/04-modelo-dados.md`;
- `docs/05-decisoes-pendentes.md`.
- `docs/06-ambiente-desenvolvimento.md`.

## Comportamento Esperado Da IA

- Se a tarefa envolver escopo, consultar os documentos antes de implementar.
- Se houver conflito entre beleza visual e velocidade operacional, priorizar velocidade operacional.
- Se uma funcionalidade parecer fora do MVP, questionar antes de implementar.
- Sempre validar regras criticas de estoque e venda.
- Ao sugerir proximos passos, manter foco na menor entrega funcional possivel.
