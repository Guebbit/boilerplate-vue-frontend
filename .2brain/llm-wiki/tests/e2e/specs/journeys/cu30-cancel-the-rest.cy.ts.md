---
source: tests/e2e/specs/journeys/cu30-cancel-the-rest.cy.ts
sha256: e204e7998f443478d669c2b83fd3037ea909d5d30532a1bb4fccf433a8dfa4e6
signature: c80bdb41c838a26da8d99fcd193ab64de06e87a1595b128db97e77d627b658d7
generated_at: 2026-11-10T06:59:42.217636+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu30-cancel-the-rest.cy.ts

## Purpose

End-to-end Cypress journey test for CU30: canceling the unshipped portion of a partially fulfilled order. It verifies that the server-computed refund is displayed (never client-side math), the confirm dialog round-trips correctly, a `closed` cancellation is recorded, the payment transitions to `partially_refunded`, and the buyer receives the expected acknowledgement and refund emails.

## Key elements

- **`OptionsLike`** – structural interface for the `cancelable` array in `GET /returns/options`; holds `refundAmount`, `shippingRefund`, and `lines`.
- **`ReturnLike`** – minimal shape (`kind`, `status`) used to assert cancellation records from `GET /returns?orderId=…`.
- **`PaymentLike`** – minimal shape (`status`, `displayStatus`) used to assert the partial-refund state of the order's payment.
- **`beforeEach`** – resets the database via `cy.restore()` and visits `/en` twice to ensure a clean UI state.
- **`it('cancels the unshipped units…')`** – the single spec. Reads the server refund from the API, validates the order-page hint, exercises the confirm dialog (open → verify amounts → back → open → confirm), then checks the cancellation record, payment status, and outbound emails.

## Relationships

- **`tests/support/e2e/steps.ts`** – provides the three helpers used in this spec:
  - `eventually` – polls a getter until a predicate is true (used for the `partially_refunded` payment status).
  - `orderMailTo` – asserts that a specific email was delivered to the user for the given order.
  - `paymentOfOrder` – fetches the payment record for an order, typed against `PaymentLike`.

## Notes

- The `requires-module` comment at the top (`account, delivery, orders, payments, returns`) indicates which domain fixtures/modules must be loaded before this spec runs.
- The refund amount is always taken from the API response (`refundAmount`, `shippingRefund`) and compared to the UI text; the test never computes a sum itself.
- `cy.subjectId('order.partiallyFulfilled')` resolves a pre-seeded fixture order; the test assumes exactly one `cancelable` option exists.
- The `shippingRefund` assertion is conditional (`if (refund.shipping > 0)`) because the fixture may or may not include a shipping component.
- `eventually` is used for the payment check because the refund is processed asynchronously by the server.
