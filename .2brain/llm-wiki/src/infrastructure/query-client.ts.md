---
source: src/infrastructure/query-client.ts
sha256: 7132a5b03605e038609e1bac886299ecb9d3f93427b45d91b2a8290903e71609
signature: d70f77267dd1bdfd86d2e829d593d45211268c4094ad42d9d649bb293c4dfb37
generated_at: 2026-11-10T03:08:50.023903+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/query-client.ts

## Purpose

Defines the single shared TanStack `QueryClient` instance for the entire application. All API stores (`useStructureRestApi`, `useStructureSearchApi`, `useStructureCrudApi`) reference this one client so that `resourceKey`-scoped cross-resource cache invalidation works. The instance is created here to centralise the non-default query/mutation options and to provide a stable import target that works both in the mounted app and in store unit tests.

## Key elements

- **`queryClient`** (exported constant) – The app's sole `QueryClient`. Configured with:
  - `queries.retry: false` – disables TanStack's default 3-retry behaviour so each call issues exactly one request.
  - `queries.networkMode: 'always'` / `mutations.networkMode: 'always'` – prevents the client from pausing work when the browser reports offline.

## Relationships

- No graph neighbors are recorded for this file.

## Notes

- **Explicit injection over `useQueryClient()`.** The stores never call `useQueryClient()`. A Pinia store constructed outside a mounted component (unit test, early router guard) has no Vue injection context, so the client must be passed in as a plain option. `VueQueryPlugin` is installed in `main.ts` only as a safety net for any future direct `useQueryClient()` call in a component.
- **No retries, no offline pause.** Any code that depends on TanStack's default retry or network-gating behaviour will *not* get it here. If a new store or component expects retries, it must opt in per-query.
- **Single instance invariant.** Do not create additional `QueryClient` instances; a second instance would have a disconnected cache and would break the cross-resource invalidation contract.
