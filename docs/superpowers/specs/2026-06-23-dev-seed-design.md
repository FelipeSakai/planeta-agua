# Design: Seed de Ambiente de Desenvolvimento

## Data

2026-06-23

## Status

Aguardando aprovação para implementação.

## 1. Objetivo

Criar uma seed completa para ambiente de desenvolvimento que popule o banco de dados com cenários realistas, permitindo testar todas as rotas e fluxos do MVP: vendas, estoque, financeiro, clientes, galões e usuários.

## 2. Escopo

### Dentro do escopo

- Truncar e repopular todas as tabelas operacionais.
- Criar dados de teste para:
  - Usuários (ADMIN + OPERATOR)
  - Clientes
  - Produtos (com classificação de galão)
  - Movimentações de estoque
  - Vendas e itens de venda
  - Galões de clientes
  - Caixas diários
  - Despesas
- Incluir cenários especiais: vendas canceladas, entregas pendentes, estoque baixo, galões próximos de vencer/vencidos, clientes inativos, despesas em dinheiro e outras formas.
- Proteger contra execução acidental em produção.
- Atualizar `db:seed` para rodar a seed completa.

### Fora do escopo

- Seed para produção.
- Dados de teste realistas de CPF/CNPJ.
- Integração com sistemas legados.
- Performance de grande volume (a seed é para dev, não para stress test).

## 3. Contexto

O projeto já possui um script `apps/api/scripts/seed-admin.ts` que cria/atualiza um usuário ADMIN a partir de variáveis de ambiente. O comando `pnpm db:seed` atualmente executa apenas esse script.

A nova seed será modular, mantendo o `seed-admin.ts` existente e adicionando um orquestrador `seed-dev.ts` que coordena a criação de todos os dados.

## 4. Estrutura de Arquivos

```text
apps/api/scripts/
├── seed-admin.ts          (já existe, mantém)
├── seed-dev.ts            (orquestrador)
└── seed/
    ├── reset.ts           (trunca tabelas em ordem segura)
    ├── users.ts           (cria ADMIN + OPERATORs)
    ├── products.ts        (cria produtos variados)
    ├── customers.ts       (cria clientes)
    ├── stock.ts           (cria entradas e ajustes de estoque)
    ├── sales.ts           (cria vendas e itens)
    ├── bottles.ts         (cria galões manuais/adicionais)
    └── finance.ts         (cria caixas e despesas)
```

## 5. Fluxo de Execução

O `seed-dev.ts` executa os passos:

1. **Validar ambiente**: só prossegue se `NODE_ENV=development` ou `ALLOW_SEED=true`.
2. **Truncar tabelas** na ordem segura respeitando foreign keys:
   - `customer_bottles`
   - `sale_items`
   - `sales`
   - `stock_movements`
   - `expenses`
   - `cash_registers`
   - `customers`
   - `products`
   - `users`
3. **Inserir dados** na ordem inversa:
   - users
   - products
   - customers
   - stock (entradas iniciais e ajustes)
   - sales + sale_items (a criação dispara movimentação de estoque e galões automáticos via regras do repository)
   - bottles (galões manuais para cenários de vencimento)
   - finance (caixa diário + despesas)
4. **Imprimir resumo** final no terminal.

## 6. Volumes e Cenários

### Usuários

- 1 ADMIN (`admin@planetaagua.local`)
- 2 OPERATORs (`op1@planetaagua.local`, `op2@planetaagua.local`)
- Senhas vindas de variáveis de ambiente.

### Clientes

- 30 clientes.
- ~20% sem telefone.
- ~30% com endereço.
- 2 clientes inativos.
- Nomes brasileiros realistas.

### Produtos

- Galão 20L Completo (`bottleType = COMPLETE`)
- Galão 20L Troca (`bottleType = EXCHANGE`)
- Água 500ml (fardo)
- Água 1,5L
- Gás P13
- 3 acessórios (bomba, suporte, dispenser)
- 2 produtos inativos
- Alguns com estoque baixo intencional

### Estoque

- Entrada inicial para todos os produtos ativos.
- 3 ajustes manuais com motivo documentado.

### Vendas

- ~80 vendas distribuídas nos últimos 30 dias.
- Formas de pagamento variadas: CASH, PIX, CREDIT_CARD, DEBIT_CARD, OTHER.
- ~70% em dinheiro/PIX, ~30% em cartão.
- ~5 vendas canceladas.
- ~3 vendas pendentes de entrega (`PENDING_DELIVERY`).
- Vendas com 1 a 3 itens.
- Algumas vendas incluem galão completo para gerar `customer_bottles`.

### Galões

- Gerados automaticamente pelas vendas de produtos `COMPLETE`.
- 5 galões manuais com datas antigas para simular vencimento.
- 2 galões próximos do vencimento (dentro de 30 dias).
- 1 galão já vencido.

### Financeiro

- 1 caixa por dia nos últimos 30 dias.
- Fundo de caixa entre R$ 50,00 e R$ 200,00.
- Caixas abertos (sem fechamento) para facilitar testes.
- ~20 despesas variadas.
- Algumas despesas pagas em dinheiro (reduzem caixa físico).

## 7. Segurança e Ambiente

- A seed só pode ser executada quando `NODE_ENV=development` ou `ALLOW_SEED=true`.
- Caso contrário, o script encerra com mensagem clara antes de qualquer operação destrutiva.
- Senhas de usuários de teste vêm de variáveis de ambiente (ex: `ADMIN_PASSWORD`, `SEED_OPERATOR_PASSWORD`).
- Nunca versionar senhas reais no repositório.
- Atualizar `.env.example` com as variáveis necessárias.

## 8. Comando de Execução

Atualizar `apps/api/package.json`:

```json
"db:seed": "tsx scripts/seed-dev.ts"
```

Execução:

```bash
pnpm db:seed
```

Ou explicitamente:

```bash
pnpm --filter api db:seed
```

## 9. Testes

- Seed deve ser testada manualmente após implementação.
- Verificar se todas as rotas respondem corretamente com os dados criados.
- Verificar se as regras de negócio (estoque, caixa, galões) ficaram consistentes.

## 10. Notas

- A seed é um utilitário de desenvolvimento, não uma funcionalidade do produto.
- Dados sensíveis reais de clientes nunca devem ser usados na seed.
- A seed pode ser estendida no futuro para cenários de teste automatizado.
