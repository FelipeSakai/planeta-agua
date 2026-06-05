# Decisoes Pendentes

Estas respostas devem ser confirmadas antes de fechar completamente o escopo.

## Prioridade Alta

1. Cliente sera obrigatorio na venda?
2. A loja vende no balcao, por entrega ou ambos?
3. Troca de galao entra no MVP?
4. Galao cheio e galao vazio precisam ser estoques separados?
5. Quem pode cancelar venda?
6. Quem pode alterar estoque?
7. O financeiro precisa de fechamento de caixa ou apenas resumo diario?
8. O sistema precisa funcionar bem no celular desde o primeiro release?

## Prioridade Media

1. Existe venda fiado ou pagamento posterior?
2. Existem clientes recorrentes com historico importante?
3. E necessario imprimir recibo simples?
4. Quais formas de pagamento serao usadas no primeiro dia?
5. Quais categorias de despesas devem existir?
6. Quais produtos principais serao cadastrados primeiro?

## Decisoes Tecnicas Abertas

1. Usar Auth.js ou auth propria simples?
2. Deploy inicial em Vercel, Render, Railway ou VPS?
3. Banco inicial em Neon, Supabase ou Railway?
4. Usar shadcn/ui ou componentes Tailwind proprios?

## Recomendacao Inicial Para Nao Travar

- Cliente opcional na venda.
- Entrega registrada apenas como observacao no MVP.
- Troca de galao fora da primeira entrega funcional, salvo se for dor central.
- Apenas `ADMIN` cancela venda e altera estoque manualmente.
- Financeiro com resumo diario, sem fechamento de caixa formal no primeiro ciclo.
- Interface responsiva, mas otimizada primeiro para computador e tablet.
