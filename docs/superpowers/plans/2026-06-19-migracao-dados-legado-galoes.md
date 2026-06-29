# Migracao de Dados Legados e Galoes - Backlog Futuro

Status: futuro, executar somente quando o MVP estiver estavel e houver decisao explicita sobre importar dados reais.

## Objetivo

Preparar uma migracao controlada do sistema legado para o Planeta Agua, incluindo clientes, enderecos e controle de galoes/validade por cliente.

## Direcao Recomendada

- Importacao via script idempotente com dry-run.
- Validacao de dados com Zod antes de gravar no banco.
- Mapeamento configuravel dos campos do legado.
- Backup obrigatorio antes de qualquer importacao real.
- Relatorio de divergencias sem expor dados sensiveis em logs.

## Pontos De Dados A Avaliar

- Clientes: nome, telefone, endereco, observacoes.
- Endereco legado: CEP, cidade, UF, numero e complemento, se existirem.
- Galoes por cliente: tipo, quantidade, validade, origem e observacoes.
- Historico operacional que precisa ou nao ser migrado.

## Itens A Implementar

- Confirmar estrutura real do banco/export legado.
- Definir mapeamento legado -> schema atual.
- Criar ou ajustar schema/migration apenas se o modelo atual nao cobrir os dados necessarios.
- Criar scripts em `apps/api/scripts/legacy-import/`.
- Criar testes de validacao e idempotencia.
- Criar documentacao em `docs/08-migracao-dados-legado.md`.

## Cuidados Obrigatorios

- Nao rodar importacao real sem backup previo.
- Nao expor telefone, endereco ou historico de clientes em logs desnecessarios.
- Nao alterar estoque ou financeiro em massa sem validacao manual.
- Nao editar migrations ja aplicadas; criar migration corretiva quando necessario.
- Preservar historico de vendas e snapshots existentes.

## Quando Retomar

Retomar quando:

- O MVP estiver em uso real ou pronto para uso paralelo.
- O formato dos dados legados estiver conhecido.
- Houver janela operacional para teste com backup e reversao.
