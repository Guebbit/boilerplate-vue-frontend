---
source: tests/e2e/specs/journeys/cu18-the-wishlist-from-both-doors.cy.ts
sha256: 1de8216ee329cb53eeba7149ea2ee84560d97db0122592bdf948c68fa89e2351
generated_at: 2026-10-17T02:10:43.340719+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu18-the-wishlist-from-both-doors.cy.ts

## Purpose

End-to-end journey test (CU18) that verifies wishlist state consistency across three UI surfaces—grid card, product detail page, and the dedicated wishlist page—and confirms that "move to cart" adds quantity on top of an existing cart line rather than replacing it. All assertions about list contents are read back from the API for the same account. No payment step is exercised.

## Key elements

- **`SAVED` / `NOT_SAVED`** — String constants (`"Saved"`, `"Save to wishlist"`) representing the two states of the wishlist toggle button.
- **`WishlistBody`** — Interface describing the API's wishlist response shape: `{ items: { productId: string }[] }`.
- **`searchProducts(title)`** — Types a title into the product-filter input and asserts the matching card is visible.
- **`describe('CU18 · The wishlist, from both doors')`** — Single test suite; `beforeEach` visits `/en`, restores state, revisits.
- **`it('the heart agrees on the card…')`** — The sole journey: save from card → verify on detail page → verify on wishlist page → remove all → verify empty state + API → add a product to cart → save two products from cards → move one to cart → assert cart quantity is 2.

## Relationships

- **`tests/support/e2e/steps.ts`** — Imports `addOpenProductToCart` and `searchAndOpenProduct`, which encapsulate the open-product / add-to-cart interaction sequence used in the middle of the journey.
- **`src/modules/cart/tests/guest-cart-view.spec.ts`, `src/modules/inventory/tests/movement-ledger.spec.ts`, `src/modules/products/tests/product-lines.spec.ts`, `src/modules/products/tests/products-list-view.spec.ts`** — Unit/integration tests covering the same domain modules (cart, inventory, products) that this journey exercises at the UI level; no direct code import, shared concern only.

## Notes

- Requires the `cart`, `inventory`, `products`, and `wishlist` modules to be active (per the `requires-module` comment).
- Uses `cy.subjectProduct('product.barebones')` and `cy.subjectProduct('product.rich')` as fixture providers; the specific products must exist in the seed data.
- `cy.intercept('PUT', …)` is registered once and aliased `@save`; every subsequent wishlist save in the journey reuses that alias via `cy.wait('@save')`.
- The "move to cart" assertion checks that the cart line quantity equals **2** (1 pre-existing + 1 moved), not 1—this is the key behavioral claim of the journey.
- `for (const title of [food.title, bottle.title])` saves two products in a loop; both are expected to hit the same intercepted PUT route.
