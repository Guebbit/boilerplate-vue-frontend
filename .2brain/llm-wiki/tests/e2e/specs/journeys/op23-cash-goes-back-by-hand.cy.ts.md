---
source: tests/e2e/specs/journeys/op23-cash-goes-back-by-hand.cy.ts
sha256: a8cf8e4dfb598309d67b420a50471e2d1827431c51a0f40d7e8687aa1ad17f0e
signature: 032934a962ed1505cb5b35bfb187c73a380ea6883522dc38cc6441a752b9c1a3
generated_at: 2026-11-10T07:14:31.270393+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op23-cash-goes-back-by-hand.cy.ts

## Purpose

End-to-end Cypress test for the "cash refund by hand" journey: a cash-paid order is cancelled with a refund that stays **pending** (no provider to call), then a moderator manually marks the cash as returned. The test also verifies the invoice remains downloadable and a credit note appears after the settlement.

## Key elements

- **`PaymentLike`** (interface) — the subset of a payment object the test reads: `displayStatus`, `method`, `status`, `amountRefunded`, `refunds[].settledByHand`, and `actions.refund` / `actions.settleByHand`.
- **`describe('OP23 · Cash goes back by hand')`** — single-suite block; `beforeEach` resets state via `cy.visit('/en')` → `cy.restore()` → `cy.visit('/en')`.
- **Single `it` block** with four named `cy.step` checkpoints:
  1. Download invoice (asserts 200 + `application/pdf`).
  2. Cancel-and-refund → payment enters `refund_pending`, `settledByHand` is `undefined`, `settleByHand` action available.
  3. "Mark returned" button click → payment flips to `refunded`, `settledByHand` becomes `true`, action list empties.
  4. Credit note exists; invoice button still present.

## Relationships

- **`tests/support/e2e/steps.ts`** — provides the three helpers this file imports:
  - `paymentOfOrder<T>(role, orderId)` — fetches a payment for an order and yields it to a Cypress assertion.
  - `eventually(fn, predicate)` — polls an API call until the predicate is true (used to wait for `refund_pending`).
  - `creditNotesOf(role, orderId)` — returns credit notes for an order.

## Notes

- The test explicitly asserts the payment method is **not** `'card'` to guard against fixture drift.
- `cy.intercept` on the invoice download is used only to assert the response; the test does not re-download after refund (comment: "one download is enough").
- The `data-test` attribute `button-mark-returned-*` uses a CSS attribute-starts-with selector (`^=`), implying the button label includes a dynamic suffix (e.g., the amount).
- Requires fixtures tagged `account`, `orders`, `payments` (see `// requires-module` comment at top).
