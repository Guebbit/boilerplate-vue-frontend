---
source: tests/e2e/specs/journeys/op15-order-housekeeping.cy.ts
sha256: 07547d17d92c3d5cfd50a1a026906d9fa4702d3dc91ad3343d2f8f1b4928fa72
generated_at: 2026-10-17T02:19:28.292005+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op15-order-housekeeping.cy.ts

## Purpose

End-to-end journey test for the OP15 "Order housekeeping" feature. It verifies the full lifecycle of order deletion from a shop manager's perspective: soft delete hides an order from the customer while keeping a marked row on the staff list, restore brings it back, hard delete is offered only for a cancelled-and-unpaid order, and that cancelling first returns held inventory units to the shelf.

## Key elements

- **`OrderSearchLike` / `ProductLike`** — minimal TypeScript shapes describing the customer order-search response and the admin product-read response, respectively.
- **`customerListing(orderId)`** — calls `POST /orders/search` as the `user` role and returns the array of matching order IDs (empty when the order is hidden from the customer).
- **`rowOf(orderId)`** — visits `/en/sales/orders?id=${orderId}` (deep-link filter) and yields the single `[data-test=list-row]` element for that order.
- **`describe('OP15 · Order housekeeping')`** — single `it` block that walks the entire soft-delete → restore → hard-delete flow, asserting UI state (`row-deleted`, `row-restore`, `row-hard-delete`), customer visibility, and post-cancel inventory release.
- **`requires-module` directive** (top comment) — declares that the test depends on the `account`, `inventory`, `orders`, and `products` seed modules.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports the `eventually` helper, which polls an async API call until a predicate holds. It is used at the end of the test to confirm the product's `available` count increments by one after the cancelled order's hard delete frees its held unit (eventual-consistency wait).

## Notes

- The test uses the `?id=` query parameter on the list URL as a **deep link** to scope the staff list to a single row; it never types an ID into a search box.
- `cy.subjectId('order.paid')`, `cy.subjectId('order.awaitingTransfer')`, and `cy.subjectId('product.rich')` pull pre-seeded fixture IDs — no manual data creation.
- Inventory release after cancel is **asynchronous**; the test relies on `eventually` (retried API poll) rather than a fixed delay.
- `beforeEach` calls `cy.restore()` to re-seed fixture state, so the single `it` block is the only scenario in this file.
- The `eventually` assertion checks `available === before + 1`, confirming exactly one unit was returned to the shelf by the cancellation.
