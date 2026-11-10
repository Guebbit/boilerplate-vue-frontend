---
source: src/ui/composables/use-list-search.ts
sha256: 3b5505ecbfe6177a59c1a935ee79bd1bc91e1d16d665c08fb4846c94d0fcf66a
signature: 880aa0d16f958bb09ae82a2c9c181d3c3b3b8584586529f246a520a43578bdee
generated_at: 2026-11-10T06:24:02.688145+00:00
model: ollama:qwen3.8:27b
---

# src/ui/composables/use-list-search.ts

## Purpose
A single Vue composable that provides the two handlers every filtered list page needs — apply current filters and clear all filters. It exists to replace the same four-line snippet that was duplicated across five list pages.

## Key elements
- **`ListSearchOptions<TFilters>`** (interface) — the contract a list page must supply: a `filters` ref, a `page` ref (1-based), a `search()` trigger, and an optional `onApplied` callback (used by `useListUrlState().sync` to keep the URL in step).
- **`ListSearchHandlers`** (interface) — the two functions returned: `handleSearch` (apply filters, restart from page 1) and `handleReset` (clear all filters, reload page 1 from the API).
- **`useListSearch<TFilters>`** (function) — builds and returns the `ListSearchHandlers`. `handleSearch` sets `page` to 1, calls `onApplied`, then `search()`. `handleReset` sets `filters` to `{}`, sets `page` to 1, calls `onApplied`, then `search(true)` to bypass the cache.

## Relationships
No graph neighbors recorded. The composable is consumed by individual list pages (referenced in its module docstring) and expects the caller to wire in their own store refs and URL-sync callback.

## Notes
- `TFilters` is expected to be a fully-optional object shape, so `{}` is assignable. The `as TFilters` cast in `handleReset` relies on that invariant; if a page's filter type has required fields, the cast will hide a real type error.
- `handleReset` passes `true` to `search()` to force a network fetch past the cache; `handleSearch` does not — it relies on the filter change itself to invalidate the cache.
- `onApplied` is called *before* the search resolves, so any URL sync happens while the fetch is still in flight.
