---
source: tests/cross-cutting/page-window-density.spec.ts
sha256: 66c6ba4d485e9785ccd509d23f606d152a2693d86cec32ccdc3f04f419f8e761
signature: fd7dcd719285ee6e3e54885939e6537b65a9b7adcd3216e9d87ebc2d6baf93d6
generated_at: 2026-11-10T06:39:35.497841+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/page-window-density.spec.ts

## Purpose

Regression guard for a runtime guarantee of `@guebbit/vue-toolkit`: `pageItemList` is always dense—no `undefined` elements, no sparse-array holes—because the toolkit's internal `searchGet → getRecords` pipeline ends in `.filter(Boolean)`. The spec exists to catch a future toolkit change that would start returning holes, failing loudly here instead of letting four views silently render `undefined`.

## Key elements

- **`ProbeRow`** — minimal `{ id, name }` interface; only `id` is needed as the toolkit's dictionary key.
- **`expectDense(window)`** — asserts both `window.includes(undefined)` is false *and* every index from `0` to `length-1` passes the `in` check. Two distinct failure modes (undefined element vs. true sparse hole) are checked separately.
- **`describe('the toolkit page window is dense')`** — three tests:
  - API returns `undefined` in the items array → window shortens, no hole.
  - `deleteRecord` on a cached id → window shortens, no hole.
  - Same scenario through `useStructureCrudApi` (the wrapper every list store in this app uses).

## Relationships

No graph neighbors are recorded for this file.

## Notes

- **Why a spec, not a comment or type assertion:** the guarantee is about a *dependency's* runtime behaviour. The type `ComputedRef<T[]>` already implies density; a prose comment would not convince a reader to skip `.filter(Boolean)`. This test fails with a named assertion if the assumption breaks.
- **Fresh `QueryClient` per test:** `resourceKey: 'probe'` only needs uniqueness *within* a client, so a new instance avoids collision with the app's shared client.
- **`setActivePinia(createPinia())`** is called at the top of each test for Pinia isolation.
- **`immediate: false`** on `watchList` in the CRUD-API test: the watcher would otherwise fire on mount and race with the manual `search(true)` call.
- **`totalItems` in the mock responses** reflects the *post-filter* count (e.g., 2 when `undefined` is present), matching what the toolkit expects after its internal `.filter(Boolean)`.
