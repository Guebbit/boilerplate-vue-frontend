---
source: tests/e2e/specs/journeys/cu8-product-pulled-while-buying.cy.ts
sha256: 6f73e6f736f1cf2f358af0b1aff27847762d23660be36efa7e86e8b48e48f9b1
generated_at: 2026-10-17T02:14:42.589736+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu8-product-pulled-while-buying.cy.ts

## Purpose

End-to-end journey test (CU8) verifying two distinct paths for what happens when an editor pulls a product while a customer is mid-purchase. Path 1 (soft delete) asserts the product vanishes from both cart and wishlist and that a subsequent restore brings it back on sale but *not* back into either list. Path 2 (deactivation) asserts an already-placed pending order retains its line and can still be paid successfully.

## Key elements

- **`describe('CU8 · The product is pulled while I am buying it')`** – top-level suite; `beforeEach` visits `/en`, calls `cy.restore()`, and re-visits.
- **`it('a soft delete takes the line out of the cart and the wishlist…')`** – adds a seeded product (`product.inStock`) to cart, soft-deletes it via `DELETE /products/:id`, confirms removal from cart and wishlist, then restores via `POST /products/:id/restore` and confirms it is on sale again but still absent from both lists.
- **`it('a deactivated product leaves its pending order as it was…')`** – adds `product.barebones` to cart, checks out with *pickup* shipping, then deactivates the product via `PATCH /products/:id { active: false }`. Verifies the order is still `pending`, pays with "Card that pays", asserts `Succeeded`, and re-activates the product.
- **`CartLike`** – minimal shape (`items: unknown[]`) used to type the cart API response assertion.
- **Imports from `steps.ts`** – `addOpenProductToCart`, `idFromLocation`, `searchAndOpenProduct`.

## Relationships

- **`tests/support/e2e/steps.ts`** – provides the three helper commands used here: `searchAndOpenProduct` (navigates the product list and opens a product by name), `addOpenProductToCart` (clicks the add-to-cart button on the open product page), and `idFromLocation` (extracts an order ID from the current URL after checkout).

## Notes

- The editor's actions are performed exclusively through `cy.apiAs('editor', …)` calls; the customer's UI pages are the assertion target.
- `product.inStock` is searched by title rather than category because its category list exceeds one page. `product.barebones` has no category at all, so title search is the only viable navigation path.
- The soft-delete test relies on the seeded user already having `product.inStock` in their wishlist; only the cart line is added explicitly.
- Checkout uses the *pickup* shipping method specifically because it requires no address, so the checkout button becomes enabled without additional form input.
- The deactivation test re-activates the product (`PATCH … { active: true }`) at the end to leave the shop in a clean state.
