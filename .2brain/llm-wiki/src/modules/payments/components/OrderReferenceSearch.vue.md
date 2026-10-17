---
source: src/modules/payments/components/OrderReferenceSearch.vue
sha256: 448586c23feb26c782e0590c2925ca72a44b0f51ba829247880879108fa1ac1e
generated_at: 2026-10-17T01:21:10.967618+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/OrderReferenceSearch.vue

## Purpose

A self-contained search card that lets an operator paste an RF (creditor) reference from a bank statement and resolve it to the order it settles. It emits the found `Order` to its host rather than navigating, so it can be mounted in any context without requiring an `orders` module or route. Gated behind the `create:Payment` permission.

## Key elements

- **`search()`** — Trims the typed reference, no-ops if blank or a search is already in-flight, calls `paymentsStore.findOrderByReference(typed)`. On a hit it clears the field and emits `found` with the order; on a miss or thrown error it populates the local blocking-error state.
- **`useBlockingError()`** (from `@/infrastructure/utils/use-blocking-error.ts`) — Provides `searchError`, `searchErrorType`, `reportSearchError`, `warnSearchNotFound`, and `clearSearchError`. Both "not found" (warning tone, reported to Faro) and hard failures (error tone) block the search in place.
- **`emit('found', order)`** — The sole outbound signal; the host decides what to do with the order. This component names no route.
- **`paymentsStore.loading`** — Read to disable the submit button and short-circuit concurrent searches.
- **`InlineErrorAlert`** — Renders the blocking error/warning inline in the card instead of using a toast.

## Relationships

- **`src/modules/payments/store.ts`** — Imports `usePaymentsStore`; calls `findOrderByReference(reference)` and reads `.loading`.
- **`src/modules/orders/views/OrdersList.vue`** — Primary documented host: listens for the `found` event and navigates to the order's edit page. `OrderReferenceSearch` deliberately avoids that navigation itself.
- **`src/modules/payments/index.ts`** — Module barrel that publishes this component so hosts outside the payments module can mount it.
- **`src/modules/payments/tests/order-reference-search.spec.ts`** — Unit/spec coverage for this component's search, emit, and error paths.

## Notes

- Dual `<script>` blocks: the non-setup block exists only to set `name: 'OrderReferenceSearch'` for DevTools and `<KeepAlive>`; `<script setup>` cannot declare a name on its own.
- The component never imports from the `orders` module. The module docs explicitly state `payments` declares no `MODULE_EDGES` reach into `orders` — the emit-then-let-host-act pattern is the enforcement mechanism.
- Both a "no match" and a network/500 failure prevent the search from completing; the only difference is tone (`warn` vs. `report`) and whether Faro is notified. This is intentional per `docs/theory/request-flow.md`.
- Typing in the input (`@update:model-value`) clears any prior blocking error, so a stale message never lingers while the operator corrects a typo.
