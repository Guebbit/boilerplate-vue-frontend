---
source: tests/e2e/specs/journeys/op4-refund-delivered-order.cy.ts
sha256: 2c1ea52a74bb7b7f334e83fd64cebed5e5c753e59ffc63e220d70fca4c75d067
signature: a4cf1d5c3d346aca5cb67abe8fd653a587d965663d328a6939de470e8806de56
generated_at: 2026-11-10T07:18:29.906751+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op4-refund-delivered-order.cy.ts

## Purpose

End-to-end test for journey OP4: verifying that a moderator can refund the payment on a **delivered** order without changing the order's status. Confirms the UI only offers "refund only" (cancel actions are disabled), the payment transitions to fully refunded, a credit note is issued, the customer sees the refund on their order page, and the customer receives a notification email.

## Key elements

- **`PaymentLike`** — narrow interface for the payment fields the story asserts on (`status`, `displayStatus`, `amount`, `amountRefunded`).
- **`OrderLike`** — narrow interface for the order field checked via API (`status`).
- **`describe('OP4 · A return: refund a delivered order')`** — single test case walking the full refund flow:
  1. Moderator opens the delivered order → refund-only button enabled, both cancel buttons disabled, payment is `succeeded` with `amountRefunded = 0`.
  2. Clicks "refund only" → no error, button disables, payment shows `displayStatus = 'refunded'` and `amountRefunded = amount`.
  3. API check: order status remains `delivered`; exactly one credit note exists.
  4. Switches to the customer role → order page shows "Refunded" payment status, fulfillment status present, one credit-note row.
  5. Asserts the customer received the "Your refund has been issued" email.
- **`beforeEach`** — visits `/en`, calls `cy.restore()`, re-visits to reset app state.

## Relationships

- **`tests/support/e2e/steps.ts`** — provides the three helpers used throughout the test:
  - `paymentOfOrder(role, orderId)` — fetches and returns the order's payment for assertions.
  - `creditNotesOf(role, orderId)` — fetches the list of credit notes for the order.
  - `orderMailTo(role, orderId, subject)` — asserts a mail with the given subject was sent to the user.

## Notes

- Requires the `account`, `orders`, and `payments` modules (see the `requires-module` comment); the test will fail or skip if any are unavailable.
- The order fixture is resolved via `cy.subjectId('order.delivered')`, meaning the test depends on a pre-seeded order in that exact state—no setup mutation is performed.
- The test asserts button *disabled* state for both cancel actions, encoding the business rule that a delivered order is irreversible except for a refund.
- `cy.switchUser('user')` mid-test changes the authenticated role; all subsequent UI assertions are from the customer's perspective, not the moderator's.
