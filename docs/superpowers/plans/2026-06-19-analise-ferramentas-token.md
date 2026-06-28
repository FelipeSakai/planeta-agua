# Analise de Ferramentas para Reducao de Token - Plano Estrategico

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Avaliar tres ferramentas (Headroom, codebase-memory-mcp, OpenSpec) para reduzir consumo de tokens e melhorar a eficiencia do desenvolvimento com IA, e definir quais adotar no projeto.

**Architecture:** Analise de custo-beneficio de cada ferramenta contra o contexto do projeto (monorepo Turborepo NestJS + Next.js, OpenCode como agent, pnpm, Windows, MVP de loja de agua). Recomendacao + plano de teste para cada uma.

---

## Contexto do Problema

O usuario reportou alto consumo de tokens durante o desenvolvimento. Analisando o setup atual:

### Fontes de consumo de token no projeto atual

1. **Instrucoes auto-carregadas** (`.opencode/opencode.json`): 8 arquivos carregados em toda mensagem:
   - `AGENTS.md` (~7KB)
   - `docs/01-produto-mvp.md` (~3KB)
   - `docs/02-stack-arquitetura.md` (~4KB)
   - `docs/03-roadmap.md` (~2KB)
   - `docs/04-modelo-dados.md` (~2KB)
   - `docs/05-decisoes-pendentes.md` (~1KB)
   - `docs/06-ambiente-desenvolvimento.md` (~1KB)
   - `intercom/DESIGN.md` (~9KB)
   - Total: ~29KB de instrucoes em **cada mensagem**.

2. **Skills do Superpowers**: `using-superpowers` e skills invocadas injetam conteudo na conversa. Cada skill pode ser 2-10KB.

3. **Saida de ferramentas**: `read` de arquivos, `grep`/`glob` results, `bash` output - especialmente arquivos grandes como `pnpm-lock.yaml` (254KB) ou `tsconfig.tsbuildinfo` (267KB).

4. **Re-leitura de arquivos**: sem cache estruturado, o agent re-le os mesmos arquivos multiplas vezes para entender dependencias.

### Diagnostico preliminar
- O maior ofensor provavelmente sao as **instrucoes auto-carregadas** (29KB em cada turno) e **re-leitura de arquivos**, nao a saida de ferramentas.
- Para um monorepo com 4 modulos API + paginas web, a exploracao de codigo via grep/read successive e cara.
- As ferramentas analisadas abaixo atacam problemas diferentes:
  - **Headroom**: comprime o que vai para o LLM (input + output).
  - **codebase-memory-mcp**: substitui grep/read por queries em grafo de conhecimento (menos tokens para explorar codigo).
  - **OpenSpec**: reduz retrabalho e ambiguidade com specs persistentes (menos iteracoes desnecessarias).

---

## Ferramenta 1: Headroom (chopratejas/headroom)

### O que e
Camada de compressao de contexto para AI agents. Comprime tool outputs, logs, RAG chunks, arquivos e historico de conversa **antes** de chegar ao LLM. 60-95% menos tokens, mesmas respostas.

### Custos
- **Licenca:** Apache 2.0 (gratuito, open source).
- **Runtime:** nenhum custo de API; roda localmente.
- **Dependencias:** Python 3.10+, Rust toolchain (para build nativo), ONNX Runtime, modelo HuggingFace (kompress-v2-base, baixado uma vez).

### Como funciona
- **Modo proxy:** `headroom proxy --port 8787` - intercepta trafego LLM, comprime, reenvia. Zero mudanca de codigo.
- **Modo wrap:** `headroom wrap claude|codex|cursor|aider|copilot` - envolve um agent.
- **Modo library:** `compress(messages)` inline em Python ou TypeScript.
- **MCP server:** ferramentas `headroom_compress`, `headroom_retrieve`, `headroom_stats`.
- **Reversivel (CCR):** originais ficam em cache local; LLM pode recuperar sob demanda.
- **Output token reduction:** corta preambulos e re-impressao de codigo no output do modelo.
- **`headroom learn`:** mina sessoes com falha e escreve correcoes em `CLAUDE.md`/`AGENTS.md`.

### Compatibilidade com nosso setup
- **OpenCode:** NAO listado explicitamente na matriz de compatibilidade (lista Claude Code, Codex, Cursor, Aider, Copilot CLI, OpenClaw).
- Porem: "Any OpenAI-compatible client works via `headroom proxy`" - OpenCode fala com modelos via API OpenAI-compatible, **teoricamente funciona via proxy**.
- **Windows:** suportado mas com ressalvas - build Rust no Windows pode ter friccao; recomenda-se pre-built wheel.
- **Nao interfere no codigo do projeto:** e uma ferramenta de dev, nao runtime.

### Analise de fit para o projeto

| Criterio | Avaliacao |
|---|---|
| Reduz tokens? | Sim, 60-95% (claim, precisa validar) |
| Custo? | Gratuito |
| Friccao de setup? | Media-alta: Python + Rust + ONNX + modelo HF no Windows |
| Compativel com OpenCode? | Indireto via proxy; nao testado oficialmente |
| Risco de perda de informacao? | Baixo (reversivel via CCR) |
| Beneficio para MVP de loja? | Medio - comprime saida de ferramentas mas nao resolve o ofensor principal (instrucoes auto-carregadas) |
| Alinhamento com AGENTS.md? | Tensao com "Evitar dependencias novas sem necessidade clara" - mas e dev tool, nao runtime dep |

### Recomendacao: TESTAR COM CUIDADO (priority: medium)
- **Nao instalar agora.** Friccao de setup no Windows + compatibilidade nao oficial com OpenCode.
- Se testar: usar modo proxy, nao modo wrap. Configurar OpenCode para apontar para o proxy local.
- Validar: rodar uma tarefa tipica (ex: adicionar campo em produto) com e sem Headroom, comparar token usage.
- Se funcionar bem e reduzir >40% de tokens sem perda de qualidade, adotar.

### Plano de teste (se decidir testar)
- [ ] Instalar Python 3.10+ e Rust no Windows (se nao tiver).
- [ ] `pip install "headroom-ai[all]"` ou `pip install --only-binary headroom-ai headroom-ai`.
- [ ] `headroom proxy --port 8787`.
- [ ] Configurar OpenCode para usar `http://localhost:8787` como endpoint do modelo.
- [ ] Rodar tarefa de referencia (ex: "adicionar campo SKU em products") e medir tokens.
- [ ] Comparar com a mesma tarefa sem proxy.
- [ ] Avaliar se respostas mantem qualidade (especialmente em regras de venda/estoque).

---

## Ferramenta 2: codebase-memory-mcp (DeusData/codebase-memory-mcp)

### O que e
Servidor MCP de inteligencia de codigo. Indexa o codebase em um grafo de conhecimento persistente (funcoes, classes, cadeias de chamada, rotas HTTP, dependencias). Queries em <1ms. 99% menos tokens para exploracao de codigo.

### Custos
- **Licenca:** MIT (gratuito, open source).
- **Runtime:** nenhum custo de API; roda localmente.
- **Dependencias:** NENHUMA. Single static binary. Sem Python, sem Docker, sem Node, sem API keys.
- **Tamanho:** download unico do binario (~10-20MB).

### Como funciona
- Indexa com tree-sitter (158 linguagens) + Hybrid LSP (resolucao de tipos sem language server).
- Grafo persistente em SQLite (~/.cache/codebase-memory-mcp/).
- 14 ferramentas MCP: `search_graph`, `trace_path`, `get_architecture`, `query_graph` (Cypher), `detect_changes`, `manage_adr`, etc.
- Auto-sync: watcher detecta mudancas no git e re-indexa incrementalmente.
- Team-shared graph artifact: `.codebase-memory/graph.db.zst` commitavel no repo.
- `headroom learn`-equivalent: nao tem, mas tem ADR management para persistir decisoes arquiteturais.

### Compatibilidade com nosso setup
- **OpenCode:** SIM, listado explicitamente! `install` auto-detecta e configura `opencode.json` + `AGENTS.md`.
- **TypeScript/JavaScript:** suportado com Hybrid LSP completo (nossa stack principal).
- **Windows:** binario `codebase-memory-mcp-windows-amd64.zip` disponivel. SmartScreen pode avisar (clique "More info" > "Run anyway").
- **Seguranca:** binarios assinados, SLSA Level 3, VirusTotal scanado, 100% local (codigo nao sai da maquina).

### Analise de fit para o projeto

| Criterio | Avaliacao |
|---|---|
| Reduz tokens? | Sim, 99% para exploracao de codigo (substitui dezenas de grep/read por 1 query) |
| Custo? | Gratuito |
| Friccao de setup? | Baixissima: baixar binario + rodar `install` + restart agent |
| Compativel com OpenCode? | SIM, suporte oficial |
| Risco de perda de informacao? | Nenhum - e read-only, apenas indexa |
| Beneficio para MVP de loja? | Alto - monorepo NestJS+Next.js com modulos e call chains e exatamente o cenario ideal |
| Alinhamento com AGENTS.md? | Sim - nao altera runtime, nao adiciona deps ao projeto, so melhora dev |
| Alinhamento com governanca? | Tem `manage_adr` (Architecture Decision Records) - alinha com "registrar decisao em documento ou commit" |

### Recomendacao: SIM, INSTALAR E TESTAR (priority: high)
- **Melhor fit das tres.** Zero dependencias, suporte oficial ao OpenCode, ataca exatamente o problema de re-leitura de codigo.
- Binario unico, sem Python/Rust/Docker.
- Para nosso monorepo: indexa apps/api (NestJS modules, services, repositories, call chains) + apps/web (Next.js pages, components) + packages/shared em um grafo so.
- Queries como "que service chama sales.repository?" ou "que arquivos dependem de schema.ts?" viram 1 chamada MCP em vez de 5-10 grep/read.

### Plano de teste
- [ ] Baixar binario Windows: `codebase-memory-mcp-windows-amd64.zip` do [releases](https://github.com/DeusData/codebase-memory-mcp/releases/latest).
- [ ] Extrair e rodar `install.ps1` (auto-configura `opencode.json` + `AGENTS.md`).
- [ ] Reiniciar OpenCode.
- [ ] Pedir ao agent: "Index this project".
- [ ] Validar: `/mcp` deve mostrar `codebase-memory-mcp` com 14 tools.
- [ ] Testar query: "What calls SalesService.finalize?" - comparar tokens vs grep manual.
- [ ] Testar `get_architecture` - ver overview do monorepo em 1 chamada.
- [ ] Se funcionar: habilitar `auto_index true` para re-indexar automaticamente.
- [ ] Considerar commitar `.codebase-memory/graph.db.zst` para skip de reindex entre sessoes.

---

## Ferramenta 3: OpenSpec (Fission-AI/OpenSpec)

### O que e
Framework de spec-driven development (SDD) para AI coding assistants. Workflow: `/opsx:propose` cria proposal + specs + design + tasks; `/opsx:apply` implementa; `/opsx:archive` arquiva. Specs vivem no repo como documentos persistentes.

### Custos
- **Licenca:** MIT (gratuito, open source).
- **Runtime:** nenhum custo de API.
- **Dependencias:** Node.js 20.19.0+ (ja temos Node 20+ para Next.js 16).
- Instalacao: `npm install -g @fission-ai/openspec@latest` + `openspec init` no projeto.

### Como funciona
- `/opsx:propose add-dark-mode` cria `openspec/changes/add-dark-mode/` com:
  - `proposal.md` - por que e o que muda.
  - `specs/` - requisitos e cenarios.
  - `design.md` - abordagem tecnica.
  - `tasks.md` - checklist de implementacao.
- `/opsx:apply` implementa as tasks.
- `/opsx:archive` move para `openspec/changes/archive/` e atualiza specs consolidadas.
- Funciona com 25+ AI assistants via slash commands.
- Dashboard visual disponivel.
- Telemetria anonima (opt-out: `OPENSPEC_TELEMETRY=0`).

### Compatibilidade com nosso setup
- **OpenCode:** nao listado explicitamente, mas suporta 25+ tools e funciona via slash commands/instructions.
- **Node 20+:** compativel.
- **Brownfield:** projetado para brownfield (temos codigo existente) - nao so greenfield.

### Analise de fit para o projeto

| Criterio | Avaliacao |
|---|---|
| Reduz tokens? | Indiretamente - menos iteracoes por ambiguidade, specs claras reduzem retrabalho |
| Custo? | Gratuito |
| Friccao de setup? | Baixa: npm install global + init |
| Compativel com OpenCode? | Provavelmente via instructions, mas nao oficialmente listado |
| Beneficio para MVP de loja? | Medio - boa persistencia de decisoes, mas temos Superpowers com writing-plans |
| Alinhamento com AGENTS.md? | Tensao: "Nao instalar outros plugins, skills externas ou alterar configuracoes globais sem pedido explicito" |
| Overlap com Superpowers? | ALTO - writing-plans skill ja cria planos em `docs/superpowers/plans/`; OpenSpec cria em `openspec/changes/` |

### Overlap com Superpowers (importante)

| Aspecto | Superpowers (atual) | OpenSpec |
|---|---|---|
| Planejamento | `writing-plans` skill -> `docs/superpowers/plans/` | `/opsx:propose` -> `openspec/changes/` |
| Execucao | `executing-plans` ou `subagent-driven-development` | `/opsx:apply` |
| Arquivamento | Manual (commit do plano) | `/opsx:archive` automatizado |
| Brainstorming | `brainstorming` skill | Proposal + design no OpenSpec |
| TDD | `test-driven-development` skill | tasks.md com checkboxes |
| Code review | `requesting-code-review` skill | Nao tem equivalente direto |

**Conclusao do overlap:** OpenSpec e mais estruturado e persiste specs no repo como fonte de verdade viva, mas Superpowers ja cobre o workflow com mais riqueza (brainstorming, code review, debugging sistematico, verification). Usar ambos cria paralelismo e confusao sobre onde o plano vive.

### Recomendacao: OPCIONAL - TESTAR EM UM PROJETO PILOTO (priority: low-medium)
- **Nao adotar como padrao agora.** Overlap alto com Superpowers que ja esta instalado e funcionando.
- Se testar: usar no projeto de migracao de dados legados (Plano 2), que e complexo e beneficia de specs persistentes.
- Se for melhor que Superpowers para aquele cenario, considerar migrar; se for redundante, manter Superpowers.
- Alternativa sem instalar OpenSpec: ja temos `docs/superpowers/plans/` + `docs/superpowers/specs/` - usar isso com mais disciplina.

### Plano de teste (se decidir testar)
- [ ] `npm install -g @fission-ai/openspec@latest`.
- [ ] `openspec init` no repo (cria `openspec/` dir).
- [ ] Usar `/opsx:propose migracao-dados-legado` para a tarefa do Plano 2.
- [ ] Comparar qualidade do proposal/spec/tasks vs plano do `writing-plans` skill.
- [ ] Se superior: considerar adocao; se equivalente: manter Superpowers.

---

## Resumo Comparativo

| Criterio | Headroom | codebase-memory-mcp | OpenSpec |
|---|---|---|---|
| Reduz tokens diretos | Sim (60-95%) | Sim (99% exploracao) | Indireto |
| Custo | Gratuito | Gratuito | Gratuito |
| Friccao setup Windows | Media-alta | Baixissima | Baixa |
| Suporte OpenCode | Indireto (proxy) | Oficial | Provavel |
| Risco | Intercepta trafego LLM | Read-only, zero risco | Overlap com Superpowers |
| Recomendacao | Testar com cuidado | **Instalar agora** | Opcional/piloto |
| Prioridade | Media | Alta | Baixa-media |

---

## Recomendacao Final

### Adotar agora
1. **codebase-memory-mcp** - instalar e usar. Melhor custo-beneficio, zero friccao, suporte oficial ao OpenCode, ataca o problema de exploracao de codigo que e onde mais tokens se gastam desnecessariamente.

### Testar depois (se codebase-memory-mcp nao for suficiente)
2. **Headroom** - so se o consumo continuar alto apos codebase-memory-mcp. Friccao de setup no Windows + compatibilidade nao oficial com OpenCode tornam arriscado. Se testar, usar modo proxy.

### Nao adotar por enquanto
3. **OpenSpec** - overlap alto com Superpowers. So vale se a persistencia de specs no repo for mais valiosa que o workflow existente. Testar como piloto no projeto de migracao se quiser comparar.

### Acao adicional de alto impacto (sem instalar nada)
4. **Otimizar instrucoes auto-carregadas** - 29KB de instrucoes em cada turno e o maior ofensor. Acoes:
   - Dividir `intercom/DESIGN.md` em versao resumida (tokens essenciais) + versao completa (carregar sob demanda).
   - Mover docs de roadmap/decisoes para carregamento sob demanda (nao precisa em toda mensagem).
   - Manter auto-carregados so: `AGENTS.md` + `docs/01-produto-mvp.md` + `docs/04-modelo-dados.md` (essenciais para toda tarefa).
   - Isso sozinho pode reduzir 40-50% do token de input por turno, sem nenhuma ferramenta externa.

---

## Tarefas

### Task 1: Instalar e validar codebase-memory-mcp

- [ ] Baixar binario Windows do releases page.
- [ ] Extrair e rodar `install.ps1`.
- [ ] Reiniciar OpenCode e validar `/mcp` mostra o servidor.
- [ ] Indexar o projeto: pedir "Index this project" ao agent.
- [ ] Rodar `get_architecture` e validar visao do monorepo.
- [ ] Rodar `trace_path` em `SalesService.finalize` e validar call chain.
- [ ] Habilitar `auto_index true`.
- [ ] Documentar resultado em `docs/09-ferramentas-dev.md`.

### Task 2: Otimizar instrucoes auto-carregadas (sem instalar nada)

**Files:**
- Modify: `.opencode/opencode.json` - remover instrucoes nao essenciais do auto-load.
- Create: `intercom/DESIGN-resumido.md` - versao compacta do design system.
- Modify: `AGENTS.md` - adicionar referencia para carregar docs completas sob demanda.

- [ ] Criar `intercom/DESIGN-resumido.md` com apenas cores principais, tipografia e tamanhos (~1KB vs 9KB atual).
- [ ] Em `.opencode/opencode.json`, manter auto-carregados: `AGENTS.md`, `docs/01-produto-mvp.md`, `docs/04-modelo-dados.md`, `intercom/DESIGN-resumido.md`.
- [ ] Mover para sob demanda (remover do auto-load): `docs/02-stack-arquitetura.md`, `docs/03-roadmap.md`, `docs/05-decisoes-pendentes.md`, `docs/06-ambiente-desenvolvimento.md`, `intercom/DESIGN.md` (completo).
- [ ] Em `AGENTS.md`, adicionar secao "Documentos de referencia sob demanda" listando os arquivos removidos para que o agent saiba carregar quando precisar.
- [ ] Validar: rodar uma tarefa tipica e comparar consumo de tokens.

### Task 3 (opcional): Testar Headroom via proxy

- [ ] So executar se Task 1 + Task 2 nao reduzirem consumo suficientemente.
- [ ] Seguir plano de teste da secao Headroom acima.

### Task 4 (opcional): Testar OpenSpec como piloto

- [ ] So executar se quiser comparar com Superpowers.
- [ ] Usar no projeto de migracao de dados legados (Plano 2).
- [ ] Comparar qualidade do output vs `writing-plans` skill.

---

## Riscos e Mitigacoes

| Risco | Mitigacao |
|---|---|
| codebase-memory-mcp consome muita CPU/disco ao indexar | Indexacao e one-time + incremental; rodar fora de horario de uso intenso |
| Binario Windows nao fidedigno (SmartScreen) | Verificar checksums.txt + assinatura SLSA antes de rodar |
| Remover docs do auto-load quebra o contexto do agent | Manter AGENTS.md com indice claro; agent carrega sob demanda quando precisa |
| OpenSpec + Superpowers gera confusao | Nao usar ambos simultaneamente; escolher um |
| Headroom intercepta dados sensiveis no proxy | Roda localmente, dados nao saem da maquina; mas validar antes de usar com dados reais de cliente |
