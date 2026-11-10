---
source: tests/e2e/specs/journeys/op39-a-new-product-arrives-with-its-first-count.cy.ts
sha256: fa86ad6134f57385040bd87965aa2bc8eca61dff2a9317dec91f24f6edbf96e6
signature: 56368f3a149c299ee9ae3030098a64bf241422ea4ddc7a912a0e7a79a52a1e02
generated_at: 2026-11-10T07:18:19.532605+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op39-a-new-product-arrives-with-its-first-count.cy.ts

## Purpose

Cypress end-to-end test for journey **OP39**: an admin creates a new product (with an opening quantity of 7) through the product form, and the spec verifies that the inventory board reflects 7 on-hand / 0 reserved / 7 available and that the movement ledger contains exactly one "Received" row for that product. It exists to guard the combined product-creation + initial-count flow across the `account`, `inventory`, and `products` modules.

## Key elements

- **`unique()`** – Returns a `${Date.now()}-${random}` string so two concurrent spec runs against the same backend cannot collide on product names.
- **`beforeEach`** – Visits `/en`, calls `cy.restore()`, then revisits `/en` to establish a clean session before each test.
- **`it('creates the product and receives seven units')`** – The sole test case. It:
  1. Logs in as admin, fills the product-creation form (title, price `9.90`, on-hand `7`, sample image), submits, and asserts the URL navigates away from `/create`.
  2. Visits `/en/inventory`, locates the row by title via `[data-test=level-row]`, and asserts the three numeric cells equal `[7, 0, 7]`.
  3. Filters the movement list by the generated product title and asserts exactly one row with reason text "Received".

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The `// requires-module: account, inventory, products` comment is a convention flagging which backend modules must be running before the spec executes.
- Assertions are deliberately scoped to "what holds on screen" (field values and stock numbers) rather than checking intermediate API calls, per the module docstring.
- The product title is intentionally unique per run (`OP39 lamp ${unique()}`) to avoid name collisions when multiple specs target the same backend instance.
- `cy.restore()` in `beforeEach` implies a shared Cucumber-style state-management layer; the exact mechanism lives elsewhere in the test support code.
