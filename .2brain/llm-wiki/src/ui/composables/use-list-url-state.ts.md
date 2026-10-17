---
source: src/ui/composables/use-list-url-state.ts
sha256: 3b6d0b8e3b9eee04f908e1a0db789e902b3852763dce580c33d49c91964ef45c
generated_at: 2026-10-17T01:57:11.526698+00:00
model: ollama:qwen3.8:27b
---

# src/ui/composables/use-list-url-state.ts

## Purpose

Composable that mirrors a list page's filters, page number, and page size into the URL query string so a filtered view can be bookmarked, reloaded, or shared. The store remains the source of truth; this composable reads the URL into the store once on load and writes the store back into the URL after each search or page change.

## Key elements

- **`UrlParameterKind`** — union type (`'string' | 'number' | 'boolean' | readonly string[]`) declaring how one filter is encoded in the query string; a `readonly string[]` acts as a closed enum.
- **`ListUrlStateOptions<TFilters>`** — input interface: the store's `filters`, `page`, optional `pageSize` refs, the `params` map naming which filters travel in the URL and their kind, and an optional `prefix` for disambiguating multiple lists on one screen.
- **`ListUrlState`** — return interface exposing a single `sync()` method.
- **`parseUrlParameter(raw, kind)`** (exported) — converts a raw query string to its declared type; returns `undefined` when the string is invalid for that kind (e.g. out-of-enum value, non-finite number, non-`true`/`false` for boolean).
- **`useListUrlState(options)`** (main export) — performs a one-time hydration from `route.query` into the store's refs, then sets up a `watch` on `page`/`pageSize` that calls `sync()` automatically. `sync()` writes current state into the URL via `router.replace`, preserving any foreign query keys.
- **`firstOf`** (internal) — normalises a `LocationQueryValue | LocationQueryValue[] | undefined` to a single `string | undefined`.
- **`positiveInteger`** (internal) — validates a raw string as a positive whole number ≥ 1.

## Relationships

No graph neighbors are listed for this file.

## Notes

- **Hydration is one-shot.** The URL is read only once at composable setup; navigating to the same route with a different query does *not* re-hydrate.
- **Partial hydration.** The store's filters are *replaced* (not merged) when the URL names at least one of the page's own keys; a bare URL (no own keys present) leaves existing state untouched.
- **`router.replace`, not `router.push`.** Page and page-size changes never create a new history entry, so the back button doesn't step through each page.
- **Conditional writing.** `page` is only written when > 1; `pageSize` only when it differs from the initial default. Empty-string values for `'string'` kind are treated as absent.
- **Foreign key preservation.** `sync()` snapshots any query keys not owned by this list (e.g. tracking tags) and merges them back so they survive a replace.
- **`params` is a whitelist.** A filter not listed in `params` is never read from or written to the URL, regardless of its type.
- **Enum safety.** For `readonly string[]` kinds, a value outside the set is silently dropped rather than forwarded to an API that would reject it.
