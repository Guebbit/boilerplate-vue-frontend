# src/modules/orders/tests/e2e/orders.cy.ts

## Purpose

Cypress end-to-end spec that exercises the Orders list page in a real browser. It verifies that an admin sees full row actions (View, Edit, Delete, Hard delete) and can navigate to order detail, while a non-admin customer sees only the View action. It exists to guard the orders list rendering, per-role action visibility, and navigation behavior.

## Key elements

- **`describe('Orders')`** — top-level block; calls `cy.visit('/en')` and `cy.resetState()` before every test.
- **`describe('Orders list')`** — admin-role tests; logs in as `admin`, visits `/en/orders`, waits for at least one `[data-test=list-row]`.
  - *Page title & row count* — asserts `#orders-list-page` exists, `h1` contains "My Orders", ≥ 1 row.
  - *Status & total* — first row must contain a status keyword (pending/paid/processing/shipped/delivered/cancelled) and a numeric total.
  - *Admin row actions* — asserts `[data-test=row-view]`, `row-edit`, `row-delete`, `row-hard-delete` all exist in the first row.
  - *View navigation* — clicks View, asserts URL includes `/orders/` and `#order-target` exists.
- **`describe('Orders list — a non-admin customer')`** — creates a fresh order via `cy.createOrder('user')`, logs in as `user`, asserts only `row-view` exists and the other three actions do **not**.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- **Custom commands** — `cy.resetState()`, `cy.loginAs(role)`, and `cy.createOrder(account)` are project-level Cypress commands (defined elsewhere); they encapsulate fixture seeding, authentication, and order creation.
- **Why `cy.createOrder` is needed** — the seeded `user` account's own order fixture is soft-deleted (see `orders/demo.ts`), so the non-admin block must create a fresh order rather than rely on seed data.
- **Pattern reference** — the per-role visibility model mirrors `src/modules/products/tests/e2e/products.cy.ts`.
- **Selectors** — all DOM assertions use `data-test` attributes (e.g. `list-row`, `row-view`, `row-edit`), not class names or text, to stay resilient to styling changes.
- **Timeout** — row assertions use an explicit `{ timeout: 10_000 }` to accommodate slower API responses after `cy.visit`.
