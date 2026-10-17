---
source: src/modules/inventory/tests/e2e/preorders.cy.ts
sha256: bb343cc9f4173816c2e3878423b9de0e600530d8a0f8da60ecce38ff947bf4fc
generated_at: 2026-10-17T00:59:59.673580+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/e2e/preorders.cy.ts

## Purpose

Cypress e2e spec for the staff preorder board (`/en/sales/preorders`). It verifies the page-level concerns — tab visibility, tab persistence in the URL, the Late / Due-soon filter toggles, and that a non-admin customer is bounced back to home. It does **not** assert which orders are late; that rule belongs to the backend and is covered by its own tests.

## Key elements

- **`describe('Preorders board')`** — root suite; visits `/en` and calls `cy.restore()` before every test.
- **`describe('as an administrator')`** — logs in as `admin`, navigates to the preorders board, and runs three tests:
  - *Offers the two tabs, products first* — asserts both `[data-test=preorders-tab-*]` elements exist and the products tab is visible by default.
  - *Opens the fulfillment orders and keeps the tab in the URL* — clicks the orders tab, checks `tab=orders` appears in the URL, reloads, and confirms the orders tab is still active.
  - *Offers the Late and Due-soon views and lets each be switched off again* — toggles each filter checkbox on and off using `{ force: true }`.
- **`describe('as a customer')`** — logs in as `user`, visits the preorders URL, and asserts the browser lands on `#home-page` at pathname `/en`.

## Relationships

No graph neighbors are recorded for this file. It relies entirely on globally-registered Cypress commands (`cy.loginAs`, `cy.restore`) and the running application under test; it imports nothing.

## Notes

- Selectors are `data-test` attributes plus two page-level IDs (`#preorders-board-page`, `#home-page`); keep them in sync if the frontend refactors.
- Checkbox interactions use `{ force: true }`, meaning the tests bypass Cypress's actionability checks — if the UI changes to make those inputs conditionally disabled, these lines will silently pass.
- The module doc comment makes clear this file is **typed and linted** as part of the normal TS pipeline but is only **executed** during the live e2e pass, not in unit/integration CI.
- `cy.restore()` is called unconditionally in the outer `beforeEach`; it is assumed to be a custom command that resets backend state.
