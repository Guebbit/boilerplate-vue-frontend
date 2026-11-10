---
source: src/modules/shop-tasks/store.ts
sha256: b142c1b8de579562dbc65c4a61560ec1305cd80be2a9553733fd793af00231fa
signature: 37c0e9ef64d7d3f60fb156dcb3f0a15a81392a4840761e5b746650de85d51aff
generated_at: 2026-11-10T05:43:22.992408+00:00
model: ollama:qwen3.8:27b
---

# src/modules/shop-tasks/store.ts

## Purpose

Pinia store that fetches the shop work summary (the number behind the staff navigation badges) and publishes those counts into the shared kernel store (`@/kernel/work-counts`). It holds no local state of its own; it exists solely to read the summary once per freshness window and write the result where the screen manifests can pick it up.

## Key elements

- **`useShopTasksStore`** — setup-style Pinia store (`'shop-tasks'`). Exposes a single action.
- **`loadSummary(forced?: boolean)`** — fetches the summary via `fetchAny` (non-record endpoint) and calls `setWorkCounts(counts)` to publish. `forced` bypasses the `staleTime` gate.
- **`fetchAny`** (from `useStructureRestApi`) — used because `getShopWorkSummary` returns a summary object, not a CRUD record. Configured with `resourceKey: 'shop-tasks'` and the global `queryClient`.
- **`asPassive()`** — wraps the HTTP call so the request is tagged as app-initiated; it must not prevent a staff session from idling out.
- **`BADGE_FRESH_MS`** (from `@/kernel/use-badge-refresh.ts`) — the `staleTime` shared across all badge reads, ensuring a single freshness window.

## Relationships

- **`src/modules/shop-tasks/composables/use-shop-work-feed.ts`** — the work-feed composable in the same module. It is a dependency-graph neighbor; the store's `loadSummary` is the entry point it (and the badge-refresh hook) call when the feed mutates and the counts need republishing.

## Notes

- The store intentionally keeps **zero** local data. The kernel's `work-counts` store is the single source of truth; reading badge counts should go through the kernel, not this store.
- Because the call is passive, do not rely on it to extend a user session. If a session-dependent action is needed, that belongs elsewhere.
- `staleTime` is `BADGE_FRESH_MS`, shared with every other badge in the app. Do not introduce a per-store freshness constant here.
