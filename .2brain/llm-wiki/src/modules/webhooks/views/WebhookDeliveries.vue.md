---
source: src/modules/webhooks/views/WebhookDeliveries.vue
sha256: c9af92401bbb399a497a6a76469f8b93018b0d2fca493bfa0ac174f4b7b64454
generated_at: 2026-10-17T01:53:12.488061+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/views/WebhookDeliveries.vue

## Purpose

Route-level page component for the webhook delivery log. It wires the webhooks store's paginated search to the `WebhookDeliveriesFilters` child component and keeps the active filter state in the URL query string, making filtered views (e.g. "failed deliveries for subscription X") bookmarkable and shareable. It exists as a dedicated route rather than a tab so those deep links are stable (see `docs/modules/webhooks.md`).

## Key elements

- **Named block (`<script>`)** — Declares `name: 'WebhookDeliveriesPage'` for devtools and `<KeepAlive>`; required because `<script setup>` cannot set a component name.
- **`useQuerySyncedFilters`** — A composable that parses `subscriptionId`, `status`, and `page` from the URL on mount (`initialFilters`) and writes them back via `syncToQuery` after each search, keeping the route shareable.
- **`watchDeliveriesSearch` (store action)** — Returns a `search()` function bound to the store's reactive filter/pagination state; failures are surfaced through `notifyErrorMessages`.
- **`handleSearch(filters)`** — Entry point from the filter bar: writes filters and page into the store, syncs the URL, then triggers the search.
- **`handleReplay(id)`** — Calls the store's `replayDelivery`, tracks in-flight ids in a local `replayingIds` Set (so only the affected row shows a spinner), and toasts the outcome.
- **`fetchAllSubscriptions`** — Called once on mount to populate the subscription dropdown data in the store.
- **Template** — Renders a single `<WebhookDeliveriesFilters>` child, passing deliveries, totals, pagination, subscriptions, replaying-ids, initial filters, and forwarding `@search` / `@replay` events.

## Relationships

- **`../store.ts` (useWebhooksStore)** — Primary data source. The page destructures reactive state (`subscriptionsList`, `deliveryFilters`, `deliveryPageCurrent`, `deliveryPageItemList`, `deliveriesPageTotal`, `deliveriesTotalItems`, `loadingDeliveries`) and actions (`fetchAllSubscriptions`, `watchDeliveriesSearch`, `replayDelivery`) from this Pinia store.
- **`../components/WebhookDeliveriesFilters.vue`** — The sole child in the template. Receives all display data and emits `search` / `replay` events that the page handles.
- **`../types.ts`** — Provides the `WebhookDeliveryFilters` type used to type the filter objects passed between the page, the store, and the child component.

## Notes

- The page itself renders no table or list markup — all UI lives in `WebhookDeliveriesFilters`. This file is purely orchestration (store binding, URL sync, event handling).
- `replayingIds` is local to the page, not the store, deliberately: the store's `loadingDeliveries` is a blanket flag that would freeze the whole table, whereas the Set lets only the replaying row show a spinner.
- Initial load is synchronous at the end of `<script setup>`: it seeds `deliveryFilters` and `deliveryPageCurrent` from the URL, then calls `search()` without `await`. If a deep-link lands here, the first render will show loading state until that promise resolves.
- `WebhookDeliveryStatus` is imported from `@types` (a project-level type alias), not from `../types.ts`.
