---
source: src/modules/webhooks/views/WebhookDeliveries.vue
sha256: 5c9388bb31feb6af32bad9a0d0a018c6f4858bab5701f3dc76da8b4cb3aabd8b
signature: 5c9388bb31feb6af32bad9a0d0a018c6f4858bab5701f3dc76da8b4cb3aabd8b
generated_at: 2026-11-10T06:17:31.607491+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/views/WebhookDeliveries.vue

## Purpose

Renders the webhook delivery log as a dedicated, bookmarkable route. It wires the webhooks store's paginated search to `WebhookDeliveriesFilters`, keeps the active filters and page in the URL query string, and exposes a per-row replay action. Living on its own route (rather than a tab) lets a filtered view—e.g. "failed deliveries for subscription X"—be deep-linked or handed to a support agent.

## Key elements

- **`WebhookDeliveriesPage`** (named export) — gives the SFC a stable `name` for devtools and `<KeepAlive>`; required because `<script setup>` cannot declare one.
- **`handleSearch(filters)`** — writes the filter bar's values into the store's reactive state, syncs the URL via `syncUrl()`, and re-runs the store-backed search.
- **`handleReplay(id)`** — replays a single delivery, tracking the in-flight id in `replayingIds` so only that row shows a spinner.
- **`replayingIds`** — a reactive `Set<string>` of delivery ids currently replaying; passed to the filters component for per-row button state.
- **`syncUrl`** (from `useListUrlState`) — reads filter/page from the URL on mount and writes them back after each search, making the view shareable and reload-safe.
- **`search`** (from `watchDeliveriesSearch`) — the store's search bound with an `onError` toast handler; called once on mount to load the initial page.
- **`initialFilters`** — snapshot of the store's current filter/page state, passed to the filter bar as its starting values.
- **`onAmbientError`** (from `useAmbientError`) — catches failures of background reads (subscription list fetch) that have no inline form to host an error.

## Relationships

- **`src/modules/webhooks/store.ts`** — Primary data source. Provides `fetchAllSubscriptions`, `watchDeliveriesSearch`, `replayDelivery` actions, and reactive state (`subscriptionsList`, `deliveryFilters`, `deliveryPageCurrent`, `deliveryPageItemList`, `deliveriesPageTotal`, `deliveriesTotalItems`, `loadingDeliveries`) consumed via `storeToRefs`.
- **`src/modules/webhooks/components/WebhookDeliveriesFilters.vue`** — Sole child in the template. Receives deliveries, pagination, subscriptions, `replayingIds`, and `initialFilters`; emits `search` and `replay` events handled by `handleSearch` / `handleReplay`.
- **`src/modules/webhooks/types.ts`** — Provides the `WebhookDeliveryFilters` type used for `initialFilters` and the `handleSearch` parameter.

## Notes

- The component uses a separate plain `<script>` block solely to declare `name`; `<script setup>` cannot do this itself.
- `useListUrlState` validates `status` against `Object.values(WebhookDeliveryStatus)`, so a hand-edited or stale URL parameter is silently dropped rather than sent to the API.
- `replayingIds` exists because the store's `loadingDeliveries` is a blanket flag; without the per-row Set, a single replay would freeze the entire table.
- The initial `void search()` call carries an `eslint-disable` for floating promises: the `onError` handler already reports failures via toast, so the unhandled-promise lint is suppressed intentionally.
- This page deliberately does **not** import `logger.ts`, `PreordersBoard.vue`, or `OrderReferenceSearch.vue`; any appearance of those in a dependency graph is transitive or coincidental.
