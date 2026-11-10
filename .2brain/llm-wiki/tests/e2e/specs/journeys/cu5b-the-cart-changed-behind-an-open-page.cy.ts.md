---
source: tests/e2e/specs/journeys/cu5b-the-cart-changed-behind-an-open-page.cy.ts
sha256: ef8cd2341fb8a0e8b2b62676f185af944fc1f50645eb74cb28f3b7f1ad99553b
signature: 4faa1f6e34348596fcecc06e10ebfdef606a040a3faedfd3585aab4e517f7318
generated_at: 2026-11-10T07:01:49.373656+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu5b-the-cart-changed-behind-an-open-page.cy.ts

## Purpose

E2E test for Cucumber story CU5b: verifying that the cart page re-reads server state when the window regains focus, and that an order attempt is refused (409) when the server-side total has changed since the page rendered, after which a second confirmation at the updated total succeeds.

## Key elements

- **`describe('CU5b · …')`** — top-level block; `beforeEach` visits `/en`, calls `cy.restore()`, and re-visits.
- **Test 1 – "shows the server cart again when the customer comes back to the page"** — Adds 1 item via storefront, increments to 2 through the UI, then uses `cy.apiAs('user', 'PATCH', '/cart/items/…')` to set quantity to 5 as a "second tab." Dispatches a `focus` event on `window` to simulate the customer returning, then asserts the page shows 5.
- **Test 2 – "refuses an order placed at a total the page no longer has…places it on the second press"** — Adds 1 item, selects `pickup` shipping, records the shown total in cents. As `editor`, PATCHes the product price up by `RAISE_CENTS` (1200). Clicks checkout → expects a "total changed" message, the new total rendered, the user still on `/cart`, and the cart still populated (nothing ordered). Clicks checkout again → expects the order to exist at the raised total.
- **`RAISE_CENTS` (1200)** — price delta the editor applies, in cents.
- **`SHOWN_UNITS` / `OTHER_TAB_UNITS` (2 / 5)** — quantities asserted in test 1.
- **`ProductLike` / `OrderLike`** — minimal read-only slices used to type the API responses.

## Relationships

- **`tests/support/e2e/steps.ts`** — provides the four imported helpers: `addToCartFromStorefront` (adds a product to the cart via the storefront UI), `centsOf` (reads a DOM element and returns its value in integer cents), `idFromLocation` (extracts an id from the current URL), and `shouldShowCents` (asserts a DOM element displays a given cent amount).

## Notes

- **Focus simulation** — "the customer comes back" is modelled by `win.dispatchEvent(new Event('focus'))`, not by actually switching browser tabs.
- **`force: true` clicks** — the checkout button is clicked with `force` because leftover toasts from prior steps can overlay the page footer and block a normal click.
- **Debounce guard** — test 1 intercepts the `PATCH /cart/items/*` request and waits for it before the API write, ensuring the "other tab" change lands *after* the UI step completes.
- **Shipping method** — `pickup` is chosen deliberately because it requires no address, making the checkout button enabled without extra setup.
- **Money is integer cents** end-to-end; the single `toFixed(2)` conversion happens only when sending the price to the API.
- The `requires-module` header comment lists the back-office modules that must be seeded: `account`, `cart`, `inventory`, `products`.
