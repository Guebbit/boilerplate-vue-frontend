---
source: tests/e2e/specs/journeys/cu8-product-pulled-while-buying.cy.ts
sha256: 6f73e6f736f1cf2f358af0b1aff27847762d23660be36efa7e86e8b48e48f9b1
signature: 99a7577abaedfd6c9cd6e252f7e88b426509140184e79dca80bcc7b9fee33c66
generated_at: 2026-11-10T07:02:31.926563+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu8-product-pulled-while-buying.cy.ts

## Purpose

End-to-end (Cypress) test for the **CU8** journey: a product is taken off sale by an editor while a customer is mid-purchase. It verifies two distinct removal paths—soft delete and deactivation—and confirms each produces the expected cart, wishlist, and order-state consequences for the customer.

## Key elements

- **`describe('CU8 · …')`** – Top-level suite. `beforeEach` visits `/en`, calls `cy.restore()`, and revisits to reset app state between tests.
- **`it('a soft delete takes the line out of the cart and the wishlist, …')`** – Places `product.inStock` in cart and wishlist, issues `DELETE /products/:id` as editor, asserts both lines vanish, then issues `POST /products/:id/restore` and asserts the product is back on sale but absent from cart and wishlist.
- **`it('a deactivated product leaves its pending order as it was, …')`** – Places `product.barebones` in cart, checks out with `pickup` shipping, issues `PATCH /products/:id { active: false }`, confirms the order is still `pending` and that `payWith('Card that pays')` succeeds. Reactivates the product in cleanup.
- **`CartLike`** – Minimal local interface (`{ items: unknown[] }`) used only for typing the `GET /cart` API assertion.
- **Imported helpers** (`addOpenProductToCart`, `idFromLocation`, `searchAndOpenProduct`) – Convenience functions for product navigation, cart actions, and order-ID extraction (see Relationships).

## Relationships

- **`tests/support/e2e/steps.ts`** – Source of the three imported helpers:
  - `searchAndOpenProduct(name)` – navigates to the product list and opens the product by its display title (used because the target products live on category shelves longer than one page, or have no category at all).
  - `addOpenProductToCart()` – clicks the "add to cart" action on the currently open product page.
  - `idFromLocation()` – extracts the numeric ID from the current URL (used to read back the newly created order).

## Notes

- The `requires-module` header comment lists the backend modules the test touches: `account, cart, inventory, orders, payments, products, wishlist`. CI or test runners may use this to gate execution.
- Product lookup is deliberately by **title search** rather than direct URL, because the seeded products sit on category shelves too long for a single-page scroll, or have no category at all.
- The deactivation test picks the **`pickup`** shipping method specifically because it requires no address, keeping the checkout flow minimal.
- The deactivation test reactivates the product (`PATCH … { active: true }`) in its own body rather than relying on `beforeEach` restore, as a local cleanup guard.
- Custom Cypress commands used throughout (`cy.apiAs`, `cy.loginAs`, `cy.payWith`, `cy.step`, `cy.subjectId`, `cy.subjectProduct`, `cy.goToCart`) are not defined in this file; they are registered elsewhere in the test support layer.
