---
source: tests/e2e/specs/journeys/op22-defective-item-comes-back.cy.ts
sha256: b6b56df89d50b8bd33260921edc6d6e6473b053a4632364554db8b0bfe2210e3
signature: 911d1d0f0d9a94ca92721d614c048b0fbae2511c239df230edc93ea83d3de1bd
generated_at: 2026-11-10T07:14:22.125819+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op22-defective-item-comes-back.cy.ts

## Purpose

End-to-end journey test for **OP22 · A defective item comes back**. It exercises the non-withdrawal return path: a customer reports faulty goods, support either approves or declines (with a coded reason + message), the warehouse receives the approved parcel, and the customer verifies both outcomes, the full refund (delivery included), the inventory restock, a credit note, and the mailed notifications. The test also confirms role isolation (support cannot "receive", warehouse cannot "approve") and that a declined return releases its quantity back into the returnable options.

## Key elements

- **`DECLINE_CODE_LABEL`** / **`DECLINE_REASON`** — The coded reason label and free-text message support selects when declining; reused in UI assertions and mail verification.
- **`SEEDED_CANCELLATIONS`** (= 1) — Count of seeded withdrawal-cancellation returns that appear alongside the two test subjects; used to size list assertions.
- **`ReturnLike`**, **`OptionsLike`**, **`PaymentLike`** — Minimal structural types for API responses consumed in this test (return status/lines, returnable options, payment amounts).
- **`filterReturnsBy(filter, label)`** — Selects an option in the status/reason `<select>` and clicks the search button to narrow the returns list.
- **`listShows(ids, others?)`** — Asserts the returns list length and that each expected return row exists by its `href$` selector, never by DOM position.
- **`describe('OP22 · A defective item comes back')`** — Single `it` block that walks the full journey across four roles (support → warehouse → customer) using `cy.step` narration, `cy.apiAs` for state checks, and UI interactions for actions.

## Relationships

- **`scripts/e2e/mail-message.ts`** — Provides `mailMentions`, used to assert the decline reason text appears in the "Your return was declined" email body.
- **`tests/support/e2e/steps.ts`** — Provides `centsOf` (read a money element in cents), `creditNotesOf` (fetch credit notes for an order), `orderMailTo` (fetch/verify a specific order email), and `paymentOfOrder` (fetch the payment record for an order). All four are called during the refund and mail-verification steps.

## Notes

- The test requires the modules `account`, `inventory`, `orders`, `payments`, `returns` (see the `requires-module` comment) — these must be enabled in the e2e environment or the test will fail at seed time.
- `cy.subjectId('return.requested')` and `cy.subjectId('return.requestedSecond')` pull the two seeded return IDs; the test relies on the seed providing exactly two "requested" defective-goods returns plus one closed withdrawal cancellation.
- Refund assertion compares the UI refund in **cents** against `payment.amount × 100`, confirming delivery is included (no handling deduction for faulty goods).
- The declined-return re-request check uses `check({ force: true })` on checkboxes because the elements may be partially obscured in the order detail view.
- Role isolation is verified by asserting the *absence* of the other role's action buttons (`return-receive-form` on support, `return-approve` / `return-decline-form` on warehouse).
