---
source: tests/e2e/specs/journeys/cu30-cancel-the-rest.cy.ts
sha256: c46d45e2ac0f5037793ad5c74bd8203f8a1a7e6f8f810e21d1140908bab986fe
generated_at: 2026-10-17T02:13:24.617136+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu30-cancel-the-rest.cy.ts

## Purpose

End-to-end journey test for CU30: cancelling the unshipped portion of a partially-fulfilled order. Verifies that the cancel offer and its refund amount come from the server (not computed client-side), that a confirmation step prevents premature cancellation, and that after confirming, a closed cancellation record exists and the payment reflects a partial refund.

## Key elements

- **`OptionsLike`** — local interface narrowing the `GET /returns/options` response to `cancellable: { refundAmount: number }[]`.
- **`ReturnLike`** — local interface narrowing a return item to `kind` and `status` fields.
- **`PaymentLike`** — local interface narrowing the payment record to `status` (stored) and `displayStatus` (derived, e.g. `partially_refunded`).
- **`beforeEach`** — visits `/en`, calls `cy.restore()` to load fixtures, then revisits to apply state.
- **Single `it` block** — walks the full journey in four `cy.step` segments: (1) the cancel offer is visible with a server-provided refund amount; (2) the confirm dialog shows that exact amount and no cancellation exists yet; (3) after confirming, the dialog closes, no cancellable items remain, and a single `cancellation/closed` record is on file; (4) the payment eventually reaches `partially_refunded`.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports the `eventually` helper (polls an API until a condition is met, used here for the async refund status). The file also relies on custom Cypress commands (`cy.step`, `cy.subjectId`, `cy.apiAs`, `cy.restore`, `cy.loginAs`) that are registered by the support layer.

## Notes

- The refund amount is read once from the server API (`/returns/options`) and stored in a mutable `refund` object, then compared against the text rendered in the confirm dialog. The test never re-derives the amount from line items.
- The final assertion uses `eventually` rather than a plain `cy.apiAs` because the partial-refund status is set asynchronously by the payment processor.
- `cy.restore()` in `beforeEach` is the fixture-reset mechanism; the test depends on the `order.partiallyFulfilled` subject existing in the fixture set.
- The `// requires-module` comment at the top lists the feature modules (account, delivery, orders, payments, returns) this story exercises—useful for tracing impact when those modules change.
