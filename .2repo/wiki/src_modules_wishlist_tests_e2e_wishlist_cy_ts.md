# src/modules/wishlist/tests/e2e/wishlist.cy.ts

## Purpose

Cypress end-to-end spec covering the full wishlist user flow: toggling the heart on a product page, browsing the saved list, following a saved item's link to its product page, moving an item to the cart, and confirming guests are redirected to login. It lives co-located with the wishlist module so that deleting the module also deletes its coverage.

## Key elements

- **`describe('Wishlist')`** — top-level suite; `beforeEach` visits `/en` and calls `cy.resetState()` to start each test from a clean state.
- **`it('the heart saves and unsaves from the product page')`** — navigates to the wishlist, resolves the first saved item's title to a product ID via `cy.publicProducts()`, visits that product page, then asserts the `wishlist-toggle` button flips between "Saved" and "Save to wishlist".
- **`it('each saved item links to its own product page')`** — clicks (not reads) the first item's title link on the wishlist and asserts the landing page (`#product-target`) exists and displays the same title. Guards against links built from a title string rather than a product ID.
- **`it('lists the saved products and moves one to the cart')`** — reads the current item count, clicks the first `wishlist-move-to-cart`, asserts the count drops by one, then verifies a `cart-item` exists at `/en/cart`.
- **`it('is a guarded route: guests land on the login')`** — visits `/en/wishlist` without logging in and asserts `#login-page` is present.

## Relationships

No external module dependencies are imported; the file relies entirely on globally registered Cypress commands (`cy.resetState`, `cy.loginAs`, `cy.publicProducts`) and DOM `data-test` selectors within the wishlist and product modules.

## Notes

- The wishlist API returns product **IDs** first and fetches titles in a second request, so an item's heading briefly reads as a raw ID. Tests use retrying `should` assertions to wait for the resolved title rather than one-shot reads.
- The "link" test deliberately **clicks** the anchor instead of asserting its `href`, because a title-based URL (e.g. `/en/products/Wireless%20Headphones`) would 404 silently if the test only checked the attribute string.
- The "move to cart" test reads the starting item count dynamically instead of asserting a fixed seed number, so it remains valid if the demo fixture changes.
- Runs unchanged against both the demo profile and the live profile (see `docs/tools/live-e2e.md`).
