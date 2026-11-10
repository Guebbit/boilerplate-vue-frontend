---
source: tests/e2e/specs/journeys/op17-warehouse-shift.cy.ts
sha256: d68c0d6585e3964840e7d4149f28fe8a69951489bdfe69f63bd81b0ebdffab13
signature: 2ed7422ce6e30eee8acd6433c272f3ac3deafdbf2f940dfd046df17a7a5613c0
generated_at: 2026-11-10T07:13:10.715760+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op17-warehouse-shift.cy.ts

## Purpose

Cypress E2E journey test for the **warehouse** role. In a single scenario it exercises the full warehouse workflow — receiving a stock delivery, shipping an express order with a tracking code, marking it delivered, fulfilling a digital order by hand, and receiving a returned parcel with a handling deduction — while simultaneously asserting negative permissions: no edit/cancel on orders, no sweep-reservations, no return approve/decline, and no access to admin pages.

## Key elements

- **`aPaidDigitalOrder()`** — API-only helper: customer adds a digital product to cart, checks out, admin records a cash payment; returns the order id as a `Cypress.Chainable<string>`.
- **`TRACKING_CODE`** (`'TRK-E2E-OP17'`) — the tracking code typed into the ship form; also asserted in the customer's mail.
- **`DEDUCTION_CENTS`** (`300`) — the handling deduction the warehouse retains from a return; entered as `3.00` in the UI, verified in cents against the refund.
- **`OrderLike` / `ReturnLike` / `PaymentLike`** — minimal typed slices of API responses used with `cy.apiAs` assertions.
- **`describe` → `beforeEach`** — calls `cy.restore()` to reset DB state, then re-visits `/en`.
- **Single `it` block** — the entire shift, sequenced with `cy.step` markers: menu checks → delivery receipt → express ship/deliver → digital fulfill → return receive with deduction → customer reads refund.

## Relationships

- **`tests/support/e2e/steps.ts`** — provides `adminMenuLinks`, `centsOf`, `checkoutAs`, `isTurnedBack`, and `paymentOfOrder`; the test uses them for menu assertions, checkout setup, "403/404" page checks, and refund-cents comparison.
- **`tests/support/e2e/harness.ts`** — provides `loginDevice` and `requestAsDevice`; used to make a raw authenticated `POST /orders/:id/cancel` request as the warehouse and expect a 403/404.
- **`scripts/e2e/mail-message.ts`** — provides `mailMentions`; used to assert the customer's inbox contains the tracking code after shipping.

## Notes

- The `requires-module` header comment lists six modules (account, delivery, inventory, orders, products, returns) — the test runner likely gates on these.
- The digital-order setup and the withdrawal return are created **via API** deliberately; the UI is only exercised for the warehouse's own actions.
- The deduction input field expects **dollars** (`DEDUCTION_CENTS / 100`), while the refund assertion reads **cents** — a unit mismatch that is easy to trip over when editing the constants.
- `cy.restore()` in `beforeEach` is the sole cleanup mechanism; there is no `afterEach` teardown.
- The express order (`order.paidExpress`) and delivered order (`order.deliveredRecent`) are expected to pre-exist in the seed data; the test does not create them.
