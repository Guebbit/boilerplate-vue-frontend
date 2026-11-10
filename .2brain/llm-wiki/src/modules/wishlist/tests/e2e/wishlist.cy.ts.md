---
source: src/modules/wishlist/tests/e2e/wishlist.cy.ts
sha256: 747d0e66fdc702161d6f266c386c38717a337640f5afd43d2bd0c8bd84159a13
signature: 747d0e66fdc702161d6f266c386c38717a337640f5afd43d2bd0c8bd84159a13
generated_at: 2026-11-10T06:19:52.764985+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/tests/e2e/wishlist.cy.ts

## Purpose

Cypress end-to-end spec covering the wishlist's three user-facing behaviors: toggling the heart on a product page, the saved-list page (item links, move-to-cart), and the guest-redirect guard. Co-located inside the wishlist module so deleting the module also deletes its coverage.

## Key elements

- **`describe('Wishlist')`** — top-level suite. `beforeEach` visits `/en` and calls `cy.restore()` to reset demo state.
- **`it('the heart unsaves a product that is already saved')`** — navigates to a product the demo user has already saved (discovered via `cy.publicProducts()` + wishlist heading text), asserts the toggle reads "Saved", clicks it, asserts "Save to wishlist".
- **`it('the heart saves an unsaved product, then unsaves it')`** — queries `GET /wishlist` via `cy.apiAs`, picks a product *not* in the saved set, intercepts `POST /wishlist/items` and `DELETE /wishlist/items/*`, toggles the heart and asserts both 200 responses plus label changes.
- **`it('each saved item links to its own product page')`** — clicks the first `[data-test=wishlist-item] h2 a` link and asserts the landed page (`#product-target`) contains the item's title. Guards against links built from a title slug instead of a product id.
- **`it('lists the saved products and moves one to the cart')`** — reads current item count, clicks `wishlist-move-to-cart` on the first item, asserts count dropped by one, then visits `/en/cart` and confirms a `cart-item` exists.
- **`it('is a guarded route: guests land on the login')`** — visits `/en/wishlist` without logging in and asserts `#login-page` is present.

## Relationships

No graph neighbors recorded.

## Notes

- **Custom commands assumed globally:** `cy.publicProducts()`, `cy.loginAs()`, `cy.apiAs()`, `cy.restore()` are not imported here; they must be registered in the project's Cypress support files.
- **Two-phase title resolution:** the wishlist API returns product IDs first and titles in a second request. The "unsaves" test retries via `should()` until the heading text matches a known catalogue title rather than an ID. The "links" test similarly waits for a non-empty link text before clicking.
- **Run in both profiles:** the module docstring states the spec runs unchanged against the demo profile and the live profile (see `docs/tools/live-e2e.md`).
- **No imports:** the file relies entirely on the global `cy`/`describe`/`it`/`expect` provided by the Cypress environment.
