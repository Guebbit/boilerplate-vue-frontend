---
source: tests/e2e/specs/journeys/n2-withdraw-after-delivery.cy.ts
sha256: 7db664bcbe9099e87ce70caf331fed43d12d5c63a22e71cec021f048d19a431c
signature: 2abf5e3681559fd3946d0eae627fe7f5037293030f93d7f82d8f3482938c3f07
generated_at: 2026-11-10T07:10:54.623515+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/n2-withdraw-after-delivery.cy.ts

## Purpose

End-to-end journey test for the **N2 · Withdraw after delivery** flow. Verifies the full lifecycle of an EU consumer withdrawal (Art. 9) on a delivered order: the return opens pre-approved, the warehouse receives goods with a handling deduction (Art. 14(2)), the refund equals *paid − deduction*, inventory is restocked, the payment records a partial refund with a credit note, and the customer sees the final state and receives acknowledgement emails.

## Key elements

- **`DEDUCTION_CENTS`** — constant (300) representing the warehouse's handling-damage retention in cents; used to compute the expected refund.
- **`PaymentLike`** / **`ReturnLike`** — local interfaces narrowing the API responses this test asserts against (status, amount, amountRefunded / reason).
- **`describe('N2 · Withdraw after delivery')`** — single test that walks the entire journey using `cy.step()` as narrative milestones:
  1. Verifies the withdrawal panel is visible and the return button is *not* yet present.
  2. Captures the paid amount via `paymentOfOrder`.
  3. Clicks withdraw → confirmation dialog → second click → return appears.
  4. API-checks the return is `approved` with reason `withdrawal`.
  5. Switches to warehouse user, types the deduction, clicks receive.
  6. Asserts the on-screen refund equals `paid.cents − DEDUCTION_CENTS`.
  7. Confirms the return is `closed` via API.
  8. Verifies inventory shows a "Restock" movement tied to the order.
  9. Polls (`eventually`) until the payment's `amountRefunded` is positive, asserts exact cents and `displayStatus ≠ 'refunded'`.
  10. Asserts exactly one credit note for the order.
  11. Switches back to customer: return visible, withdraw button disabled with a blocked-reason, partial-refund badge, credit-note row.
  12. Confirms the order number on screen matches the API value.
  13. Asserts two outbound emails: withdrawal acknowledgement and refund notice.

## Relationships

- **`tests/support/e2e/steps.ts`** — sole dependency. Provides the helper utilities this file imports: `centsOf` (read a dollar figure from the DOM in cents), `creditNotesOf` (fetch credit notes for an order), `eventually` (retry-until polling), `idFromLocation` (extract ID from current URL), `orderMailTo` (assert an email was sent to the order's customer), `orderNumberShown` (read the order number from the screen), `paymentOfOrder` (fetch the order's payment as a typed object).

## Notes

- The test subject is `order.withdrawal-open` (a delivered order still inside the withdrawal window), distinct from `order.delivered` which is weeks past it.
- The refund assertion reads the figure **in cents from the screen** and compares it against the payment's recorded amount, deliberately catching rounding errors or a forgotten delivery charge.
- `cy.restore()` is called in `beforeEach` to reset DB state between runs.
- The confirmation dialog (double-click guard) is an explicit part of the flow: the first click does nothing, the second click on the dialog confirm button actually creates the return.
- `eventually` is used for the payment refund check because the refund is applied asynchronously after the warehouse receives the goods.
