---
source: tests/e2e/specs/journeys/op21-stock-counters-follow-an-order.cy.ts
sha256: e9c8ef7f6cccad697e9680e1f913c0ae75759efea1f11d034709fe58a9159061
generated_at: 2026-10-17T02:20:47.222221+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op21-stock-counters-follow-an-order.cy.ts

## Purpose

End-to-end journey test that walks a single product through the full stock lifecycle—reservation, payment, cancellation/release, and write-off—and asserts at each step that the inventory board's on-hand / reserved / available counts are correct, the ledger names each movement and links it to the originating order, and a guest's cached product page reflects "out of stock" immediately once stock hits zero.

## Key elements

- **`SHELF`, `FIRST_ORDER`, `SECOND_ORDER`** — Constants (5, 2, 1) defining the unit quantities used throughout the test.
- **`Counts`** — Tuple type `[onHand, reserved, available]` used to express expected board values.
- **`OrderLike`** — Minimal interface (`{ id: string }`) for the order object returned by checkout.
- **`pickLedgerProduct(title)`** — Types a product title into the ledger's autocomplete filter and selects it from the listbox.
- **`boardShows(title, expected)`** — Reloads `/en/inventory`, finds the product row, and asserts the three numeric cells match the expected `Counts`.
- **`placeOrder(productId, quantity)`** — Creates a cart item, sets shipping to pickup, calls `checkoutAs`, and returns the order id.
- **`describe('OP21 …')`** — Single test that: creates a product, verifies a guest sees it in stock, logs in as admin, places/cancels/pays orders, writes off remaining stock, verifies ledger reason ordering and per-order row counts, then logs out and confirms the guest page shows "Out of stock".

## Relationships

- **`tests/support/e2e/steps.ts`** — Provides `checkoutAs`, which performs the multi-step checkout flow (shipping, payment method, confirm) and returns the created order. Used once inside `placeOrder`.

## Notes

- The product title is suffixed with `Date.now()` to avoid collisions with parallel or re-run tests.
- `beforeEach` calls `cy.restore()` to reset backend fixtures; `cy.visit('/en')` is called before and after to re-render the app shell.
- The stock write-off step asserts the board cannot show fewer on-hand units than are still reserved by the paid order (`boardShows(title, [FIRST_ORDER, FIRST_ORDER, 0])`).
- The ledger row-count check encodes a business rule: paying an order does **not** add a new ledger row—the original "Reserved" row is reused. A cancelled order has two rows (Reserved + Released); a paid order has one.
- The final "out of stock" assertion is the cache-clearing test: trivially true against the demo backend, but the real test when Redis caching with a production TTL is active.
- The file header declares `requires-module: account, cart, inventory, orders, payments, products`, indicating all six backend modules must be enabled for the test to run.
