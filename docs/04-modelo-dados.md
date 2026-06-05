# Modelo Inicial de Dados

## users

- id;
- name;
- email;
- password_hash;
- role: `ADMIN` ou `OPERATOR`;
- is_active;
- created_at;
- updated_at.

## customers

- id;
- name;
- phone;
- address;
- notes;
- created_at;
- updated_at.

## products

- id;
- name;
- description;
- sale_price_cents;
- stock_quantity;
- minimum_stock;
- is_active;
- created_at;
- updated_at.

## sales

- id;
- customer_id;
- user_id;
- total_amount_cents;
- payment_method: `CASH`, `PIX`, `CREDIT_CARD`, `DEBIT_CARD`, `OTHER`;
- status: `COMPLETED` ou `CANCELED`;
- created_at;
- updated_at.

## sale_items

- id;
- sale_id;
- product_id;
- product_name_snapshot;
- quantity;
- unit_price_cents;
- total_price_cents;
- created_at.

## stock_movements

- id;
- product_id;
- user_id;
- type: `IN`, `OUT`, `ADJUSTMENT`, `SALE`, `CANCELED_SALE`;
- quantity;
- reason;
- reference_id;
- created_at.

## expenses

- id;
- description;
- amount_cents;
- category;
- payment_method;
- date;
- created_by;
- created_at;
- updated_at.

## Observacoes

- Valores financeiros devem ser salvos em centavos.
- `sale_items` deve guardar nome e preco do produto no momento da venda.
- Produto com historico nao deve ser deletado fisicamente.
- Venda cancelada deve permanecer no historico.
- Movimentacao de estoque deve ser imutavel depois de criada, exceto em caso de correcao com nova movimentacao.
