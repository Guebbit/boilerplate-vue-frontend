---
source: tests/support/unit/watch-handle.ts
sha256: d64316fa50e547c5d2673c8a673b68ef0e91196b3d799a98cb6aa15df0e69cfd
generated_at: 2026-10-17T02:29:21.472132+00:00
model: ollama:qwen3.8:27b
---

# tests/support/unit/watch-handle.ts

## Purpose

Provides a shared no-op factory for `IWatchHandle` (from `@guebbit/vue-toolkit`) so that unit specs can stub out a store's `watchTarget`/`watchOne` watchers without any real TanStack watcher ever being created. It exists to give four view specs a single, correct implementation of vue-toolkit 5's expanded handle shape instead of each spec re-deriving it.

## Key elements

- **`noopWatchHandle<T>()`** — The sole export. A generic factory returning an `IWatchHandle<T | undefined>` whose:
  - `data` is a `computed` that always yields `undefined`.
  - `isFetching` is `ref(false)`, `isPending` is `ref(true)`, `dataUpdatedAt` is `ref(0)`, `error` is `ref(null)`.
  - `stop` is a no-op; `refetch` and `suspense` both return `Promise.resolve(undefined)`.

## Relationships

Consumed by the following spec files, where it replaces the real watcher handle returned by a mocked store method so the mounted component never triggers an actual fetch:

- `src/modules/orders/tests/order-edit-view.spec.ts`
- `src/modules/orders/tests/order-view.spec.ts`
- `src/modules/products/tests/product-view.spec.ts`
- `src/modules/users/tests/user-view.spec.ts`

## Notes

- The return type is `IWatchHandle<T | undefined>`, not `IWatchHandle<T>` — `data` is *always* `undefined` by design; this handle never represents a resolved fetch.
- `isPending` is `true` and `isFetching` is `false`, mirroring the pre-fetch state vue-toolkit 5 exposes. If a spec asserts on `isPending`, it will see `true` here.
- The file is a plain module (no side effects, no Vue component); it can be imported safely anywhere a handle shape is needed without pulling in a real watcher lifecycle.
