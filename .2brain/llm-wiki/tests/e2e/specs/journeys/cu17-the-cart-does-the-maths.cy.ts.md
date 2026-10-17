---
source: tests/e2e/specs/journeys/cu17-the-cart-does-the-maths.cy.ts
sha256: 77e22417205d619634fa46663a4105b0bc7c9858285788c5707cc4548306528d
generated_at: 2026-10-17T02:10:30.196737+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu17-the-cart-does-the-maths.cy.ts

## Purpose

End-to-end test for story CU17 ("The cart does the maths"). It walks a logged-in customer through adding two products (one from a grid card, one from a detail page), adjusting quantity with rapid clicks, verifying that every visible number—bar badge, bar money, per-line `unit × qty = total`, items + shipping = grand total—stays internally consistent after each action. It also asserts that the UI debounces rapid quantity clicks into a single API call carrying the final quantity, and that removing/clearing the cart correctly resets the bar and surfaces the empty state.

## Key elements

- **`readLine(text)`** – Local helper that parses a cart line's `unit × quantity = total` string into `{ unit, quantity, total }` (money in cents, quantity as a number).
- **`BAR_MONEY` / `BAR_BADGE` / `BAR_COUNT`** – CSS selector constants for the nav-bar cart badge. `BAR_COUNT` targets Vuetify's internal `.v-badge__badge` because the library exposes no `data-test` hook there.
- **`describe('CU17 …')`** – Single suite; one `it` block covers the entire journey in sequence.
- **`beforeEach`** – Visits `/en`, calls `cy.restore()` (DB reset), then re-visits `/en`.
- **`cy.intercept`** assertions – Captures the `POST **/cart` add call and the `PUT **/cart/:id` quantity call; the latter asserts `request.body.quantity === 3` and that `@setQuantity.all` has length 1 (debounce proof).

## Relationships

- **`tests/support/e2e/steps.ts`** – Source of the shared step helpers imported at the top: `addOpenProductToCart`, `cents`, `searchAndOpenProduct`, `shouldShowCents`. The `cents` helper is the canonical money-to-cents converter used throughout the assertions.
- **`scripts/e2e/cents.ts`** – Upstream implementation of the `cents` conversion that `steps.ts` re-exports or delegates to; all monetary comparisons in this spec flow through it.

## Notes

- All money is compared in **integer cents** (via the `cents` helper) to avoid floating-point drift; no test ever asserts a decimal currency string directly.
- The debounce check (4 rapid clicks → exactly **1** `PUT` request) is the only place the test inspects `request.body`; it does not verify response status for that call.
- Express shipping is assumed to be a **flat rate** that requires a delivery address; the seeded test customer already has one, so the test simply clicks the Express option without adding an address.
- The `BAR_BADGE` wrapper is expected to **not exist** (not just be empty) after the cart is cleared—Vuetify removes the element entirely when the count is zero.
- The test is ordered as a single linear flow; there is no parallelism or retry logic. Failures mid-flow will leave later assertions unrun.
