# src/modules/orders/tests/e2e/orders.cy.ts

## Purpose

Cypress end-to-end spec that exercises the Orders list page in a real browser session. It logs in as an admin, loads `/en/orders`, and asserts that rows render with the expected status text, totals, and action buttons, and that the View action navigates to the order detail route.

## Key elements

- **`describe('Orders')`** – Top-level suite; `beforeEach` visits `/en` and calls `cy.resetState()`.
- **`describe('Orders list')`** – Nested suite; `beforeEach` logs in as `admin`, navigates to `/en/orders`, and waits (10 s timeout) for at least one `[data-test=list-row]`.
- **"shows the page title"** – Asserts `#orders-list-page` exists and `<h1>` contains "My Orders".
- **"renders one row per order returned by the API"** – Verifies `≥ 1` row element is present.
- **"displays order status and total in rows"** – Inside the first row, checks for a status keyword (pending/paid/processing/shipped/delivered/cancelled) and a numeric value.
- **"shows View, Edit, Delete and Hard delete actions per row"** – Asserts all four `data-test=row-*` buttons exist in the first row.
- **"navigates to order detail when clicking View"** – Clicks `row-view` on the first row, asserts the URL includes `/orders/` and `#order-target` is present.

## Relationships

No graph neighbors are registered for this file. It is a terminal consumer that only depends on the running application (served at `/en`) and Cypress custom commands (`cy.resetState`, `cy.loginAs`).

## Notes

- **Custom commands:** `cy.resetState()` and `cy.loginAs('admin')` are not part of standard Cypress; they must be registered in a support/commands file before this spec runs.
- **Selectors are `data-test`-driven:** All element queries rely on `data-test` attributes (`list-row`, `row-view`, `row-edit`, `row-delete`, `row-hard-delete`). Renaming or removing these attributes in the UI will break the spec without a TypeScript error.
- **Only the first row is inspected:** Every row-level assertion uses `.eq(0)`. If the API returns zero orders the `beforeEach` guard catches it, but the spec does not verify exact row count.
- **Navigation assertion is loose:** The detail-page check is `cy.url().should('include', '/orders/')` plus the presence of `#order-target`; it does not verify a specific order id in the URL.
