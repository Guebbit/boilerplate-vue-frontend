---
source: tests/e2e/specs/journeys/cu33-taken-off-sale-at-the-till.cy.ts
sha256: 3a73641dad216d8e00b7373f4e75ad5e842af5d39c9a0e7c2868372e2b17d09d
signature: 966dfaced3556315483748616cc442715d08f860d15fd524866c1b3594dabe05
generated_at: 2026-11-10T07:00:29.592537+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu33-taken-off-sale-at-the-till.cy.ts

## Purpose

Cypress E2E journey test (CU33) verifying that a product which cannot be bought right now—either taken off sale (`purchasable: false`) or deactivated (`active: false`)—is clearly marked across every shopper-facing surface (product card, product page, wishlist, cart) and that checkout either names the offending line and writes no order, or lets the remaining basket through once that line is removed.

## Key elements

- **`CartLike`** – minimal cart shape (`items: { productId }[]`) used for API assertions.
- **`OrdersLike`** – minimal order-list shape used to count how many orders a customer holds.
- **`NOT_AVAILABLE`** – the exact UI string (`"Not available right now"`) asserted in card, page, wishlist, and cart contexts.
- **`ordersHeld()`** – helper that fetches `GET /orders?pageSize=50` as the customer and returns a `Cypress.Chainable<number>` of the current order count; used before/after a checkout attempt to prove no order was written.
- **`describe('CU33 · Taken off sale at the till')`** – three test cases:
  1. *Off-sale product on card, page, wishlist, cart* – guest sees the marker and a disabled add button; signed-in user sees it in wishlist and cart, with checkout disabled until the line is removed.
  2. *Taken off sale behind an open page* – editor PATCHes `purchasable: false`; checkout click yields a named shortfall line; no order is written; reload shows the marker; removing the line lets the rest complete.
  3. *Deactivated behind an open page* – editor PATCHes `active: false`; add-to-cart is refused; after reload the cart and wishlist lines read `"No longer available"` with `data-availability="removed"`; editor reactivates to restore state.

## Relationships

No graph neighbors recorded.

## Notes

- **Two distinct unavailability states.** "Off sale" (`purchasable: false`) produces `data-availability="unavailable"` and the `NOT_AVAILABLE` string. "Deactivated" (`active: false`) produces `data-availability="removed"` and the separate string `"No longer available"`. Tests assert the correct one for each case.
- **Custom commands.** Relies on project-level Cypress commands: `cy.subjectId`, `cy.subjectProduct`, `cy.apiAs`, `cy.step`, `cy.restore`, `cy.loginAs`, `cy.goToCart`. These are not defined in this file.
- **`beforeEach` pattern.** Visits `/en`, calls `cy.restore()` (presumably re-seeds or resets test data), then visits `/en` again.
- **Order-count guard.** The "no order written" assertion compares the order count captured *before* the checkout attempt with the count after, rather than simply checking for an absence of a confirmation element.
- **Requires modules.** The leading `requires-module` comment lists `account, cart, inventory, orders, products, wishlist`—the backend feature modules this journey exercises.
