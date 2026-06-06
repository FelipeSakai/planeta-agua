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
- Preferir arquitetura por feature com `actions`, `service`, `repository`, `schemas` e `types`.
- `actions` devem tratar entrada da UI, sessao e permissao.
- `services` devem concentrar regra de negocio e transacoes.
- `repositories` devem concentrar acesso ao banco sem regra de negocio pesada.
- Regras de venda e estoque devem ficar no servidor.
- Venda e cancelamento devem usar transacao de banco.
- Nunca usar `number` decimal/float para persistir dinheiro; usar centavos inteiros.
- Preservar historico de venda mesmo se produto for editado depois.
- Nao deletar registros importantes fisicamente quando houver historico operacional.
- Priorizar telas rapidas de operar em vez de interfaces chamativas.

## Governanca De TI

Governanca aqui deve ser leve, pratica e proporcional ao MVP. O objetivo e proteger dados, manter rastreabilidade e evitar mudancas que quebrem a operacao da loja.

### Seguranca E Acesso

- Nunca commitar segredos, senhas, tokens, dumps reais ou arquivos `.env`.
- Usar `.env.example` apenas com valores ficticios ou locais.
- Login deve usar senha com hash seguro, nunca senha em texto puro.
- Cookies de sessao devem ser `httpOnly`, seguros em producao e com expiracao definida.
- Toda rota ou action interna deve validar usuario autenticado quando acessar dados operacionais.
- Permissoes devem respeitar os perfis `ADMIN` e `OPERATOR`.
- Acoes sensiveis, como cancelar venda, alterar estoque e acessar financeiro completo, devem exigir permissao explicita.

### Dados E Privacidade

- Tratar dados de clientes como informacao sensivel, especialmente telefone, endereco e historico de compras.
- Nao expor dados de cliente em logs, mensagens de erro ou payloads desnecessarios.
- Nao deletar fisicamente vendas, itens de venda, movimentacoes de estoque ou despesas com historico operacional.
- Preservar snapshots importantes, como nome e preco do produto no momento da venda.
- Valores monetarios devem ser persistidos em centavos inteiros.
- Toda movimentacao de estoque deve ter origem rastreavel, como venda, cancelamento, entrada ou ajuste manual com motivo.

### Mudancas E Versionamento

- Antes de alterar regra de venda, estoque ou financeiro, entender impacto no fluxo operacional.
- Mudancas de schema devem vir com migration do Drizzle.
- Nao editar migration ja aplicada sem decisao explicita; criar nova migration corretiva.
- Manter commits pequenos e com mensagem clara.
- Antes de push relevante, rodar no minimo `pnpm run typecheck`, `pnpm run lint` e, quando possivel, `pnpm run build`.
- Nao usar comandos destrutivos de Git sem pedido explicito do usuario.

### Banco, Backup E Operacao

- Banco local deve rodar via Docker Compose usando PostgreSQL.
- Ambientes devem ser separados por variaveis, sem misturar dados locais e producao.
- Antes de uso real em producao, definir rotina minima de backup do PostgreSQL.
- Qualquer importacao ou migracao de dados reais deve ter backup previo e plano de reversao.
- Evitar scripts que alterem estoque ou financeiro em massa sem validacao manual.

### Deploy E Ambientes

- Deploy de producao so deve acontecer com variaveis de ambiente revisadas.
- `DATABASE_URL` de producao nunca deve ser reutilizada em desenvolvimento.
- Erros de producao devem ser claros para operador, mas sem expor stack trace ou detalhes internos.
- Logs devem ajudar diagnostico sem revelar dados sensiveis.
- Se uma mudanca puder interromper venda ou estoque, priorizar deploy em horario de menor uso.

### Qualidade E Auditoria Minima

- Fluxos criticos devem ter validacao no servidor, nao apenas no frontend.
- Venda, cancelamento e ajuste de estoque devem ser testaveis e revisados com cuidado.
- Erros devem indicar acao clara para operador nao tecnico.
- Sempre que uma regra critica for alterada, registrar a decisao em documento ou commit.
- Evitar dependencias novas sem necessidade clara para o MVP.

### Limites De Escopo Governados

- Nao implementar nota fiscal, WhatsApp, pagamento integrado, multiempresa ou relatorios avancados sem decisao explicita.
- Se uma funcionalidade aumentar risco operacional ou regulatorio, perguntar antes de implementar.
- Se houver conflito entre velocidade de entrega e seguranca de dados/estoque, priorizar seguranca e confiabilidade.

## UX Do Sistema

- Tela de vendas deve exigir poucos cliques.
- Produto inativo nao deve aparecer na venda.
- Estoque baixo deve ficar visivel no dashboard e no modulo de estoque.
- Erros devem ser claros para operador nao tecnico.
- Interface deve funcionar em desktop e celular, mas o uso principal esperado e operacional interno.
- Para design de interface, consultar `intercom/DESIGN.md` antes de criar ou alterar telas.
- O design instalado e `Intercom` da colecao `awesome-design-md`, instalado via `npx getdesign@latest add intercom`.
- Usar a referencia apenas como inspiracao, sem copiar marca, logo ou identidade proprietaria.

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
- `intercom/DESIGN.md`.

## Comportamento Esperado Da IA

- Se a tarefa envolver escopo, consultar os documentos antes de implementar.
- Se houver conflito entre beleza visual e velocidade operacional, priorizar velocidade operacional.
- Se uma funcionalidade parecer fora do MVP, questionar antes de implementar.
- Sempre validar regras criticas de estoque e venda.
- Ao sugerir proximos passos, manter foco na menor entrega funcional possivel.
