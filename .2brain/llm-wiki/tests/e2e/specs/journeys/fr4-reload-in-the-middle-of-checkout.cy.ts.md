---
source: tests/e2e/specs/journeys/fr4-reload-in-the-middle-of-checkout.cy.ts
sha256: 15b4bf033a08b3abd92e01fc1c8bfae182f7386b96fb8aa5d92da9bd4f406add
generated_at: 2026-10-17T02:16:21.218206+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr4-reload-in-the-middle-of-checkout.cy.ts

## Purpose

E2E test for FR4: what survives a mid-checkout page reload. Two scenarios verify that (1) server-persisted state (delivery method, default address, cart lines) is intact after a reload and still places exactly one correct order, and (2) browser-only state (note, payment choice, a non-default address, an in-debounce quantity change) is preserved via a `checkout-draft` sessionStorage mechanism and is cleared on logout so the next user sees nothing.

## Key elements

- **`OrderLike`** — local interface describing the subset of an order the test asserts on (id, notes, paymentMethod, shippingMethod, shippingAddress).
- **`OrdersPage`** — local interface for the paginated order-search response used to count orders.
- **`orderCount()`** — helper that POSTs to `/orders/search` and returns the total item count as a `Cypress.Chainable<number>`.
- **`describe('FR4 · Reload in the middle of checkout')`** — the suite with two `it` blocks:
  - *keeps the delivery method, the address and the lines across a reload, and places one order* — adds a line, picks standard delivery, reloads, asserts state persists, checks out, verifies the order via API.
  - *gives back the note, the payment choice, a picked address and a last quantity click, and hands nothing to the next person* — exercises the checkout-draft path: types a note, picks a non-default address and bank transfer, triggers a quantity click and immediate reload, verifies the 400 ms debounced value still lands, checks all fields survive, confirms logout wipes `checkout-draft:*` from sessionStorage, then re-checks-out and asserts the order carries the chosen values.

## Relationships

- **`tests/support/e2e/steps.ts`** — provides the `eventually` helper, used in the second test to poll `GET /cart` until the keepalive quantity update (sent during `pagehide`) is visible server-side.

## Notes

- The `requires-module` comment at the top lists the backend modules this test depends on: account, cart, delivery, orders, products. All must be running.
- `cy.restore()` in `beforeEach` resets test fixtures; the cart is explicitly emptied via `DELETE /cart/all` so the single added line is unambiguous.
- The second test triggers the quantity click and `win.location.reload()` in the **same synchronous tick** specifically so the 400 ms debounce timer cannot fire before the reload; the quantity then arrives via a keepalive request *after* the page starts reloading. The `eventually` poll exists to wait for that in-flight request to settle.
- Non-default address and payment radios are selected with `.check({ force: true })` because they are inside a custom picker that may not expose a naturally clickable input.
- Logout verification checks `sessionStorage` keys prefixed `checkout-draft:` directly; the assertion is that **zero** such keys remain.
