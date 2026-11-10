---
source: tests/e2e/specs/journeys/cu6-out-of-stock-between-wishlist-and-checkout.cy.ts
sha256: 64b4c58201180490ee57f3d2023026aed1902931ffb000e187808b53c9d3a85e
signature: 956e4d7711a5cc349cb45124437c6f2bfb9c6d32cfe559d9ed1675a089762c32
generated_at: 2026-11-10T07:01:59.043153+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu6-out-of-stock-between-wishlist-and-checkout.cy.ts

## Purpose

End-to-end journey test for scenario CU6: a customer has a product in their wishlist, an admin stocktake drives its stock to zero, and the customer then moves it to the cart. Verifies that adding to cart bypasses stock checks, the cart marks the line "Sold out" and disables "Place order," and removing that line lets the rest of the basket complete checkout normally.

## Key elements

- **`ProductLike`** (interface) — minimal shape for API responses; only `available: number` is read.
- **`describe('CU6 · Out of stock between wishlist and checkout')`** — top-level suite; `beforeEach` visits `/en`, calls `cy.restore()`, then visits `/en` again to reset state.
- **`it('moves a sold-out product to the cart, …')`** — the single test. Walks through five `cy.step` milestones:
  1. Populate cart with `product.rich`; save `product.barebones` to wishlist via the storefront toggle.
  2. Admin API (`POST /inventory/levels/:id/adjust`) zeroes out all remaining units, confirmed by a follow-up GET.
  3. From `/en/wishlist`, assert the line shows `data-availability="out_of_stock"`, click move-to-cart, and confirm the item is now in the cart (2 lines total).
  4. Select `pickup` shipping (to isolate the stock issue), verify "Sold out" label, `cart-lines-need-attention` banner, disabled checkout button, and *no* `checkout-shortfall-line` element.
  5. Remove the sold-out line, confirm checkout re-enables, place the order, and assert the order contains exactly 1 item.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports three step helpers:
  - `addToCartFromStorefront(key)` — adds a fixture product to the cart from the storefront.
  - `searchAndOpenProduct(key)` — navigates the product catalog and opens a fixture product.
  - `idFromLocation()` — extracts the order ID from the post-checkout URL.

## Notes

- The test deliberately picks the `pickup` shipping method before asserting the disabled checkout button, because `pickup` requires no address and would otherwise enable the button on its own.
- The docblock explicitly states that the server-side "stale-refusal" path (a shortfall the page hasn't rendered yet) is **not** covered here; it belongs to a separate cart-view spec.
- `cy.subjectId` / `cy.subjectProduct` are custom Cucumber-style hooks that resolve fixture keys to real IDs/titles; they are not imported from `steps.ts`.
- The `free > 0` assertion in the stocktake step guards against a fixture that already starts at zero stock.
