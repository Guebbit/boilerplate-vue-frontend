---
source: tests/e2e/specs/journeys/op22-defective-item-comes-back.cy.ts
sha256: 5627407676d237672e73a7481d0e27a6826bb2453ce8facce2180b9458417b62
generated_at: 2026-10-17T02:21:01.635868+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op22-defective-item-comes-back.cy.ts

## Purpose

End-to-end test for journey **OP22**: a customer reports a defective item (non-withdrawal return). It walks the full approval → receive → refund path with two seeded requests — one approved, one declined with a customer-visible reason — verifying that each role (support, warehouse, customer) sees and can act only on their slice of the flow.

## Key elements

- **`DEDUCTION_CENTS`** (200) — warehouse handling fee, subtracted from the refund.
- **`DECLINE_REASON`** — the reason string support must type when declining; asserted visible to the customer.
- **`SEEDED_CANCELLATIONS`** (1) — accounts for the one extra seeded return (a closed withdrawal cancellation) that appears in list assertions.
- **`ReturnLike`, `PaymentLike`, `CreditNoteLike`** — narrow interfaces used with `cy.apiAs` to type API responses.
- **`filterReturnsBy(filter, label)`** — selects an option in the status or reason filter dropdown and clicks the search-submit button.
- **`listShows(ids, others?)`** — asserts the returns list length and that each expected id appears via its `href`, never by row position.
- **`describe('OP22 · …')`** — single `it` block that sequences: support queue & filters → approve → decline (with required-reason guard) → list distinction → warehouse receive with deduction → refund arithmetic → inventory restock → credit note → customer views both outcomes.

## Relationships

- **`tests/support/e2e/steps.ts`** — provides `centsOf` (reads a cent-denominated amount from a page element) and `eventually` (retries an API call until a predicate passes). No other shared helpers are imported; the file is otherwise self-contained.

## Notes

- `beforeEach` calls `cy.restore()` between visits, implying a seed/reset fixture the test suite manages elsewhere.
- The deduction input is typed in **dollars** (`DEDUCTION_CENTS / 100`), but the refund assertion compares in **cents** via `centsOf` — unit mismatch is intentional and easy to get wrong when editing.
- Two `subjectId` calls (`return.requested`, `return.requestedSecond`) pull the seeded request ids; the story deliberately opens two requests because opening one is rate-limited.
- The refund is expected to be **full payment minus the deduction** (delivery included), because defective goods are the seller's fault. This differs from a withdrawal return where delivery would not be refunded.
- Role-separation assertions (e.g. `return-receive-form` absent for support, `return-approve` absent for warehouse) are the core "permission" checks; they are interleaved with functional steps rather than grouped.
