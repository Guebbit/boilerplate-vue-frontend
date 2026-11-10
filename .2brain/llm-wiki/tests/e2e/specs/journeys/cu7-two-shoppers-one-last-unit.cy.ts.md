---
source: tests/e2e/specs/journeys/cu7-two-shoppers-one-last-unit.cy.ts
sha256: 194c9a154352925c3295c9ad265e2c74591d698045c622eeca7523a07729b28a
signature: 0e189af982d73a5780bae88e4061fae4768fc466d3efcad47072120704523b5e
generated_at: 2026-11-10T07:02:09.681766+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu7-two-shoppers-one-last-unit.cy.ts

## Purpose

End-to-end journey test (CU7) that verifies concurrent-availability semantics: when two shoppers both have the last unit of a product in their carts, the first checkout holds it, the second shopper's cart line flips to "Sold out" and the checkout button disables, and once the first order is cancelled the hold releases so the second shopper can complete checkout successfully.

## Key elements

- **`ProductLike`** — minimal interface (`{ available: number }`) used to type the admin API response when asserting stock.
- **`expectAvailable(productId, units)`** — helper that calls `cy.apiAs('admin', 'GET', /products/:id)` and asserts the `available` count matches expectations.
- **`describe('CU7 · Two shoppers, one last unit')`** — the suite; `beforeEach` visits `/en`, calls `cy.restore()`, and revisits to reset page state.
- **`it('the second shopper is held back…')`** — single test case walking through five steps (both add to cart → first checks out → second sees "Sold out" + disabled button → first cancels → second checks out), using `cy.subjectId`/`cy.subjectProduct` for the seeded `product.lowStock` fixture and `cy.switchUser` to hop between `user` and `secondShopper`.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports `addToCartFromStorefront` (adds the product to the cart via the storefront UI) and `idFromLocation` (extracts the new order ID from the post-checkout URL).

## Notes

- The `// requires-module: account, cart, inventory, orders, products` comment at the top lists the backend modules this journey exercises; the test harness likely gates execution on those being available.
- Stock verification is always done via the **admin API** (`cy.apiAs`), not by scraping the storefront page — the page's `data-test=product-stock` flag is only checked for the human-visible "In stock" / "Out of stock" text.
- Adding an item to the cart intentionally **does not** check stock; the constraint surfaces only at checkout (hold) or in the cart-line availability badge.
- The test selects the **pickup** shipping method to avoid needing a shipping address; the customer's default billing address covers the invoice requirement.
- The second shopper is the seeded `secondShopper` fixture whose address book supplies the billing address needed at checkout.
