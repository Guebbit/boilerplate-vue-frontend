---
source: tests/e2e/specs/journeys/ps2-the-buyer-preorders.cy.ts
sha256: 40098af1276091674a7f72b2185e61ea51f3c57a1d9f49e40d875fe2915b5534
generated_at: 2026-10-17T02:22:28.007281+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ps2-the-buyer-preorders.cy.ts

## Purpose

End-to-end test for the buyer preorder journey (PS2). Verifies that a product with a future release date and an open preorder allowance is purchasable as a preorder: the product page offers "Preorder", the cart line labels it as such, and the placed order displays the ship date. Exists to guard the full cross-role flow (editor creates, admin opens allowance, customer buys) in a single browser session.

## Key elements

- **`unique()`** – Returns a timestamp + random suffix string; used in the product name to prevent collisions when multiple spec runs share one backend.
- **`OrderLike`** (interface) – Minimal shape the test reads from the checkout response (`id`, `items[].product.preorder`).
- **`describe('PS2 · The buyer preorders')`** – Single test case that walks the full journey:
  1. Editor creates a product via form with a release date 60 days out.
  2. Admin opens the preorder allowance (`PUT /inventory/levels/{id}/preorder-limit`).
  3. Customer sees "Preorder" on the product page and a release-date element.
  4. Customer adds the product to cart; cart line availability text contains "Preorder".
  5. Customer picks pickup shipping and checks out; order item has `preorder: true` and the order page shows "ships from".

## Relationships

- **`tests/support/e2e/steps.ts`** – Imports four helpers used directly in the test body:
  - `createProductThroughTheForm(name, releaseDate)` – drives the admin form to create a product and yields its ID.
  - `releaseDateIn(days)` – computes an ISO date `days` in the future.
  - `addOpenProductToCart()` – clicks the add-to-cart button on the current product page.
  - `checkoutAs<User>(user)` – completes checkout via the UI and resolves with the order object (generic over the expected response shape).

## Notes

- The file header states it was **written against live pages but not yet executed in a browser**; selectors (all `data-test=` attributes) may need adjustment on first run.
- Requires the backend modules: `account`, `cart`, `inventory`, `orders`, `products` (see `requires-module` comment).
- `beforeEach` calls `cy.restore()` between the initial and subsequent `cy.visit('/en')` calls to reset persisted state (auth, cart, etc.) for a clean slate.
- Role switching is done with `cy.switchUser('user')` rather than a fresh login; the admin API call for the preorder limit uses `cy.apiAs` (direct HTTP, not UI).
- The test is intentionally a single linear `it` block (not split into multiple tests) because the steps are tightly stateful on the same browser session.
