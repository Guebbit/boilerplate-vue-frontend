---
source: tests/e2e/specs/journeys/cu22-my-returns-page.cy.ts
sha256: b7b110415eca7b2003d285cf70932710d15715edbf9298239aad0d457857120f
signature: 71f0d18d55e53b29201017e3eab2de65e68ccfe745598c7f5be268d86a1c5e5d
generated_at: 2026-11-10T06:57:16.684535+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu22-my-returns-page.cy.ts

## Purpose

Cypress end-to-end test for journey **CU22** ("My returns page tells me where each one stands"). It verifies that a customer with four returns in different states can list, filter, and open each return; see decline reasons, refund amounts, and handling deductions; confirm that return lines match the originating order; and navigate back to an order that displays the return. Three of the four returns are seeded (one declined, one pending, one closed cancellation); the fourth is opened via the UI as a customer would.

## Key elements

- **`DECLINE_REASON` / `DECLINE_REASON_TEXT` / `DECLINE_MESSAGE`** – Constants for the support decline payload and the human-readable text the page must show.
- **`DEDUCTION` / `DEDUCTION_CENTS`** – Handling-fee amount in major units and in the cents unit the page renders.
- **`SEEDED_CANCELLATIONS`** – Count of pre-seeded closed cancellations the test must account for in list-length assertions.
- **`ReturnLike`, `OrderLike`, `PaymentLike`** – Minimal structural types for the API slices the test reads, avoiding a full client-type import.
- **`filterReturnsBy(filter, label)`** – Picks an option in a filter `<select>` and clicks the search button.
- **`listShows(ids, others?)`** – Asserts the returns list contains exactly the given return ids (matched by `href`), plus any unnamed seeded rows.
- **`linesMatchTheOrder(returnId)`** – Fetches the return and its parent order via API, then asserts the rendered lines (title, quantity, unit price) agree with the order's items.
- **`describe` / `it` block** – Single test case covering the full journey: seed → decline via API → open withdrawal via UI → list/filters → per-return detail assertions → cross-navigation back to order.

## Relationships

- **`tests/support/e2e/steps.ts`** – Direct import source. Provides `centsOf`, `cents` (used to parse and compare money cells rendered in cents), and `paymentOfOrder` (fetches the payment amount for an order). Also registers the custom Cypress commands the test relies on throughout (`cy.subjectId`, `cy.step`, `cy.apiAs`, `cy.pickOption`, `cy.restore`, `cy.checkPageA11y`, `cy.loginAs`).
- **`scripts/e2e/cents.ts`** – Graph-adjacent; the implementation or build target behind the `cents`/`centsOf` helpers re-exported through `steps.ts`. No direct import in this file.

## Notes

- The test uses **nested `cy.subjectId` callbacks** (`return.requested`, `return.requestedSecond`, `order.deliveredRecent`) to obtain seed-generated ids without hard-coding them.
- `opened` is a mutable object whose `id` and `paid` fields are filled asynchronously inside separate `cy.then`/`.then` chains; the comment in the source warns that `opened.id` is read when the queue reaches the later assertion, not at construction time.
- The withdrawal is opened **through the UI** (button + confirm dialog) rather than via API, because that is the only customer-facing path; the warehouse receive step is then done via API to keep the test focused on the customer's view.
- Filter assertions include an **empty-state check** (`#returns-list-page .v-empty-state`) for the combination "Declined + Withdrawal" which matches no seeded return.
- Accessibility is spot-checked on the declined-return view via `cy.checkPageA11y`.
