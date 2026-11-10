---
source: tests/e2e/specs/journeys/op21-stock-counters-follow-an-order.cy.ts
sha256: d9b6e477cc3f81264461e2d98e8ba9e8f2caf8920a527f20419fe5ba8b9109f6
signature: b7f8c4f61502b03c85781db7eb4218e93f61f745640401e2a76ea03fa5b588f1
generated_at: 2026-11-10T07:14:01.720131+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op21-stock-counters-follow-an-order.cy.ts

## Purpose

Cypress end-to-end test (story OP21) that walks a single product through its full stock lifecycle — reservation at checkout, payment, a second order placed then canceled, a refused over-write-off, a successful write-off, and finally shipment — asserting after each step that the inventory board's on-hand / reserved / available counters, the movement ledger (reasons and order links), and a guest's product page all reflect the correct state. It exists to catch regressions in the coupling between order state transitions and stock bookkeeping.

## Key elements

- **Constants** `SHELF` (5), `FIRST_ORDER` (2), `SECOND_ORDER` (1) — the unit quantities driving the scenario.
- **`Counts`** type — a 3-element tuple `[onHand, reserved, available]` for board assertions.
- **`pickLedgerProduct(title)`** — selects a product in the inventory ledger's autocomplete filter.
- **`boardShows(title, expected)`** — reloads `/en/inventory` and asserts the three count cells for a product row.
- **`adjustBy(title, delta, note)`** — fills and submits the inventory adjustment form (positive = receive, negative = write off).
- **`placeOrder(productId, quantity)`** — adds to cart, sets pickup shipping, checks out via `checkoutAs`; returns the order id as a Cypress chainable.
- **`describe('OP21 …')` / `it(…)`** — the single test; `beforeEach` visits the site, restores DB state, and visits again.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports `checkoutAs` (performs the checkout API call and returns the created order) and `shipThroughTheApi` (transitions an order to shipped). Both are called inside the test body to drive the order lifecycle without UI steps.

## Notes

- The `// requires-module:` comment at the top lists the backend modules the test depends on (account, cart, inventory, orders, payments, products); the test runner or CI must have them enabled.
- `beforeEach` calls `cy.restore()` between visits — the test relies on a clean database snapshot per run.
- The ledger renders movements **newest-first**; assertions read the DOM order and call `.toReversed()` before comparing against the chronological expected list.
- Paying a reserved order does **not** create a new ledger row; the single "Reserved" row persists until shipment. The test asserts exactly 1 row for the paid order and 2 rows (Reserved + Released) for the canceled one.
- A write-off that would leave on-hand below the reserved count is rejected with **409**; the test asserts both the status code and a non-empty `[data-test=adjust-error]` message.
- The final "guest sees out of stock" step depends on cache invalidation on stock writes. With the demo backend (no cache) it passes trivially; with Redis + a production TTL it is the real assertion.
- `placeOrder` hardcodes `shippingMethodId: 'pickup'` so no address payload is needed.
