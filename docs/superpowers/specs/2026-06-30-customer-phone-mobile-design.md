# Cliente Com Telefone E Celular

## Objetivo

Preservar os dois contatos existentes no sistema legado (`telefone` e `celular`) sem obrigar a loja a escolher um principal durante a migracao. O sistema novo deve permitir cadastro, busca e exibicao dos dois campos de forma simples, especialmente na tela de vendas.

## Decisao

Cliente passa a ter dois campos opcionais:

- `phone`: telefone fixo ou contato geral.
- `mobile_phone`: celular.

Nenhum dos dois sera obrigatorio no MVP. A loja pode cadastrar cliente sem contato quando necessario, e pode preencher apenas um dos campos.

## Escopo

Entram:

- Adicionar coluna `mobile_phone` em `customers`.
- Atualizar contratos compartilhados de cliente e venda rapida.
- Atualizar API de clientes e vendas para criar, listar, buscar e retornar `mobilePhone`.
- Atualizar seed para popular clientes com telefone e/ou celular.
- Atualizar UI de clientes para exibir e editar os dois campos.
- Atualizar UI de vendas para buscar por nome, telefone, celular, codigo ou endereco em um campo unico.
- Atualizar UI de vendas para mostrar contatos compactos: `Cel: ... · Tel: ...`.
- Ajustar testes afetados.

Nao entram:

- Tabela de multiplos telefones por cliente.
- Tipo de contato (`WHATSAPP`, `FIXO`, `OUTRO`).
- Marcacao de contato principal.
- Integracao WhatsApp.
- Importador automatico do sistema legado.

## Regras De UX

- Na tela de clientes, labels devem ser `Telefone` e `Celular`.
- Na venda rapida, o cadastro pode mostrar `Celular` e `Telefone` como campos opcionais.
- Na busca de venda, usar um unico campo para reduzir atrito operacional.
- O texto da busca deve ser curto: `Buscar cliente` ou `Nome, telefone, celular, codigo ou endereco`.
- A tela de vendas deve reduzir textos explicativos longos para diminuir poluicao visual.

## Busca

A busca de cliente deve procurar em:

- nome;
- telefone;
- celular;
- codigo;
- endereco.

Na tela de vendas, depois de selecionar um cliente, a lista de resultados deve fechar e o campo de busca deve limpar, seguindo o comportamento esperado da busca de produto.

## Migracao

Criar nova migration do Drizzle para adicionar `mobile_phone` em `customers`. Nao alterar migrations antigas.

## Primeiro Incremento

Implementar telefone/celular junto com os ajustes pendentes da tela `/vendas`:

- reduzir copy excessiva;
- fazer busca de cliente em campo unico com resultados abaixo;
- limpar/fechar busca de produto ao selecionar produto;
- exibir telefone/celular compactos no cliente selecionado e nos resultados.
