---
source: src/ui/composables/use-query-synced-filters.ts
sha256: 84d1a9d5d444b07a3b38faa23231f84b9aea68e57ecb18a0d0fd3e68c2b29587
generated_at: 2026-10-17T01:57:23.258050+00:00
model: ollama:qwen3.8:27b
---

# src/ui/composables/use-query-synced-filters.ts

## Purpose

A Vue composable that ties a list page's filter state to the URL query string. It hydrates initial filters from the current route query on load and provides a single `syncToQuery` call that mirrors subsequent filter changes back into the URL—enabling shareable, bookmarker-friendly filtered views without each page hand-rolling its own query-string plumbing.

## Key elements

- **`QuerySyncedFilters<T>`** (exported interface) — the return shape: `initial: T` (filters read from the query at call time) and `syncToQuery: (filters: T) => void` (writes filters back to the URL).
- **`useQuerySyncedFilters<T>(fromQuery, toQuery)`** (exported generic composable) — takes two caller-supplied mapping functions (`fromQuery: LocationQuery → T` and `toQuery: T → Record<string, string | number>`), calls `fromQuery` once against `route.query` to produce `initial`, and returns a `syncToQuery` that calls `router.replace({ query: toQuery(filters) })`.

## Relationships

- **`vue-router`** — imports `useRoute`, `useRouter`, and the `LocationQuery` type; all URL interaction flows through these.
- **`webhooks/views/WebhookDeliveries.vue`** — identified in the module doc-comment as the page whose inline query-sync logic this composable extracted and generalised.

## Notes

- Uses `router.replace`, **not** `router.push`, so rapid filter edits (e.g. typing in a search box) do not stack discrete history entries.
- The composable is deliberately generic: it never inspects the filter object. All shape knowledge lives in the caller's `fromQuery`/`toQuery` closures.
- `toQuery` should **omit** fields whose value equals the default (e.g. page = 1, empty search string) so the URL stays clean; the composable passes whatever record `toQuery` returns straight to `router.replace`.
- `initial` is computed synchronously at composable-call time from the *current* route query; it is not reactive to later navigation.
