---
source: tests/e2e/specs/journeys/cu6-out-of-stock-between-wishlist-and-checkout.cy.ts
sha256: 794918b008ec80f5406ede91c4e62a4570f96304e2a28febdaba70690518e50d
generated_at: 2026-10-17T02:14:21.589295+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu6-out-of-stock-between-wishlist-and-checkout.cy.ts

## Purpose

End-to-end journey test for use case **CU6**: a product goes out of stock (via an admin stocktake) after the customer has saved it to their wishlist but before they move it to the cart. Verifies that adding to cart does not check stock, the cart flags the line as "Sold out" and disables the checkout button, and that removing that line unblocks the rest of the basket.

## Key elements

- **`describe('CU6 · Out of stock between wishlist and checkout')`** — single test suite containing one `it` block that walks the full journey.
- **`beforeEach`** — visits `/en`, calls `cy.restore()` to reset server state, then re-visits `/en`.
- **`it('moves a sold-out product to the cart, …')`** — the sole test. Steps:
  1. Adds `product.rich` to cart, saves `product.barebones` to wishlist.
  2. Admin API zeroes the product's `available` count via `/inventory/adjustments` (negative delta).
  3. Moves the wishlist item to cart; asserts it appears and is marked `Sold out` with `data-availability="out_of_stock"`.
  4. Asserts checkout button is disabled and no `checkout-shortfall-line` is rendered.
  5. Removes the sold-out line, asserts checkout re-enables, completes the order, and confirms only the other product was purchased.
- **`ProductLike`** — local interface (`{ available: number }`) typed for the admin `GET /products/:id` response.
- **`cy.subjectId`, `cy.subjectProduct`, `cy.apiAs`, `cy.step`, `cy.goToCart`** — custom Cypress commands (defined elsewhere) used to resolve fixture IDs, make authenticated API calls, label steps, and navigate.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports three helpers:
  - `addToCartFromStorefront` — adds a named product to the cart from the storefront.
  - `searchAndOpenProduct` — searches the product listing and navigates to the product page.
  - `idFromLocation` — extracts an ID (here, the order ID) from the browser URL after checkout.

## Notes

- The file header comment (`requires-module`) lists the server modules this journey touches: **account, cart, inventory, orders, products, wishlist**.
- The doc comment explicitly scopes out the *server-side* shortfall rejection: that path is covered by a separate "cart view stale-refusal" spec because the UI in this journey never exposes a click that would trigger it. The test asserts `checkout-shortfall-line` does **not** exist.
- Shipping method is set to **pickup** before checking the disabled button; the comment explains this is deliberate — pickup needs no address, so without a sold-out line it would satisfy the address requirement and leave the button state ambiguous.
- The stocktake uses a dynamic delta (`-free`) rather than a hard-coded number, with an `expect(free).to.be.greaterThan(0)` guard to fail loudly if the fixture has no stock.
