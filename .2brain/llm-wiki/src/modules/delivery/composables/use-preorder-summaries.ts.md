---
source: src/modules/delivery/composables/use-preorder-summaries.ts
sha256: 433c623ccd966d7a420608b6e1a098b62b81fa15895eab33aa1539e4ea0550ab
signature: 0eb18fd2560cbc7dbcf717e3b744576b0d909538c33bb8607ad40cb2ab0324f4
generated_at: 2026-11-10T04:17:20.471636+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/composables/use-preorder-summaries.ts

## Purpose

Narrow read interface for the preorder board's product table. Exposes the delivery store's preorder summaries, loading flag, and re-fetch action to sibling components without granting them the store's full write surface. Exists as a composable rather than a direct store import so consumers get exactly one scoped entry point.

## Key elements

- **`usePreorderSummaries()`** *(exported)* — The sole export. Returns:
  - `summaries` — a `computed` ref mirroring the store's `preorderSummaries` array.
  - `loading` — reactive loading flag indicating an in-flight fetch.
  - `load` — direct reference to the store's `fetchPreorderSummaries` action; call it to re-fetch all summaries.

## Relationships

- **`src/modules/delivery/store.ts`** — Consumes `useDeliveryStore` from this file; pulls `preorderSummaries`, `loading`, and `fetchPreorderSummaries` via `storeToRefs` and direct property access. All data in this composable originates there.
- **`src/modules/delivery/index.ts`** — Module barrel; this composable is part of the delivery module's public surface and is reachable through that index.

## Notes

- The JSDoc describes this as *the half* of the preorder board's product table that lives in `delivery` — the complementary half is rendered by a different module, so don't expect the full table data here.
- Although `load` is technically a mutation trigger, the composable deliberately exposes only that single re-fetch action rather than the store's broader write API. Treat it as read-oriented with a refresh escape hatch.
