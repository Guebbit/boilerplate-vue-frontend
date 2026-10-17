---
source: src/modules/cart/tests/e2e/cart.cy.ts
sha256: bf4fcd27cfd1f541af4f73c988e54a292eda3527e7aa2120f99d141df8c22ca5
generated_at: 2026-10-17T00:39:38.181933+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/e2e/cart.cy.ts

## Purpose

Cypress end-to-end suite for the cart page. It verifies the full user journey against a running app: empty-cart rendering, item display, quantity stepping, item removal, cart clearing (both confirm and cancel paths), and checkout with redirect to the order page.

## Key elements

- **`readFirstItemQuantity()`** — Helper that grabs the first `[data-test=cart-item]`, extracts the numeric quantity from its "Quantity: N" label via regex, asserts it is a positive integer, and returns it. Used by the increase/decrease tests to assert the exact expected new value.
- **`describe('Cart')`** — Top-level suite. Its `beforeEach` visits `/en` and calls `cy.restore()`.
- **`describe('Empty cart')`** — Logs in as `user`, clears any residual cart, then asserts the page title, "Your cart is empty" message, absence of items/summary, and presence of a "Browse products" link.
- **`describe('Cart with items')`** — Seeds two cart lines via `cy.apiAs` (`product.inStock` × 2, `product.rich` × 1), then tests: item visibility, summary totals, decrease/increase quantity, remove-last-item, clear-cart (confirm), clear-cart (cancel), and checkout via the `pickup` shipping method.

## Relationships

No graph neighbors are registered for this file. It depends on the running application under test (the cart page at `/en/cart`, the `/cart` API endpoint, and the order page) and on custom Cypress commands (`cy.subjectId`, `cy.apiAs`, `cy.loginAs`, `cy.restore`) defined elsewhere in the project's support files.

## Notes

- Selectors are exclusively `data-test` attributes plus a few structural selectors (`#cart-page`, `#order-target`, `h1`). Avoid relying on text-only selectors when extending.
- The "Cart with items" `beforeEach` seeds state via the API (`cy.apiAs … POST /cart`) rather than clicking through the UI, so the suite doesn't depend on a pre-existing basket.
- The checkout test deliberately selects the `pickup` shipping method to avoid the address-requirement flow; it asserts the redirect URL matches `/orders/{id}` and that `#order-target` renders.
- `readFirstItemQuantity` is module-scoped (not exported); if a future test needs the quantity of a *specific* line, generalize it before reusing.
