# Briefing Estratégico — MVP Sistema para Loja de Água

## 1. Contexto do projeto

A ideia é desenvolver um sistema web para substituir ou evoluir o processo atual de uma loja de água que hoje depende de um sistema legado com UI/UX ruim, pouca flexibilidade e dificuldade de melhoria.

O sistema atual já possui algumas funções importantes, como:

- Controle de vendas;
- Controle de estoque;
- Sistema de vendas;
- Parte financeira básica;
- Entradas e saídas;
- Cadastro/controle de produtos.

O objetivo do novo projeto é tirar processos manuais do papel e centralizar a operação em um sistema mais moderno, simples, rápido e automatizado.

Este documento serve como base inicial para outro agente, time ou ferramenta de planejamento continuar a definição do produto, escopo, arquitetura e roadmap.

---

## 2. Visão inicial do produto

Criar uma aplicação web para gestão operacional de uma loja de água, com foco em vendas, estoque, produtos, clientes e financeiro básico.

A primeira versão não deve tentar recriar todo o sistema legado de uma vez. O MVP deve focar no fluxo mais importante da loja: registrar vendas corretamente, controlar estoque automaticamente e gerar uma visão simples do dinheiro que entrou e saiu.

---

## 3. Problema que o projeto resolve

A loja atualmente sofre com um sistema antigo, pouco intuitivo e difícil de evoluir. Isso gera problemas como:

- Processo operacional lento;
- Dependência de papel ou controles paralelos;
- Dificuldade para acompanhar vendas e estoque em tempo real;
- Maior chance de erro humano;
- Falta de uma visão clara sobre entradas, saídas e resultado financeiro;
- Dificuldade para treinar funcionários no uso do sistema;
- Baixa flexibilidade para adaptar o sistema à realidade da loja.

---

## 4. Público-alvo inicial

O público inicial ideal é uma loja pequena ou média de venda/distribuição de água, especialmente negócios que vendem:

- Galões de água;
- Água mineral em fardos/garrafas;
- Produtos relacionados;
- Entregas recorrentes para clientes;
- Troca de galões retornáveis.

Na primeira versão, o foco deve ser uma única loja, não uma plataforma SaaS multiempresa.

---

## 5. Dor principal do usuário

A dor principal é a falta de controle simples, confiável e prático sobre a operação diária da loja.

O usuário precisa responder rapidamente perguntas como:

- Quanto vendi hoje?
- Quais produtos ainda tenho em estoque?
- Preciso repor algum item?
- Quem comprou determinado produto?
- Quanto entrou e saiu de dinheiro?
- Quantos galões foram vendidos, trocados ou devolvidos?
- Quais vendas foram feitas no balcão e quais foram entregas?

---

## 6. Solução proposta

Construir um sistema web simples, com interface moderna e focada na rotina da loja, permitindo:

- Cadastrar produtos;
- Registrar vendas;
- Atualizar estoque automaticamente;
- Registrar entradas e saídas financeiras básicas;
- Consultar histórico de vendas;
- Visualizar resumo diário da operação;
- Reduzir ou eliminar controles em papel.

---

## 7. Princípio central do MVP

O MVP deve validar se o sistema consegue substituir parte essencial da operação atual com menos atrito do que o sistema legado.

A pergunta principal da primeira versão é:

> A loja consegue operar vendas e estoque diariamente usando o novo sistema, com menos erro e mais velocidade do que antes?

Se a resposta for sim, o produto tem base para crescer.

---

## 8. Perguntas essenciais para aprofundar o projeto

Antes de fechar o escopo, estas perguntas precisam ser respondidas.

### 8.1 Sobre o negócio

1. A loja vende apenas água ou também outros produtos?
2. Existem vendas no balcão, entregas ou ambos?
3. A loja trabalha com clientes recorrentes?
4. Existem clientes que compram fiado ou com pagamento posterior?
5. Existe controle de galões retornáveis?
6. A loja possui funcionários com permissões diferentes?
7. Quantas pessoas usariam o sistema diariamente?
8. O sistema será usado em computador, celular, tablet ou todos?
9. A loja possui internet estável?
10. Existe necessidade de funcionar offline no futuro?

### 8.2 Sobre vendas

1. Como uma venda acontece hoje, passo a passo?
2. Quais dados são obrigatórios em uma venda?
3. Toda venda precisa estar vinculada a um cliente?
4. Quais formas de pagamento são aceitas?
5. Existe venda com múltiplos produtos?
6. Existe desconto?
7. Existe cancelamento ou estorno?
8. A entrega faz parte do fluxo de venda?
9. É necessário imprimir recibo ou comprovante?
10. A loja emite nota fiscal ou isso fica fora do sistema?

### 8.3 Sobre estoque

1. Quais tipos de produtos existem?
2. O estoque diminui automaticamente a cada venda?
3. Existem entradas de estoque por compra de fornecedor?
4. Existe perda, quebra ou descarte de produto?
5. Existe estoque mínimo para alerta?
6. Galão vazio e galão cheio devem ser controlados separadamente?
7. A troca de galão impacta estoque de forma diferente de uma venda comum?

### 8.4 Sobre financeiro

1. O financeiro precisa ser apenas um resumo simples ou algo mais completo?
2. Quais despesas devem ser registradas?
3. O sistema precisa controlar caixa diário?
4. É necessário fechamento de caixa?
5. É necessário separar dinheiro, pix, cartão e outros meios?
6. É necessário relatório mensal?
7. Existem contas a receber?
8. Existem contas a pagar?

### 8.5 Sobre usuários e permissões

1. Haverá login?
2. Quais tipos de usuário existirão?
3. Um funcionário pode ver financeiro?
4. Um funcionário pode cadastrar produtos?
5. Um funcionário pode cancelar venda?
6. O dono/admin precisa ter acesso a tudo?

### 8.6 Sobre validação

1. Qual processo atual causa mais dor: venda, estoque, financeiro ou entrega?
2. Qual tela do sistema legado é mais usada?
3. Qual tela do sistema legado é mais odiada?
4. Qual seria o primeiro sinal de que o novo sistema está melhor?
5. Quem será o primeiro usuário testador?
6. Por quantos dias o MVP será testado na rotina real?
7. Qual métrica dirá que o MVP funcionou?

### 8.7 Sobre recursos e prazo

1. Quem irá desenvolver o sistema?
2. O projeto será feito sozinho ou em equipe?
3. Existe orçamento para hospedagem, domínio e banco?
4. Qual prazo desejado para a primeira versão utilizável?
5. O MVP precisa ser bonito ou apenas funcional e claro?
6. Existe algum dado do sistema legado que precisa ser migrado?
7. O sistema legado tem exportação em CSV, Excel ou banco acessível?

---

## 9. Escopo recomendado para o MVP

### Objetivo principal

Permitir que a loja registre vendas e controle estoque automaticamente em uma operação real do dia a dia.

### Público inicial

A própria loja de água do proprietário do projeto, com poucos usuários internos.

### Funcionalidades obrigatórias

Estas são as funcionalidades que fazem sentido para a primeira versão:

1. Login básico
   - Acesso por usuário e senha.
   - Pelo menos dois perfis: administrador e operador.

2. Cadastro de produtos
   - Nome do produto;
   - Preço de venda;
   - Quantidade em estoque;
   - Estoque mínimo;
   - Status ativo/inativo.

3. Cadastro simples de clientes
   - Nome;
   - Telefone;
   - Endereço opcional;
   - Observações opcionais.

4. Registro de venda
   - Selecionar cliente, se necessário;
   - Selecionar produtos;
   - Informar quantidade;
   - Calcular total automaticamente;
   - Informar forma de pagamento;
   - Finalizar venda;
   - Baixar estoque automaticamente.

5. Histórico de vendas
   - Listagem de vendas;
   - Filtro por data;
   - Visualização dos itens da venda;
   - Total da venda;
   - Forma de pagamento.

6. Controle de estoque básico
   - Listar produtos e quantidades;
   - Alertar produtos abaixo do estoque mínimo;
   - Registrar entrada manual de estoque;
   - Registrar ajuste manual de estoque, com motivo.

7. Financeiro simples
   - Total vendido no dia;
   - Total por forma de pagamento;
   - Registro simples de despesas;
   - Resumo de entradas e saídas.

8. Dashboard inicial
   - Vendas do dia;
   - Faturamento do dia;
   - Produtos com estoque baixo;
   - Últimas vendas.

---

## 10. Funcionalidades que devem ficar para depois

Estas funcionalidades são importantes, mas não devem entrar na primeira versão se o objetivo for lançar rápido:

- Emissão de nota fiscal;
- Integração com meios de pagamento;
- Aplicativo mobile nativo;
- Funcionamento offline;
- Controle avançado de rotas de entrega;
- Controle completo de contas a pagar e receber;
- Integração com WhatsApp;
- Relatórios avançados;
- Multiempresa/SaaS;
- Gestão avançada de permissões;
- Auditoria completa;
- BI com gráficos complexos;
- Integração com o sistema legado;
- Importação automática de dados do sistema legado;
- Impressão fiscal;
- Controle avançado de fornecedores;
- Controle de comissão;
- Programa de fidelidade.

Essas funções podem ser úteis no futuro, mas aumentam custo, complexidade e tempo sem necessariamente validar a dor principal.

---

## 11. Fluxo principal do usuário no MVP

### Fluxo de venda

1. Usuário faz login.
2. Acessa a tela de vendas.
3. Seleciona ou cadastra rapidamente um cliente.
4. Adiciona produtos ao carrinho.
5. Informa quantidade de cada produto.
6. Sistema calcula o total.
7. Usuário escolhe a forma de pagamento.
8. Usuário finaliza a venda.
9. Sistema registra a venda.
10. Sistema baixa o estoque automaticamente.
11. Venda aparece no histórico e no resumo financeiro do dia.

### Fluxo de entrada de estoque

1. Usuário acessa a tela de estoque.
2. Seleciona um produto.
3. Informa quantidade recebida.
4. Informa motivo ou origem da entrada.
5. Sistema atualiza o estoque.
6. Movimento fica registrado no histórico.

### Fluxo financeiro básico

1. Usuário acessa o dashboard ou financeiro.
2. Visualiza total vendido no dia.
3. Visualiza vendas por forma de pagamento.
4. Registra despesas simples, se necessário.
5. Consulta resumo de entradas e saídas.

---

## 12. Estrutura de telas recomendada

### 1. Login

Tela simples para autenticação.

Campos:

- E-mail ou usuário;
- Senha.

### 2. Dashboard

Resumo operacional da loja.

Componentes:

- Vendas do dia;
- Faturamento do dia;
- Quantidade de vendas;
- Produtos com estoque baixo;
- Últimas vendas;
- Atalho para nova venda.

### 3. Vendas

Tela principal do sistema.

Componentes:

- Busca/cadastro rápido de cliente;
- Busca de produto;
- Lista de itens da venda;
- Quantidade;
- Total;
- Forma de pagamento;
- Botão finalizar venda.

### 4. Histórico de vendas

Componentes:

- Filtro por data;
- Lista de vendas;
- Status da venda;
- Total;
- Forma de pagamento;
- Detalhes da venda.

### 5. Produtos

Componentes:

- Lista de produtos;
- Criar produto;
- Editar produto;
- Ativar/inativar produto;
- Preço;
- Estoque atual;
- Estoque mínimo.

### 6. Estoque

Componentes:

- Produtos e quantidade atual;
- Entrada de estoque;
- Ajuste manual;
- Histórico de movimentações;
- Alerta de estoque baixo.

### 7. Clientes

Componentes:

- Lista de clientes;
- Cadastro;
- Edição;
- Histórico de compras do cliente, se simples de implementar.

### 8. Financeiro simples

Componentes:

- Entradas por venda;
- Saídas/despesas;
- Resumo por período;
- Total por forma de pagamento.

### 9. Usuários

Para administrador.

Componentes:

- Criar usuário;
- Editar usuário;
- Definir perfil;
- Ativar/inativar.

---

## 13. Escopo técnico mínimo

### Recomendação de stack

Como o projeto precisa ser simples, funcional e evolutivo, uma stack recomendada seria:

#### Frontend

- React ou Next.js;
- TypeScript;
- TailwindCSS ou CSS modular;
- React Hook Form;
- Zod para validação.

#### Backend

- Node.js com Fastify ou NestJS;
- TypeScript;
- API REST;
- Validação com Zod ou class-validator;
- Autenticação com JWT.

#### Banco de dados

- PostgreSQL.

#### ORM

- Prisma ou Drizzle ORM.

#### Deploy futuro

- Frontend: Vercel, Render ou VPS;
- Backend: Render, Railway, Fly.io ou VPS;
- Banco: Supabase, Neon, Railway, Render ou VPS própria.

### Recomendação objetiva

Para um MVP rápido e organizado:

- Frontend: Next.js + TypeScript + TailwindCSS;
- Backend: Node.js + Fastify + TypeScript;
- Banco: PostgreSQL;
- ORM: Drizzle ou Prisma;
- Auth: JWT simples;
- Deploy inicial: Render/Railway/Supabase ou VPS simples.

Se o objetivo for aprendizado e arquitetura mais robusta, Fastify modular com camadas de controller, service e repository é uma boa escolha.

---

## 14. Modelo inicial de banco de dados

### users

Representa os usuários internos do sistema.

Campos sugeridos:

- id;
- name;
- email;
- password_hash;
- role;
- is_active;
- created_at;
- updated_at.

Roles iniciais:

- ADMIN;
- OPERATOR.

### customers

Representa os clientes da loja.

Campos sugeridos:

- id;
- name;
- phone;
- address;
- notes;
- created_at;
- updated_at.

### products

Representa os produtos vendidos.

Campos sugeridos:

- id;
- name;
- description;
- sale_price;
- stock_quantity;
- minimum_stock;
- is_active;
- created_at;
- updated_at.

### sales

Representa uma venda.

Campos sugeridos:

- id;
- customer_id;
- user_id;
- total_amount;
- payment_method;
- status;
- created_at;
- updated_at.

Status iniciais:

- COMPLETED;
- CANCELED.

Formas de pagamento iniciais:

- CASH;
- PIX;
- CREDIT_CARD;
- DEBIT_CARD;
- OTHER.

### sale_items

Representa os itens de uma venda.

Campos sugeridos:

- id;
- sale_id;
- product_id;
- quantity;
- unit_price;
- total_price;
- created_at.

### stock_movements

Representa movimentações de estoque.

Campos sugeridos:

- id;
- product_id;
- user_id;
- type;
- quantity;
- reason;
- reference_id;
- created_at.

Tipos iniciais:

- IN;
- OUT;
- ADJUSTMENT;
- SALE;
- CANCELED_SALE.

### expenses

Representa despesas simples.

Campos sugeridos:

- id;
- description;
- amount;
- category;
- payment_method;
- date;
- created_by;
- created_at;
- updated_at.

---

## 15. Regras de negócio iniciais

1. Uma venda finalizada deve baixar o estoque automaticamente.
2. Uma venda não pode ser finalizada se não houver estoque suficiente.
3. Produto inativo não deve aparecer para venda.
4. Toda movimentação de estoque precisa ser registrada.
5. Cancelar venda deve devolver os itens ao estoque.
6. Apenas administrador pode cadastrar usuários.
7. Apenas administrador deve ter acesso completo ao financeiro.
8. Operador pode registrar vendas e consultar produtos.
9. Estoque abaixo do mínimo deve aparecer em alerta.
10. O sistema deve manter histórico das vendas, mesmo que produtos sejam editados depois.

---

## 16. Riscos técnicos

### 1. Controle de estoque incorreto

Risco: vender produto sem estoque ou baixar estoque errado.

Mitigação:

- Criar regra transacional no backend;
- Registrar movimentos de estoque;
- Bloquear venda sem quantidade suficiente.

### 2. Cancelamento de venda

Risco: cancelar venda e não devolver estoque corretamente.

Mitigação:

- Criar regra clara para status da venda;
- Ao cancelar, gerar movimento reverso de estoque.

### 3. Financeiro crescer demais

Risco: tentar criar um ERP financeiro completo no MVP.

Mitigação:

- Começar apenas com entradas por venda e despesas simples.

### 4. UI complexa demais

Risco: criar telas bonitas, mas lentas para operar.

Mitigação:

- Priorizar velocidade de uso;
- Tela de vendas deve ser a mais simples possível;
- Poucos cliques para finalizar venda.

### 5. Migração do legado

Risco: perder tempo tentando importar tudo do sistema antigo.

Mitigação:

- Começar com cadastro manual dos produtos principais;
- Migrar clientes apenas se for realmente necessário;
- Evitar dependência do sistema legado no MVP.

---

## 17. Alternativas mais simples

### Alternativa A — MVP completo, mas controlado

Inclui vendas, estoque, clientes, produtos e financeiro simples.

Vantagem:

- Valida a operação real da loja.

Desvantagem:

- Exige mais desenvolvimento.

Recomendação:

- Melhor opção se houver tempo para construir com calma.

### Alternativa B — MVP ultra simples

Inclui apenas produtos, vendas e baixa automática de estoque.

Vantagem:

- Mais rápido de lançar.

Desvantagem:

- Não resolve financeiro e clientes de forma completa.

Recomendação:

- Melhor opção se o prazo for curto.

### Alternativa C — Protótipo validável sem backend completo

Criar apenas telas navegáveis e simular dados.

Vantagem:

- Muito rápido para validar UX.

Desvantagem:

- Não serve para operação real.

Recomendação:

- Útil antes do desenvolvimento, mas não substitui o MVP funcional.

---

## 18. Recomendação de escopo inicial

A recomendação mais equilibrada é construir o MVP com estes módulos:

1. Login;
2. Dashboard simples;
3. Produtos;
4. Clientes simples;
5. Vendas;
6. Estoque;
7. Financeiro básico.

Não incluir nesta fase:

- Nota fiscal;
- App mobile;
- Integração com pagamento;
- WhatsApp;
- Relatórios avançados;
- Multiempresa;
- Controle avançado de entrega.

---

## 19. Plano de execução sugerido

### Fase 1 — Descoberta e definição

Objetivo: entender o fluxo real da loja.

Tarefas:

- Mapear como uma venda acontece hoje;
- Listar produtos principais;
- Definir formas de pagamento;
- Definir regras de estoque;
- Definir perfis de usuário;
- Escolher o escopo final do MVP.

Entregável:

- Documento de requisitos enxuto;
- Fluxo principal validado;
- Lista final de funcionalidades.

### Fase 2 — Protótipo de telas

Objetivo: validar a experiência antes de codar tudo.

Tarefas:

- Criar wireframes das telas principais;
- Priorizar tela de vendas;
- Validar com quem usa o sistema no dia a dia;
- Ajustar fluxo para reduzir cliques.

Entregável:

- Protótipo navegável ou mockup simples.

### Fase 3 — Backend base

Objetivo: criar estrutura técnica do sistema.

Tarefas:

- Configurar projeto backend;
- Configurar banco PostgreSQL;
- Criar migrations;
- Criar autenticação;
- Criar módulos de produtos, clientes, vendas, estoque e despesas;
- Criar validações.

Entregável:

- API funcional para o MVP.

### Fase 4 — Frontend base

Objetivo: criar interface operacional.

Tarefas:

- Criar layout base;
- Criar login;
- Criar dashboard;
- Criar tela de produtos;
- Criar tela de vendas;
- Criar tela de estoque;
- Criar tela de financeiro simples.

Entregável:

- Sistema navegável e conectado à API.

### Fase 5 — Teste em operação real

Objetivo: validar se o sistema resolve a dor real.

Tarefas:

- Cadastrar produtos reais;
- Rodar vendas reais ou simuladas;
- Conferir baixa de estoque;
- Conferir resumo financeiro;
- Coletar feedback dos usuários;
- Corrigir falhas críticas.

Entregável:

- MVP validado ou lista de ajustes obrigatórios.

### Fase 6 — Deploy inicial

Objetivo: disponibilizar o sistema para uso contínuo.

Tarefas:

- Configurar ambiente de produção;
- Configurar banco em produção;
- Criar variáveis de ambiente;
- Publicar frontend e backend;
- Configurar domínio, se necessário;
- Criar backup básico.

Entregável:

- Sistema publicado e acessível.

---

## 20. Métricas de sucesso do MVP

O MVP deve ser avaliado com métricas simples:

1. Tempo médio para registrar uma venda;
2. Quantidade de vendas registradas no novo sistema;
3. Número de erros de estoque identificados;
4. Quantidade de controles em papel eliminados;
5. Frequência de uso diário;
6. Satisfação dos usuários internos;
7. Diferença entre estoque físico e estoque no sistema;
8. Clareza do fechamento diário.

### Meta inicial sugerida

Após 2 semanas de uso:

- 80% ou mais das vendas devem estar sendo registradas no novo sistema;
- O estoque deve bater com a realidade na maioria dos produtos principais;
- O usuário principal deve considerar o sistema mais fácil que o legado;
- O sistema deve reduzir ou eliminar pelo menos um controle em papel.

---

## 21. Hipóteses que precisam ser testadas

1. A loja realmente precisa de um novo sistema, não apenas melhorar um processo manual.
2. A tela de vendas é a parte mais crítica do sistema.
3. Baixa automática de estoque resolve uma dor real.
4. O financeiro básico já entrega valor suficiente na primeira versão.
5. Os usuários conseguem operar o sistema sem treinamento longo.
6. O sistema web é suficiente, sem app mobile no começo.
7. Não é necessário migrar todos os dados antigos para começar.

---

## 22. Estratégia de validação

Como o produto será usado inicialmente pela própria loja, a validação deve acontecer em ambiente real.

Sugestão:

1. Criar uma versão inicial com poucos produtos reais;
2. Testar durante alguns dias com vendas simuladas;
3. Depois testar com vendas reais em paralelo ao processo atual;
4. Comparar velocidade, erros e facilidade;
5. Ajustar o fluxo antes de desligar qualquer processo antigo.

---

## 23. Possível monetização futura

Embora o MVP deva focar em uma loja, no futuro o sistema pode virar produto para outras distribuidoras pequenas.

Possíveis modelos:

- Mensalidade por loja;
- Plano por número de usuários;
- Plano por quantidade de vendas mensais;
- Setup inicial + mensalidade;
- Versão local para pequenas lojas;
- SaaS multiempresa no futuro.

Mas essa monetização não deve ser prioridade agora. Primeiro é necessário provar que o sistema resolve a operação de uma loja real.

---

## 24. Próximas decisões necessárias

Antes de iniciar o desenvolvimento, responder:

1. Qual fluxo será priorizado: venda, estoque ou financeiro?
2. O sistema terá entrega no MVP?
3. Cliente será obrigatório na venda?
4. A troca de galão será tratada como produto, tipo de venda ou regra específica?
5. O financeiro terá fechamento de caixa ou apenas resumo?
6. O estoque de galão cheio e vazio precisa ser separado?
7. Haverá importação de dados do sistema legado?
8. Quem pode cancelar venda?
9. Quem pode alterar estoque?
10. O sistema precisa funcionar no celular desde a primeira versão?

---

## 25. Direcionamento crítico

A ideia é válida, mas pode ficar grande demais se tentar substituir todo o sistema legado de uma vez.

O erro mais perigoso seria tentar construir um ERP completo logo no início.

A melhor abordagem é começar pelo núcleo operacional:

> Produto + Venda + Estoque + Resumo financeiro simples.

Esse núcleo valida se o sistema realmente melhora o dia a dia da loja. Depois disso, novas funcionalidades podem ser adicionadas com mais segurança.

---

## 26. Prompt sugerido para enviar a outro agent

Use o texto abaixo para continuar o planejamento com outro agente:

```text
Você é um especialista em produto, UX e arquitetura de software. Estou criando um MVP de sistema web para uma loja de água que hoje usa um sistema legado ruim, com UI/UX desatualizado e pouca flexibilidade.

O objetivo é criar uma primeira versão simples para substituir controles em papel e melhorar a operação da loja, principalmente vendas, estoque, produtos, clientes e financeiro básico.

Quero que você use o briefing abaixo como base e me ajude a transformar isso em um plano técnico e de produto mais detalhado, separando o que entra no MVP do que fica para depois.

Priorize simplicidade, validação rápida e uso real na operação da loja. Questione funcionalidades complexas e proponha alternativas mais simples sempre que possível.

Briefing:
[cole aqui este documento]
```

---

## 27. Resumo executivo

O projeto deve começar como um sistema web interno para uma loja de água, focado em registrar vendas, controlar estoque e fornecer uma visão financeira simples.

A primeira versão deve ser pequena, funcional e validável. O principal objetivo é provar que a loja consegue operar melhor com o novo sistema do que com o legado ou papel.

Escopo recomendado para o MVP:

- Login;
- Dashboard;
- Produtos;
- Clientes simples;
- Vendas;
- Estoque;
- Financeiro básico.

Escopo fora do MVP:

- Nota fiscal;
- WhatsApp;
- App mobile;
- SaaS multiempresa;
- Relatórios avançados;
- Integrações complexas;
- Controle completo de entregas.

Decisão estratégica principal:

> Criar primeiro um sistema pequeno que funcione muito bem para a rotina diária da loja, antes de tentar criar um ERP completo.
