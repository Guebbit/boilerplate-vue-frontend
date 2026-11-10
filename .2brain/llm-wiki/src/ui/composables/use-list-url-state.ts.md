---
source: src/ui/composables/use-list-url-state.ts
sha256: 7f628412834bb4d31287eebdbc17b0c226bf90ee9b72231130f161c98fccffc6
signature: 2206899fd2b3361db9da031dc62b7961a61bd693ded08915fb04148c8b6540c4
generated_at: 2026-11-10T06:24:28.456753+00:00
model: ollama:qwen3.8:27b
---

# src/ui/composables/use-list-url-state.ts

## Purpose

Vue composable that mirrors a list page's filters, page, and page-size into the URL query string (and back on load) so that a filtered view is bookmarkable and shareable. The store remains the single source of truth; this composable only reads from the URL once on mount and writes back via `router.replace` after each search or page/size change.

## Key elements

- **`UrlParameterKind`** (type) — Union describing how a filter serializes: `'string' | 'number' | 'boolean' | readonly string[]`.
- **`ListUrlStateOptions<TFilters>`** (interface) — What a page passes in: `filters`, `page`, optional `pageSize`, the `params` map declaring which filter names travel in the URL and their kind, and an optional `prefix` to namespace keys when two lists share a page.
- **`ListUrlState`** (interface) — The return type; exposes a single `sync()` method.
- **`parseUrlParameter`** (exported function) — Converts a raw query-string value to its declared kind; returns `undefined` for values outside the allowed set (e.g. an enum hit that is not in the closed list).
- **`useListUrlState`** (exported composable) — The main entry point. On call it hydrates the store's refs from `route.query` (only if at least one of the page's own keys is present), then watches `page`/`pageSize` to call `sync` automatically. Returns `{ sync }` for the page to invoke after a manual search.
- **`hydrate`** (internal) — Reads the current `route.query`, parses declared params, sets `pageSize` before `page` (so the toolkit's size-change reset doesn't clobber the page), and assigns the resulting subset to `filters.value`.
- **`sync`** (internal) — Serializes the current filter values, page, and page-size into a new query object, preserves any foreign query keys the page does not own, and calls `router.replace`.
- **`firstOf` / `positiveInteger`** (internal helpers) — Normalise `LocationQueryValue` entries and validate positive integers for page/pageSize.

## Relationships

- **`scripts/lighthouse/evaluate.ts`** — The Lighthouse script exercises live pages; any page that calls `useListUrlState` will trigger a query-string write during evaluation runs, making URL-state behaviour observable in the Lighthouse flow.
- **`tests/cross-cutting/module-map.spec.ts`** — This cross-cutting spec asserts the module map; `use-list-url-state.ts` appears as a node in that map, tying it to the project's structural tests.

## Notes

- **Hydration is one-shot.** The composable reads the URL only on initial call. A client-side navigation to the same route with a different query (e.g. a sidebar link) will *not* re-apply filters. This is intentional and matches prior page behaviour.
- **`router.replace`, not `router.push`.** Page and page-size changes are written with `replace` so they do not create discrete back-button stops. An eslint-disable comment notes that the returned promise is intentionally not awaited; navigation failures surface through the global `router.onError` handler in `app/router/index.ts`.
- **Foreign query keys are preserved.** `sync` reads the current `route.query`, strips the page's own keys, and re-merges the rest before writing, so tracking parameters or external tags survive a filter change.
- **`pageSize` is set before `page` during hydration** because the search toolkit resets the page to 1 whenever the size ref changes; ordering prevents the page value from being lost.
- **Enum safety:** For `readonly string[]` kinds, a value not in the set is silently dropped rather than forwarded to the API.
- **Default page-size suppression:** `sync` omits `pageSize` from the URL when it equals the initial value captured at composable creation, keeping the query string clean for the common case.
