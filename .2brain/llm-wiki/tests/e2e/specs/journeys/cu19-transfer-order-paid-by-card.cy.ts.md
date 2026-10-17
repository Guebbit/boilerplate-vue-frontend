---
source: tests/e2e/specs/journeys/cu19-transfer-order-paid-by-card.cy.ts
sha256: 614d5bd876d2c773aa5aa169a2868565387b13cbeb1757a8945bccc22d0d44dd
generated_at: 2026-10-17T02:10:53.750087+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu19-transfer-order-paid-by-card.cy.ts

## Purpose

E2E journey test (Cypress) for CU19: a customer begins checkout with bank transfer, is shown the transfer instructions, then switches to paying by card before the transfer lands. Verifies that the order settles as card-paid (status, payment method, invoice), the transfer UI disappears, and the admin can locate the paid order via the RF reference with no offline-payment form offered.

## Key elements

- **`OrderLike`** (local interface) — minimal order shape read from the API: `status` and `paymentMethod`.
- **`describe('CU19 · …')`** — single suite with one `it` block covering the full journey.
- **`beforeEach`** — visits `/en`, calls `cy.restore()` to reset fixtures, re-visits `/en`.
- **Test flow** (the `it` block) — four `cy.step` segments:
  1. Checkout with `pickup` + `bank_transfer`; asserts transfer-instructions panel and "Bank transfer" method label.
  2. Selects `payment-method-select`, reads the RF reference from `transfer-instructions-panel` (whitespace-stripped), calls `cy.payWith('Card that pays')`.
  3. Asserts post-payment state: status "Succeeded", transfer panel gone, method shows "Card", invoice downloadable; also hits `GET /orders/:id` to confirm `status === 'paid'` and `paymentMethod === 'card'`.
  4. Switches to `admin`, searches by RF reference in `/en/sales/orders`, lands on the edit page, confirms the offline-payment form is absent and `refund-only` button is enabled.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports `addToCartFromStorefront` (adds `product.rich` to the cart) and `idFromLocation` (extracts the order ID from the current URL after checkout).

## Notes

- Uses `pickup` as the shipping method specifically to bypass address-entry requirements; the `shipping-method-pickup` element enables the checkout button on its own.
- The RF reference is read from the DOM (`transfer-reference` element) and whitespace-stripped before being used for admin search — it is **not** taken from the API response.
- `cy.payWith('Card that pays')` is a custom command (likely defined in support files) that performs a card payment against the order in context.
- The `requires-module` comment at the top (`account, cart, delivery, inventory, orders, payments, products`) documents which backend modules must be loaded for this spec to pass.
- After the card payment, the test asserts the transfer panel and payment-method selector are **absent**, not merely hidden — the UI is expected to remove them entirely.
