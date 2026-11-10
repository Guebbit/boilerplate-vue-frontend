---
source: src/modules/inventory/tests/e2e/preorders.cy.ts
sha256: bb343cc9f4173816c2e3878423b9de0e600530d8a0f8da60ecce38ff947bf4fc
signature: bb343cc9f4173816c2e3878423b9de0e600530d8a0f8da60ecce38ff947bf4fc
generated_at: 2026-11-10T04:33:30.066452+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/e2e/preorders.cy.ts

## Purpose

Cypress end-to-end spec for the staff preorder board (`/en/sales/preorders`). It verifies the page-level concerns only: that the two tabs render, that the active tab persists in the URL, that the Late and Due-soon filters can be toggled, and that a non-staff customer is redirected to the home page. Lateness business rules are tested elsewhere in the backend.

## Key elements

- **`describe('Preorders board')`** — Top-level suite. `beforeEach` visits `/en` then calls `cy.restore()` to reset DB state.
- **`describe('as an administrator')`** — Logs in via `cy.loginAs('admin')`, navigates to the preorders route, and asserts the `#preorders-board-page` root exists.
  - *"offers the two tabs, products first"* — Asserts both `preorders-tab-products` and `preorders-tab-orders` exist, and that the products panel is visible by default.
  - *"opens the fulfillment orders and keeps the tab in the URL"* — Clicks the orders tab, asserts `tab=orders` in the URL, reloads, and confirms the orders panel survives the reload.
  - *"offers the Late and Due-soon views and lets each be switched off again"* — Toggles the `preorder-filter-late` and `preorder-filter-due-soon` checkboxes on and off.
- **`describe('as a customer')`** — Logs in as a plain `user`, visits the preorders URL, and asserts the `#home-page` is shown with pathname `/en` (i.e. the board is inaccessible).

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The spec relies on custom Cypress commands (`cy.loginAs`, `cy.restore`) defined elsewhere in the project; they are not imported as module dependencies and do not appear in the graph.
- Checkbox assertions use `{ force: true }` — the inputs are likely covered by a styled label or wrapper that would otherwise block the click; this is a workaround, not a bug signal.
- The file is "typed and linted here" (per the module doc comment) but is *executed* by a separate live e2e pass, not by the unit/integration test runner. Running it in isolation without a live backend and seeded fixtures will fail.
- All selectors are `data-test` attributes; there are no class- or id-based selectors, which is the project convention for stable e2e targeting.
- `cy.restore()` in the outer `beforeEach` implies a fixture-teardown helper; tests are not idempotent without it.
