---
source: tests/e2e/specs/journeys/op36-the-payments-pages-two-doors.cy.ts
sha256: f1a30ce410e148921aaf852d45261a72f1abbe30ab5d066ec825bf66ca28e11f
signature: 88891446ce34078fad08948986cf02d1b36981fe6b689188d80888298c8cd7de
generated_at: 2026-11-10T07:17:39.148959+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op36-the-payments-pages-two-doors.cy.ts

## Purpose

E2E journey test (OP36) that exercises two distinct payment workflows on the moderator's payments page: recording a bank transfer via the Awaiting tab (verifying the row disappears and the buyer receives a confirmation email) and refunding a card payment from the payment drawer (verifying the "No" path writes nothing, the "Yes" path refunds the remainder, and the buyer ends with a refund plus a credit note).

## Key elements

- **`PaymentLike`** — minimal interface (`{ amountRefunded: string }`) used as a type parameter for `paymentOfOrder`; avoids importing the full payment model.
- **`NOTHING_REFUNDED`** (`'0.00'`) — expected string value of `amountRefunded` on an unrefunded payment; compared as a decimal string, not a number.
- **`beforeEach`** — calls `cy.visit('/en')` → `cy.restore()` → `cy.visit('/en')` to reset DB state before each test.
- **Single `it` block** — contains two sequential scenarios (transfer recording, then card refund) separated by `cy.subjectId` lookups for `order.awaitingTransfer` and `order.paidExpress`.
- **`cy.step`** — human-readable step markers that segment the test for reporting.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports `paymentOfOrder`, an API helper that fetches a payment's details (used here to assert `amountRefunded` values from both the moderator and buyer perspectives).
- **`scripts/e2e/mail-filters.ts`** — imports `byTemplate` to build a mail assertion matching the payment-received confirmation email sent to the buyer after the transfer is recorded.

## Notes

- `amountRefunded` is compared as a **string** (`'0.00'`) in the "No" path and as a **number** (via `Number(...)`) in the "Yes" path — the API returns a decimal string, but the test casts it before the `be.greaterThan` check.
- `cy.subjectId` is a project-specific custom command that resolves a named fixture to its database ID; it is not a standard Cypress API.
