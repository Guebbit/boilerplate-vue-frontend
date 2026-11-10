---
source: tests/e2e/specs/journeys/at5-orders-filters.cy.ts
sha256: f2d44cfadd2c5368337d98e2ff1d330f52eb44f33225ced3936d44da5a2fcb40
signature: c2f5468fe6b64b75ac8ff8d43c0b29314418f2a680d5a7068f89238c780c912d
generated_at: 2026-11-10T06:51:15.826294+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/at5-orders-filters.cy.ts

## Purpose

End-to-end test verifying that every filter on the staff orders list (`/en/sales/orders`) correctly narrows the visible rows to matching orders and that "reset" restores the full list. It covers status, id, email, awaiting-transfer, deleted, payment/fulfillment/return status, created and paid date windows, and product-id filters.

## Key elements

- **`narrowedTo(apply, included, excluded)`** – local helper that applies a filter, submits the search, asserts the listed row-ids include the expected orders and exclude the others, then resets. Used for the "advanced" filter group.
- **`describe('AT5 · Orders list filters')`** – top-level suite. `beforeEach` restores DB state, logs in as admin, visits the orders page, and settles the network.
- **Test 1** (`status, id, email, awaiting transfer and deleted…`) – manually sequences each basic filter, checks row text or ids, and confirms reset restores the full list.
- **Test 2** (`payment, fulfillment and return status, the created and paid windows…`) – uses `narrowedTo` plus `cy.apiAs` to fetch a return's `orderId` and an order's `createdAt`/`paidAt`/items so assertions are grounded in real seeded data rather than hard-coded ids.

## Relationships

- **`tests/support/e2e/steps.ts`** – provides the four utilities this file imports: `listedIds` (Chai-jQuery expectation over `[data-test=list-row]` ids), `submitSearch` / `resetSearch` (click the search & reset buttons), and `dayShifted` (shift an ISO date string by N days for window filters).

## Notes

- The file is annotated `// requires-module: account, orders`, meaning the test fixture/seed must include both modules before it runs.
- Assertions deliberately pair every "included" id with at least one "excluded" id to guard against a filter that matches *everything*.
- The return-status filter asserts on the *order* id behind a return (fetched via `GET /returns/:id`), not on the return id itself, because the list shows orders.
- The paid-window test includes a negative case (future window → zero rows) before the positive case, making the assertion asymmetric from the other filters.
