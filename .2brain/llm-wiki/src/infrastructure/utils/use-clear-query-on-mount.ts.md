---
source: src/infrastructure/utils/use-clear-query-on-mount.ts
sha256: a2e6659016c71eb8e78e46886d4981c2dadefe14a28d1e028477afb6892c40d2
generated_at: 2026-10-02T12:06:42.649217+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/use-clear-query-on-mount.ts

## Purpose

A Vue composable that strips all query parameters from the current URL immediately after mount, using `router.replace` so the entry does not pollute browser history. It exists to remove one-time email credentials (verification, reset, deletion, change) from the URL before any observability tool (Umami, Faro) or the back-button can capture them.

## Key elements

- **`useClearQueryOnMount(route, router)`** – The sole export. Takes the active route and router instance (so the caller need not call `useRouter()` separately). Inside `onMounted`, calls `router.replace({ path: route.path, query: {} })` to swap the URL to the same path with an empty query object.

## Relationships

No dependency-graph neighbors are recorded for this file. It imports only from `vue` and `vue-router` (framework-level packages).

## Notes

- **`path`, not `name`.** The replace uses `route.path` deliberately so locale prefixes and dynamic route segments survive; only the query is dropped.
- **`replace`, not `push`.** Prevents a second back-navigation from landing the user on a URL that still carries the spent token.
- **Caller responsibility.** The token value must already be extracted into local form state *before* this composable runs; `router.replace` clears the URL but does not touch the caller's in-memory copy.
- **One-shot.** Uses `onMounted` (fires once), not a watcher or `onActivated`, so re-renders or tab switches will not re-trigger the replace.
