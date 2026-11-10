---
source: tests/e2e/specs/journeys/fr1-double-click-place-order.cy.ts
sha256: f5031535af76bbea4de4688686c14b1ad7e7e656e6890787f8ca5c022a42155c
signature: e9b96ab59ffe7fc6ca69fd46cf9251c3d548de09e8288f75adf1b52646c25790
generated_at: 2026-11-10T07:03:28.419041+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr1-double-click-place-order.cy.ts

## Purpose

End-to-end test for FR1 (double-click "Place order"): verifies that rapidly pressing the checkout button twice on a slow connection results in exactly **one** order. It confirms the button is disabled while the request is in flight and that any duplicate request carries the same `Idempotency-Key`, so the API returns the first result rather than creating a second order.

## Key elements

- **`CHECKOUT_DELAY_MS`** (const) — 1500 ms; injected as a response delay via `cy.intercept` so the in-flight window is long enough to assert the disabled button state.
- **`OrdersPage`** (interface) — shape of the `/orders` list response (`items` array + `meta.totalItems`).
- **`orderCount()`** — helper that issues `cy.apiAs('user', 'GET', '/orders?pageSize=1')` and returns `meta.totalItems` as a `Cypress.Chainable<number>`.
- **`describe('FR1 · Double-click "Place order"')`** — single test case that:
  1. Adds a product to the cart, selects *pickup* shipping (no address needed), and snapshots the order count.
  2. Intercepts `POST **/cart/checkout` to collect `idempotency-key` headers and apply the 1.5 s delay.
  3. Fires `dblclick()` on `[data-test=cart-checkout]`.
  4. Asserts the button is disabled while in flight, that the redirect target `#order-target` appears, that all captured keys are non-empty and identical, and that the order count increased by exactly 1.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports `addToCartFromStorefront` to add a product to the cart from the storefront before navigating to the cart page.
- Declares a runtime dependency (via `requires-module` comment) on the **account**, **cart**, **inventory**, **orders**, and **products** services/modules.

## Notes

- The test relies on `cy.apiAs` and `cy.restore` as **custom Cypress commands**; they are not standard Cypress API.
- The mutable `orders` object (`{ before: 0 }`) is used as a closure to pass the pre-click order count into the later `.should()` assertion, avoiding an extra `cy.then` nesting.
- `pickup` shipping is chosen deliberately because it skips the address form, making the checkout button enabled without extra UI steps.
- The intercept pushes the delay onto the **response** (not the request), so both clicks fire immediately; only the server reply is held back.
- No payment is performed — the test exercises the idempotency/disabling guard, not the card-budget or billing flow.
