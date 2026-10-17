---
source: src/modules/orders/composables/use-order-actions-refetch.ts
sha256: a188a3a183d37626eaa7659ae698bdc669467f570018f0bdc466be0df2e9dce0
generated_at: 2026-10-17T01:15:03.715551+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/composables/use-order-actions-refetch.ts

## Purpose

Ensures an order-detail page retrieves the full `actions` field when it arrives from the orders list, which only seeds a summary row (no `actions`) into the store. Because the store's `watchOne`/`watchOrder` is cache-first, the page would otherwise settle for that incomplete row. This composable forces exactly one `GET /orders/:id` re-fetch to populate `actions`, preventing the silent "no status moves" bug that originally affected `OrderEdit.vue`.

## Key elements

- **`useOrderActionsRefetch(currentOrder, targetId, fetchOrder)`** — The sole export. Sets up an `immediate` watch on `currentOrder`; when the resolved record's `id` matches the routed `targetId()` and `actions` is still `undefined`, it calls `fetchOrder(id, { forced: true })` exactly once.
- **`refreshedForActions` (local latch)** — Boolean guard ensuring at most one forced fetch per mount. Never reset by any code path.
- **`targetId: () => string | undefined`** — Passed as a getter so the id can change reactively (e.g. navigation) without re-running the latch.

## Relationships

- **`src/modules/orders/views/Order.vue`** — Consumer; the e2e suite here originally caught the double-fetch race that motivated the single-fire contract.
- **`src/modules/orders/views/OrderEdit.vue`** — Original motivation; without this composable it silently rendered no status-action buttons.
- **`src/modules/orders/tests/use-order-actions-refetch.spec.ts`** — Unit tests covering the latch, id-mismatch guard, and `actions`-present short-circuit.

## Notes

- **One-shot, non-resettable latch.** The contract is deliberately "exactly once per mount." A second forced fetch that races the toolkit's loading lock will silently drop a user action (e.g. a cancel click) — this was observed in `Order.vue` manual testing and caught by its e2e suite. Do not add a reset or allow re-entry.
- **`immediate: true`** on the watch means the check also runs synchronously at setup, not only on subsequent changes.
- **`order.actions !== undefined`** is the guard, not `!== null`. The store's detail shape uses `undefined` for "field not yet loaded."
