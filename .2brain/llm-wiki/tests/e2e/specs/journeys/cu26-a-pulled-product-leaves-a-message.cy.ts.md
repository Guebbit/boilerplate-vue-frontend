---
source: tests/e2e/specs/journeys/cu26-a-pulled-product-leaves-a-message.cy.ts
sha256: fb69d43cce460811580f4e828bba19b6536611a0d19862476c554c34323b230c
signature: fb69d43cce460811580f4e828bba19b6536611a0d19862476c554c34323b230c
generated_at: 2026-11-10T06:58:13.251443+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu26-a-pulled-product-leaves-a-message.cy.ts

## Purpose

Cypress E2E journey test for scenario **CU26**: an editor soft-deletes a product that a customer has in both their cart and wishlist. Verifies that the customer receives a live toast, the bell badge increments to 2, both notifications persist across reloads, individual deletion is permanent, and "Clear all" empties the bell — all without a page refresh for the initial delivery.

## Key elements

- **`BELL`, `BADGE`, `ROWS`** — CSS selector constants for the notification bell button, unread-count badge, and panel list rows.
- **`describe('CU26 · …')` / single `it`** — One end-to-end test walked through six `cy.step` blocks:
  1. Seed cart + wishlist state for the logged-in customer.
  2. Editor issues `DELETE /products/:id` via `cy.apiAs`; asserts toast text and badge = "2".
  3. Confirms cart and wishlist items are gone.
  4. Opens the bell; asserts both rows, product title, and both "Removed from…" messages; badge disappears.
  5. Reload → messages still present (already read).
  6. Delete one row (persists after reload), then "Clear all" (persists after reload).
- **Cleanup** — `cy.apiAs('editor', 'POST', '/products/:id/restore')` re-inserts the product so the seed is reusable.

## Relationships

- **`tests/support/e2e/steps.ts`** — Imports `searchAndOpenProduct` (navigates to a product page by search) and `addOpenProductToCart` (adds the currently-open product to the cart). No other cross-file dependencies.

## Notes

- The editor's action is performed **via the API** (`cy.apiAs`), not the admin UI, per the module docstring ("the editor works through the API").
- `beforeEach` calls `cy.visit('/en')`, then `cy.restore()`, then `cy.visit('/en')` again — the restore reseeds fixtures between runs.
- Relies on seeded subjects (`cy.subjectId('product.inStock')`, `cy.subjectProduct('product.inStock')`) that already exist in the wishlist for the `user` account; only the cart entry is added by the test.
- The `requires-module` header comment (`account, cart, notifications, products, wishlist`) is a convention for the test runner to gate on installed feature modules.
- Badge assertion uses `contain.text('2')` (string), not a numeric equality — brittle if the UI ever changes the format.
