---
source: tests/e2e/specs/journeys/bo1-the-buyer-backorders.cy.ts
sha256: f0114e77abdbd9a3829722b096eba8551689a8e6f405a98f834060b534f9acf3
signature: f1a70e6fbfbfc9b3947847efe7922211d04a1846158882999c1f10a5dfa49ec5
generated_at: 2026-11-10T06:53:08.375723+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/bo1-the-buyer-backorders.cy.ts

## Purpose

End-to-end Cypress journey test for backorder purchasing. It verifies that when a product has partial stock and backorder enabled, a buyer can add more units than are on the shelf; the order records the backordered quantity and a promise date; the owed portion stays on hold until stock arrives, at which point the hold is released and the full order ships.

## Key elements

- **`unique()`** — returns a `${Date.now()}-${random}` string so two specs hitting the same backend don't collide on product names.
- **`OrderLike`** — minimal read-only shape of the order response the test asserts against (`id`, `items[].quantity`, `items[].backorderedQuantity`, `items[].promiseDated`).
- **`DeliveryLike`** — minimal read-only shape of the fulfillment-order view (`items[].status`, `items[].holdReason`).
- **`describe('BO1 · The buyer backorders')`** — single spec. `beforeEach` visits `/en`, calls `cy.restore()`, visits again. The one `it` block walks the full flow: create product → enable backorder + set limit → put 1 unit on shelf → buy 2 → assert cart shows "Backorder" → checkout → assert `backorderedQuantity === 1` and `promiseDated === true` → pay → assert one fulfillment item is `on_hold` with `awaiting_stock` → receive stock → assert all items leave `on_hold` → ship.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports five helpers:
  - `createProductThroughTheForm` — creates a product via the UI form, returns its id.
  - `releaseDateIn(days)` — returns a future ISO date string used as the restock/promise date.
  - `checkoutAs<T>(user)` — performs the full checkout flow and returns the typed order object.
  - `eventually(fn, predicate)` — polls an API call until the predicate is truthy, returning the final response.
  - `shipThroughTheApi(orderId, trackingNo)` — marks the order as shipped via API.

## Notes

- The file header marks it as **not yet run in a browser**; the comment warns that the first real run may need selector adjustments.
- `beforeEach` calls `cy.restore()` to reset backend state between runs — this depends on a custom command registered elsewhere in the support files.
- The `requires-module` comment at the top (`account, cart, delivery, inventory, orders, products`) documents which backend modules must be active for the test to pass.
- Polling is done via `eventually()` rather than fixed `cy.wait` calls, so the test is timing-agnostic for the hold-release step.
- All API interactions use role-scoped calls (`cy.apiAs('editor' | 'admin' | 'user', …)`), reflecting the multi-actor nature of the journey.
