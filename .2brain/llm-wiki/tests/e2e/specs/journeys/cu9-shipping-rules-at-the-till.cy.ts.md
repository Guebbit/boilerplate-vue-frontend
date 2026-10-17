---
source: tests/e2e/specs/journeys/cu9-shipping-rules-at-the-till.cy.ts
sha256: 5e206b2066a965598530c19b20304a5ec23152401553fefc95879ef55580e7b6
generated_at: 2026-10-17T02:14:51.797377+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu9-shipping-rules-at-the-till.cy.ts

## Purpose

End-to-end Cypress journey test for use-case CU9: it verifies the cart's server-side shipping rules (free-shipping threshold, weight-based method refusal, pickup requiring no shipping address, and ship-to-country restriction) by reading prices in cents and checking server error messages rendered in the UI. It never performs a payment.

## Key elements

- **`describe('CU9 · Shipping rules at the till', …)`** — Single test suite; `beforeEach` visits `/en`, calls `cy.restore()`, then re-visits to reset state.
- **`it('prices, refuses and skips delivery by the rules…', …)`** — The sole test. Runs four sub-steps in sequence:
  - *Free threshold*: adds `product.rich` (costs > 0 for standard), increments qty to 2 (cost becomes 0, label shows "free").
  - *Weight refusal*: adds `product.heavy` via `cy.apiAs` behind the page, clicks the (now invalid) express radio, asserts the server refusal message and fallback to standard; reloads and confirms express is absent from the picker.
  - *Ship-to country*: fills a French address via `fillAddressDialog`, selects it at checkout, asserts the refusal message and that the cart page is preserved.
  - *Pickup*: selects pickup, confirms no shipping-address picker appears, checks out, then fetches the order via API to assert `shippingAddress` is `undefined` while `billingAddress` is present.

## Relationships

- **`tests/support/e2e/steps.ts`** — Provides the four helpers this file imports:
  - `addToCartFromStorefront` — adds a product by catalogue key from the storefront UI.
  - `shouldShowCents` — waits for an element's text to parse as a cent value and invokes a callback for assertions.
  - `fillAddressDialog` — populates the address form with the given fields.
  - `idFromLocation` — extracts a resource ID (e.g. order ID) from the current URL.

## Notes

- The weight-refusal step deliberately adds `product.heavy` via `cy.apiAs` *after* the page already rendered the express option, so the express radio is "stale" from the server's perspective. The test then clicks it to trigger the server refusal; a subsequent `cy.reload()` shows the corrected picker.
- The file header lists required modules (`account, cart, delivery, inventory, orders, products`) — these are the backend services the test depends on being up.
- Prices are always asserted in **cents** (not dollars) via `shouldShowCents`; the "free" check is `to.equal(0)`.
- The test is read-only with respect to payment: no card fields are filled and no order-payment endpoint is called.
