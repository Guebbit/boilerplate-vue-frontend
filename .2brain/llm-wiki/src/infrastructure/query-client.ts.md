---
source: src/infrastructure/query-client.ts
sha256: 0cc7ea7ccb6de54179bb4b98e6d2f5173219c2bb52aa99b169fa3e7f63d170ca
generated_at: 2026-10-02T12:01:25.123645+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/query-client.ts

## Purpose

Exports the app's single shared TanStack `QueryClient` instance. All `useStructureRestApi`, `useStructureSearchApi`, and `useStructureCrudApi` Pinia stores receive this same client, enabling cross-resource cache invalidation scoped by `resourceKey`. It is passed explicitly via each store's `queryClient` option rather than through Vue's injection context, so it works identically in a mounted app, in store unit tests, and in router guards where no component tree exists.

## Key elements

- **`queryClient`** (exported `const`) — A `QueryClient` configured with:
  - `queries.retry: false` and `queries.networkMode: 'always'`
  - `mutations.networkMode: 'always'`
  - These override TanStack's defaults (3 retries, pause-when-offline) to match the single-request-per-call behaviour the existing stores and their unit tests were written against (vue-toolkit 4.x convention).

## Relationships

No graph neighbors. The file has no imports beyond `@tanstack/vue-query` and no listed dependent files in the dependency graph. In practice, every structure store and `main.ts` consume this export, but those relationships are not captured in the graph.

## Notes

- **Why explicit passing over `useQueryClient()` injection:** A Pinia store constructed outside a mounted component (unit test, early router guard) has no Vue injection context. `app.runWithContext` only helps after `app.use(pinia)` on a real mounted app. Passing the client as a plain option avoids that dependency entirely.
- **`main.ts` also registers this same instance with `VueQueryPlugin`**, so any future ad-hoc `useQueryClient()` call in a component resolves to the same cache rather than a disconnected second client.
- **Do not remove `retry: false` / `networkMode: 'always'`** without updating every store unit test; they are load-bearing for the "one mocked request per call" test pattern.
