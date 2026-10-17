---
source: tests/e2e/specs/journeys/cu22-my-returns-page.cy.ts
sha256: f8ec9fea43b5ab88ec6396d64534e937638b88766d6709ed2f03cec7d05b1dfe
generated_at: 2026-10-17T02:11:31.789363+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu22-my-returns-page.cy.ts

## Purpose

Cypress e2e spec for user story CU22: the "My returns" page must list all of a customer's returns (a declined defective request, a pending defective request, a received withdrawal, plus a pre-seeded closed cancellation), support status/reason filters (including combined and empty states), show correct per-return detail (decline reason, refund minus deduction, line items matching the order), and provide bidirectional links between each return and its parent order.

## Key elements

- **`DECLINE_REASON`** – The exact string support posts as the decline justification; asserted verbatim in the UI.
- **`DEDUCTION` / `DEDUCTION_CENTS`** – Handling-fee amount in major units (3) and the cent value (300) the page displays.
- **`SEEDED_CANCELLATIONS`** – Count (1) of a pre-existing closed cancellation the seed fixture provides; all list-length assertions add this.
- **`ReturnLike`, `OrderLike`, `PaymentLike`** – Minimal typed slices the spec reads from API responses; no shared model import.
- **`filterReturnsBy(filter, label)`** – Helper that selects an option in the status/reason `<select>` and clicks the search button.
- **`listShows(ids, others?)`** – Asserts row count and that each expected id is present by its `href` suffix (never by DOM position).
- **`linesMatchTheOrder(returnId)`** – Fetches the return and its order via API, then verifies every line's title, quantity, and unit-price match on the rendered page.
- **`describe('CU22 …')` / single `it`** – One long test that seeds three returns (one via UI withdrawal, two via API), then walks through list → filters → detail pages → back-link to order.

## Relationships

- **`tests/support/e2e/steps.ts`** – Imported for `centsOf` and `cents`, the two money-parsing/assertion utilities used to compare rendered price text against expected cent values. Also the likely home of the custom `cy` commands the spec calls (`subjectId`, `step`, `apiAs`, `loginAs`, `restore`, `pickOption`, `checkPageA11y`).
- **`scripts/e2e/cents.ts`** – Listed as a graph neighbor; not directly imported by this file. Likely the shared cents-conversion utility that `tests/support/e2e/steps.ts` re-exports or that the seed/fixture pipeline uses to format money in the API responses this spec asserts against.

## Notes

- The single `it` block nests three levels of `cy.subjectId(…).then(…)` to obtain IDs, then chains further `.then()` calls to defer assertions until earlier CYPRESS commands resolve. The comment `opened.id is read when the queue reaches it` flags that `opened` is mutated mid-queue and must be accessed inside a `.then`, not captured at build time.
- List assertions use `href$="/returns/${id}"` rather than index order, so the spec is resilient to sort-order changes.
- The "Approved" status filter is expected to produce **zero** rows and an empty-state element (`#returns-list-page .v-empty-state`), not an error.
- Money cells on the page are asserted in **cents** (via `centsOf`), even though `DEDUCTION` is declared in major units; the conversion is done once into `DEDUCTION_CENTS`.
- Accessibility is checked only on the declined-return page (`cy.checkPageA11y('a declined return')`); the other detail pages are not a11y-checked here.
