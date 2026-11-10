---
source: tests/e2e/specs/journeys/op15-order-housekeeping.cy.ts
sha256: 67504733e7994d72dbd2e2d383d8973ff9223cfc33eb1243f9f07354d28e5f9d
signature: 76251717e2b118fd94ccfdf27a2ea8144ff0bad3815cc60ee08b7faed0064916
generated_at: 2026-11-10T07:12:45.307231+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op15-order-housekeeping.cy.ts

## Purpose

E2E Cypress spec for the OP15 "Order housekeeping" journey. It verifies that a shop manager can soft-delete a canceled order (hiding it from the customer while keeping it on the staff list), restore it, and hard-delete only a canceled, never-paid order. It also asserts that paid and still-open orders never surface a delete action, and that canceling an order frees its reserved inventory back to the shelf.

## Key elements

- **`OrderSearchLike`** — interface modeling the customer-facing order-search response (`items: { id }[]`).
- **`ProductLike`** — interface modeling the admin's view of a product's `available` count.
- **`customerListing(orderId)`** — calls the customer `POST /orders/search` endpoint and resolves to the array of matching order IDs (empty when hidden).
- **`rowOf(orderId)`** — visits `/en/sales/orders?id=<id>` (deep-link) and yields the single list-row jQuery element for that order.
- **`describe('OP15 · Order housekeeping')`** — one `it` block that exercises the full soft-delete → restore → hard-delete sequence, plus the "paid order has no hard delete" and "open order must be canceled first" guard-rails. Asserts inventory increases by 1 after the cancel that precedes the hard delete.

## Relationships

- **`tests/support/e2e/steps.ts`** — provides the `eventually` polling helper, used here to wait for the asynchronous stock-return after canceling the order before asserting the product's `available` count.

## Notes

- The test nests four `cy.subjectId(...).then(...)` chains (paid, unpaid, canceled, product), making the body deeply indented; any refactor of the fixture setup will touch all four levels.
- Rows are located via the `?id=` query parameter (a deep link on the list URL), never by typing into a search box.
- `eventually` is used only at the end to poll product availability, because the inventory return from cancel is asynchronous on the backend; the assertion expects exactly `shelf.before + 1`.
- `beforeEach` calls `cy.restore()` between visits to reset database state, so the test is order-independent.
- Hard delete is permanent: after it, the row simply does not exist in the list (no restore button), unlike soft delete which leaves a `row-restore` control.
