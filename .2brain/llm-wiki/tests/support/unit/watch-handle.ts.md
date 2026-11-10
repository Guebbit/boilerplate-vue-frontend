---
source: tests/support/unit/watch-handle.ts
sha256: d64316fa50e547c5d2673c8a673b68ef0e91196b3d799a98cb6aa15df0e69cfd
signature: 8d186e6a09b84282b12a752fdfcf7feb0f087d88a4785740489d9df51c040b93
generated_at: 2026-11-10T07:43:14.058226+00:00
model: ollama:qwen3.8:27b
---

# tests/support/unit/watch-handle.ts

## Purpose

Provides a single reusable factory (`noopWatchHandle`) that returns a stand-in `IWatchHandle<T | undefined>` satisfying the vue-toolkit 5 watcher contract, so unit specs can mock a store's `watchTarget`/`watchOne` methods without wiring up a real TanStack watcher. It centralises the shape (data, isFetching, isPending, dataUpdatedAt, stop, refetch, suspense, error) so four separate spec files don't each hand-roll the same object.

## Key elements

- **`noopWatchHandle<T>()`** — Generic factory (the sole export) returning an object typed as `IWatchHandle<T | undefined>`. The handle is inert: `data` is a `computed` resolving to `undefined`, `isFetching` is `false`, `isPending` is `true`, `dataUpdatedAt` is `0`, `stop` is a no-op, `refetch`/`suspense` return `Promise.resolve(undefined)`, and `error` is `null`.

## Relationships

- **Imported by** `order-edit-view.spec.ts`, `order-view.spec.ts`, `product-view.spec.ts`, and `user-view.spec.ts` to replace each module's store watch functions (`useX`, `watchProduct`, etc.) with a mock that never triggers a real fetch.
- **Depends on** `@guebbit/vue-toolkit` (type-only import of `IWatchHandle`) and `vue` (`computed`, `ref`) to build the reactive shape.

## Notes

- The handle is intentionally "never fetched": `data` is always `undefined` and `isPending` stays `true`. Specs that need a resolved state must override the relevant fields after receiving the handle.
- The function is generic over `T`, but because `data` is hardcoded to `undefined`, callers get `IWatchHandle<T | undefined>` — the `T` parameter only satisfies the type signature, it doesn't influence runtime behaviour.
- This is a `@module` (no default export); consumers import the named `noopWatchHandle` symbol.
