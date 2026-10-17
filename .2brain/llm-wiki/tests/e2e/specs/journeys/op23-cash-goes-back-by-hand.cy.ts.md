---
source: tests/e2e/specs/journeys/op23-cash-goes-back-by-hand.cy.ts
sha256: 057ee9f2227b9d883734d81fd98eb0362ed1455c27576be9a0d44179b8e37681
generated_at: 2026-10-17T02:21:11.635667+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op23-cash-goes-back-by-hand.cy.ts

## Purpose

End-to-end journey test for the "cash refund by hand" workflow: when a cash-paid order is cancelled there is no payment provider to call, so the shop must record the refund manually. The test verifies the full sequence — invoice still downloads before and after, the "refund pending" state appears after cancel, the moderator marks the refund as done by hand, no provider interaction occurs, and a credit note is issued alongside the original invoice.

## Key elements

- **`PaymentLike`** — minimal interface describing the payment fields this story asserts on (`method`, `displayStatus`, `status`, `amountRefunded`, `refundedByHand`).
- **`CreditNoteLike`** — minimal interface for a credit note (`grandTotal`); used only to confirm one note exists.
- **`describe('OP23 · Cash goes back by hand')`** — single test case that walks the journey in five `cy.step` blocks:
  1. Moderator opens the order, downloads the invoice (asserts 200 + PDF content-type).
  2. Clicks **Cancel only** → verifies `payment-refund-pending` badge appears, `payment-refunded-by-hand` does not.
  3. Clicks **Refund only** → asserts via API that `refundedByHand` is `true`, `displayStatus` is `'refunded'`, and the UI badges flip accordingly.
  4. Polls (via `eventually`) for a credit note, then confirms it renders in the UI.
  5. Confirms the invoice download button is still present after both cancel and refund.

## Relationships

- **`tests/support/e2e/steps.ts`** — provides the `eventually` helper (polling/retry wrapper) used to wait for the credit note to appear. The test also relies on many custom Cypress commands defined in the same support layer (`cy.step`, `cy.subjectId`, `cy.loginAs`, `cy.restore`, `cy.apiAs`).

## Notes

- The file header declares `requires-module: account, orders, payments`; the test assumes those modules are enabled in the fixture environment.
- `beforeEach` restores and revisits `/en` to reset auth/session state between runs.
- Invoicing is deliberately exercised only once (one download) — the comment explains the "invoicing budget" is per-download and the story is about the money flow, not the PDF.
- The test asserts `payment.method` is **not** `'card'` to guard against accidentally running against a card-payment fixture.
- Button-disable assertions (`should('be.disabled')` after click) confirm the action is idempotent / not double-clickable.
