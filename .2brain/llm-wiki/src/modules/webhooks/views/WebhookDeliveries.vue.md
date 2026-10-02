---
source: src/modules/webhooks/views/WebhookDeliveries.vue
sha256: e9be6c4aa683c5e37face4b5e5d4e8e688d9d0863dd4a2425622fc0f01aaa84f
generated_at: 2026-10-02T15:58:18.061925+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/views/WebhookDeliveries.vue

## Purpose

Route-level page component that renders the webhook delivery log. It binds the webhooks store's paginated search to the `WebhookDeliveriesFilters` child component, mirrors the active filter state (subscription, status, page) into the URL query string so filtered views are bookmarkable and shareable with support, and exposes a per-row "replay delivery" action.

## Key elements

- **`handleSearch(filters)`** — Entry point called by the filter bar on every search. Writes the new filters and page into the store, syncs them to the query string via `syncToQuery`, and delegates to the store's `search` action.
- **`handleReplay(id)`** — Triggers a single-delivery replay through the store, tracks in-flight ids in the local `replayingIds` set for per-row spinner UI, and reports success/failure as toasts.
- **`useQuerySyncedFilters` (composable call)** — Parses the initial filter state (subscriptionId, status, page) from the URL query on load and provides `syncToQuery` to write changes back. Normalises types (casts status, clamps page ≥ 1).
- **`watchDeliveriesSearch({ onError })`** — Store action wrapped with an error handler that dispatches toast messages via `notifyErrorMessages`.
- **`onMounted → fetchAllSubscriptions()`** — Populates the store's subscription list so the filter bar's dropdown has options before the first search.
- **`replayingIds` (reactive `Set<string>`)** — Tracks which delivery rows currently have a replay in flight, letting the child show a spinner on one row without freezing the table.
- **Initial load block (end of `<script setup>`)** — Seeds store filter/page refs from the parsed URL query and fires the first `search()` call synchronously after mount.

## Relationships

No direct import or runtime interaction with `src/infrastructure/utils/logger.ts` or `src/modules/payments/components/OrderReferenceSearch.vue` is present in this file's source. The error-reporting path uses `@/infrastructure/utils/errors.ts` (`notifyErrorMessages`) rather than the logger directly.

## Notes

- This is deliberately a **standalone route**, not a tab within the webhooks module, so that a filtered delivery view (e.g. "failed deliveries for subscription X") can be bookmarked or sent to support. Rationale is documented in `docs/modules/webhooks.md`.
- `replayingIds` exists because the store's blanket `loadingDeliveries` flag would freeze the entire table during a single-row replay; the local set gives row-level granularity.
- The `page` query param is omitted when it equals 1 (the default) to keep URLs clean.
- `initialFilters` is read **once** from the URL at component creation; subsequent navigation updates go through `syncToQuery`, not by re-reading the query.
