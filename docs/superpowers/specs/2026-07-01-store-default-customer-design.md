# Venda Padrao Loja

## Objetivo

Eliminar vendas sem cliente no historico operacional. Quando a venda for feita diretamente na loja e o operador nao selecionar um cliente, o sistema deve registrar a venda no cliente padrao `Loja`.

## Decisao De Produto

- O cliente padrao se chama `Loja`.
- Venda finalizada nao pode mais ter `customerId` nulo.
- A tela de vendas continua rapida: se o operador nao escolher cliente, o frontend envia automaticamente o cliente `Loja`.
- O backend tambem valida a regra para impedir venda sem cliente por qualquer rota ou cliente HTTP.
- Historico, recibo, entregas e financeiro devem exibir `Loja` como cliente quando for venda de balcao.

## Fora Do Escopo

- Nao criar tipos avancados de cliente.
- Nao criar multiempresa, filial ou loja fisica como entidade separada.
- Nao mudar regras de estoque, pagamento, cancelamento ou financeiro alem do cliente obrigatorio.

## Dados

- O seed dev deve criar ou garantir o cliente `Loja`.
- O cliente `Loja` deve estar ativo.
- O frontend precisa receber esse cliente na lista inicial de clientes da tela de vendas.
- Como MVP, nao e necessario adicionar coluna especial como `is_store_customer`; o nome `Loja` no seed atende ao fluxo atual.

## Interface

- Substituir a mensagem `Venda sem cliente` por uma mensagem clara: `Venda na loja: se nenhum cliente for escolhido, a venda sera registrada como Loja.`
- Manter busca e cadastro rapido de cliente.
- Nao exigir clique adicional para escolher `Loja`.

## Backend

- Validar no service de vendas que `customerId` e obrigatorio.
- Se `customerId` estiver ausente ou invalido, retornar erro claro para operador.
- Preservar transacao de venda, baixa de estoque e entrada financeira.

## Testes

- Contrato/shared deve rejeitar venda sem `customerId`.
- API service deve rejeitar venda sem cliente.
- Web helper deve enviar o cliente `Loja` quando nenhum cliente real estiver selecionado.
- UI deve mostrar a mensagem de venda na loja.
- Seed deve conter cliente `Loja`.

## Riscos

- Se o cliente `Loja` nao existir no banco, o frontend nao deve finalizar a venda silenciosamente; deve mostrar erro claro.
- Em dados antigos, vendas ja existentes sem cliente podem continuar aparecendo sem cliente ate haver migracao de dados, se necessario. Este incremento foca vendas novas.
