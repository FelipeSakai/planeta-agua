# Stock Module Design

## Goal

Build the MVP stock module so authenticated users can inspect current stock and stock history, while only `ADMIN` users can perform manual stock changes.

This module prepares the system for sales by making product stock reliable and auditable before automatic sale stock deductions are implemented.

## Scope

Included:

- `/estoque` page for current stock and recent movement history.
- Stock summary with total products, low-stock products, and total units in stock.
- Product stock list showing current quantity, minimum stock, active status, and low-stock state.
- Recent `stock_movements` list.
- Manual stock entry by quantity for `ADMIN` users.
- Manual absolute stock adjustment for `ADMIN` users.
- Server-side permission enforcement.
- Transactional stock updates and movement creation.

Not included:

- Sales screen.
- Automatic stock deduction from sales.
- Sale cancellation stock return.
- Advanced inventory valuation, batch tracking, supplier control, or reports.
- Deleting or editing historical stock movements.

## Permissions

- `ADMIN` can view stock, view movement history, register stock entries, and register stock adjustments.
- `OPERATOR` can view stock and movement history, but cannot mutate stock.
- API mutations must reject non-admin users even if the UI hides controls.

## Domain Rules

### Stock Entry

Use stock entry when products arrive or are added manually.

- Input: `productId`, `quantity`, `reason`.
- `quantity` must be an integer greater than zero.
- `reason` is required and must be meaningful text.
- Operation increases `products.stock_quantity` by `quantity`.
- Operation creates `stock_movements` with:
  - `type`: `IN`;
  - `quantity`: positive quantity entered;
  - `reason`: operator-provided reason;
  - `reference_id`: `null` for manual entries.

### Absolute Stock Adjustment

Use adjustment when the physical count differs from the system count.

- Input: `productId`, `newQuantity`, `reason`.
- `newQuantity` must be an integer greater than or equal to zero.
- `reason` is required and must be meaningful text.
- Service reads the current product stock inside the transaction.
- Operation sets `products.stock_quantity` to `newQuantity`.
- Operation creates `stock_movements` with:
  - `type`: `ADJUSTMENT`;
  - `quantity`: `newQuantity - previousQuantity`;
  - `reason`: operator-provided reason;
  - `reference_id`: `null` for manual adjustments.
- Adjustment movement quantity can be positive, zero, or negative. This records the correction delta while the product row stores the final balance.

### Movement History

- Stock movements are immutable operational history.
- Manual entry and manual adjustment must always create a movement.
- Sale and cancellation movements remain reserved for the sales module.
- History should show newest movements first.

## Data Model

No new database table is required.

Existing tables used:

- `products`: current stock balance lives in `stock_quantity`.
- `stock_movements`: immutable history for every stock change.

Existing movement enum values used now:

- `IN` for manual stock entries.
- `ADJUSTMENT` for absolute corrections.

Existing movement enum values reserved for later:

- `SALE` for completed sales.
- `CANCELED_SALE` for canceled sales.
- `OUT` remains available but is not needed in this MVP stock screen because negative corrections are represented by `ADJUSTMENT`.

## API Design

Nest owns stock business rules and database access.

Endpoints:

- `GET /stock`
  - Requires authenticated user.
  - Returns stock products, summary, and recent movements.
  - Available to `ADMIN` and `OPERATOR`.

- `POST /stock/entries`
  - Requires authenticated `ADMIN`.
  - Registers manual stock entry.
  - Returns updated product and created movement.

- `POST /stock/adjustments`
  - Requires authenticated `ADMIN`.
  - Registers absolute stock adjustment.
  - Returns updated product and created movement.

API response should avoid exposing unnecessary customer or financial data. This module only returns product and stock movement data.

## Shared Contracts

`packages/shared` should expose stock schemas and response types used by API and web.

Recommended contracts:

- `stockEntrySchema`
- `stockAdjustmentSchema`
- `stockProductSchema`
- `stockMovementSchema`
- `stockPageResponseSchema`

The stock movement response should include enough display information to avoid extra frontend lookups:

- movement id;
- product id;
- product name;
- user id;
- user name;
- type;
- quantity delta;
- reason;
- created date.

## Backend Architecture

Add a stock feature module under `apps/api/src/modules/stock`.

Suggested files:

- `stock.schemas.ts`: API-local exports from shared schemas.
- `stock.repository.ts`: product lookup, product stock update, movement insert, movement list.
- `stock.service.ts`: permission checks, validation, transactions, response mapping.
- `stock.controller.ts`: request parsing and route handlers.
- `stock.module.ts`: Nest wiring.

Transaction boundaries:

- Entry and adjustment must be single database transactions.
- Product update and movement insert must commit or rollback together.
- Adjustment must calculate the delta from the product row read inside the same transaction.

## Web Architecture

Next does not access PostgreSQL directly.

Add same-origin route handlers under `apps/web/src/app/api/stock`:

- `GET /api/stock` proxies to `GET /stock`.
- `POST /api/stock/entries` proxies to `POST /stock/entries`.
- `POST /api/stock/adjustments` proxies to `POST /stock/adjustments`.

Add `/estoque` page under the protected app route group.

The page should:

- require authenticated user;
- forward cookies to the API;
- render stock summary, product stock list, and recent movements;
- pass `user.role` to the client UI so mutation controls are hidden for operators.

## UI Design

The first version should prioritize operational clarity over animation or polish.

Layout:

- Header: page title and short helper text.
- Summary cards:
  - total products;
  - products below minimum stock;
  - total units in stock.
- Main stock list:
  - product name;
  - active/inactive label;
  - current stock;
  - minimum stock;
  - low-stock badge when `stock_quantity <= minimum_stock`.
- Admin action panel:
  - entry form;
  - adjustment form;
  - product selector, quantity field, and reason field.
- Recent movement list:
  - product name;
  - movement type label;
  - quantity delta;
  - reason;
  - user name;
  - created date.

Operator UI:

- Shows summary, product stock list, and movement history.
- Does not show entry or adjustment forms.

Admin UI:

- Shows all read-only information.
- Shows entry and adjustment forms.
- Disables submit while request is in flight to avoid duplicate stock updates.
- Shows clear error messages for invalid data or permission errors.

## Error Handling

Backend errors:

- unauthenticated request: `UnauthorizedException("Sessao invalida.")`;
- non-admin mutation: `ForbiddenException("Voce nao tem permissao para alterar estoque.")`;
- invalid payload: `BadRequestException("Dados do estoque invalidos.")`;
- invalid product id: `BadRequestException("Produto invalido.")`;
- missing product: `NotFoundException("Produto nao encontrado.")`.

Frontend errors:

- invalid form input: show a concise message asking the user to check quantity and reason;
- API failure: show an operator-friendly message without stack trace;
- errors should use accessible alert semantics.

## Testing Strategy

Shared tests:

- entry schema accepts positive quantity and reason;
- entry schema rejects zero/negative quantity;
- adjustment schema accepts zero final quantity;
- adjustment schema rejects negative final quantity;
- blank reason is rejected.

API service/repository tests:

- `ADMIN` can create stock entry and product stock increases;
- `OPERATOR` cannot create stock entry;
- `ADMIN` can create absolute adjustment and movement records delta;
- missing product throws not found;
- entry and adjustment use transactions;
- stock list marks low-stock products.

API controller tests:

- invalid product id returns bad request;
- invalid payload returns bad request;
- authenticated list delegates to service;
- mutation passes authenticated user to service.

Web helper/UI tests:

- operator does not see mutation controls;
- admin sees entry and adjustment controls;
- stock form payload parsing rejects invalid quantities and blank reason;
- low-stock badge appears for low-stock products.

Verification commands:

- `pnpm --filter shared test`
- `pnpm --filter api test`
- `pnpm --filter web test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

## Success Criteria

- Admin can register stock entry from the UI and see updated stock after refresh.
- Admin can set an absolute physical stock count and see the adjustment movement.
- Operator can consult stock and history but cannot alter stock.
- Every manual stock change creates a `stock_movements` row.
- Stock mutations are transactional.
- Products below minimum stock are visible on the stock page.
- The web app still has no direct database dependency.
