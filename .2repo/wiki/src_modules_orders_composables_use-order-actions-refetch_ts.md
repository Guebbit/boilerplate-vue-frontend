# src/modules/orders/composables/use-order-actions-refetch.ts

## Purpose

A Vue composable that forces exactly one detail re-fetch of the current order when the store's cache-first record resolves without an `actions` array. The orders list seeds the store with a summary row lacking `actions`, and cache-first watchers (`watchOne`/`watchOrder`) will settle on that row unless something explicitly re-fetches via `GET /orders/:id`. This composable was factored out so every order-detail page can share the guard and no page silently omits it.

## Key elements

- **`useOrderActionsRefetch(currentOrder, targetId, fetchOrder)`** — The sole export. Sets up a single `watch` (with `immediate: true`) on `currentOrder`. When the resolved order matches the routed id and has `actions === undefined`, it calls `fetchOrder(order.id, { forced: true })` and sets a local `refreshedForActions` latch to prevent any further fetches for the lifetime of the mount.

## Relationships

No graph neighbors are registered for this file. Its three parameters bind it at the call site to the order store (the `currentOrder` ref, the `fetchOrder` action, and a reactive `targetId` getter), but those bindings live in the consuming order-detail pages rather than in this module's import graph.

## Notes

- **One-shot latch.** The `refreshedForActions` boolean guarantees at most one forced fetch per mount. A second forced fetch racing the toolkit's loading lock previously swallowed a cancel click in `Order.vue`, caught only by its e2e suite.
- **`targetId` is a plain getter, not a `Ref`.** It is re-evaluated on each watch trigger so a navigation that changes the routed id retargets the latch without the caller needing to pass a ref.
- **`order.id !== targetId()` guard.** Prevents the latch from firing on a stale order record that was already in the store when the route changed.
- **`immediate: true`.** The watcher fires synchronously on setup, covering the case where `currentOrder` already holds a value at mount time (e.g., navigated from the list).
- **`void` before `fetchOrder`.** The promise is intentionally not awaited; the composable returns `void` and lets the store's own state updates drive the UI.
