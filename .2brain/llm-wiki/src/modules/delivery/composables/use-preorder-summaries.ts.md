---
source: src/modules/delivery/composables/use-preorder-summaries.ts
sha256: 433c623ccd966d7a420608b6e1a098b62b81fa15895eab33aa1539e4ea0550ab
generated_at: 2026-10-17T00:47:45.016194+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/composables/use-preorder-summaries.ts

## Purpose

Provides a narrow, read-oriented composable for the preorder board's product table. It wraps the delivery store so that a consuming component gets exactly the three values it needs (`summaries`, `loading`, `load`) without importing the full store and gaining a second, wider path into the module's state.

## Key elements

- **`usePreorderSummaries`** (the sole export) — a composable that calls `useDeliveryStore()`, pulls `preorderSummaries` and `loading` via `storeToRefs`, and returns:
  - `summaries` — a `computed` ref that mirrors `preorderSummaries`.
  - `loading` — a reactive ref straight from the store.
  - `load` — a direct reference to `store.fetchPreorderSummaries` (not a new function; the store method itself).

## Relationships

- **`src/modules/delivery/store.ts`** — Source of all three values. The composable calls `useDeliveryStore()` and reads `preorderSummaries`, `loading`, and `fetchPreorderSummaries` from the returned store instance. It holds no state of its own.
- **`src/modules/delivery/index.ts`** — Module entry point. This composable lives under the same `delivery` module and is expected to be re-exported or consumed alongside the store's public surface.

## Notes

- The file is intentionally a **read façade**, not a second store. Its doc comment states the design rationale explicitly: a sibling component that only renders the table should not import the store and thereby get write access it doesn't need.
- `load` is the store method passed through by reference. Calling it is equivalent to calling `store.fetchPreorderSummaries()` directly—there is no extra logic, debouncing, or caching in this composable.
- `summaries` is a thin `computed` wrapper around a single ref; it adds no transformation. Treat it as an alias for `store.preorderSummaries`.
