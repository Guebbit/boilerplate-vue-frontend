---
source: src/modules/webhooks/components/WebhookDeliveriesFilters.vue
sha256: f06bbd27df54c0b52b95d206cc6b60842783bab8a9c4de227216dd89f47c4f34
signature: 37b223d8d97d7e629a05532c46b441aece8d0370da8af675697ab75fc3bb25c0
generated_at: 2026-11-10T06:12:19.483556+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/components/WebhookDeliveriesFilters.vue

## Purpose

Combined filter bar, deliveries table, and pager for the webhook delivery log. It owns the local filter-form state (subscription, status, page) and converts user actions into `search` / `replay` events for the parent view. It never performs data fetching itself; all rendering is driven by props fed back from the parent.

## Key elements

- **Props** — `deliveries`, `total`, `pages`, `loading`, `subscriptions`, `replayingIds`, and optional `initialFilters` (used to seed the form for deep-link scenarios).
- **Emits** — `search` (full `WebhookDeliveryFilters` object) and `replay` (single delivery id).
- **`filters` (reactive)** — local form state; seeded from `initialFilters` so a deep-linked page renders pre-filtered.
- **`subscriptionOptions` / `statusOptions` (computed)** — select dropdown choices; the "all" row uses `null` (not `undefined`) to avoid a Vuetify quirk where `undefined` causes the item label to be posted as the value.
- **`subscriptionChoice` / `statusChoice`** — `useAnyFilterChoice` wrappers that bridge `null` (select model) ↔ `undefined` (filter field).
- **`tableHeaders` (computed)** — 10 columns (created-at, subscription, event-type, attempt, status, response-code, duration, error, next-attempt-at, actions).
- **`subscriptionLabel(id)`** — resolves a raw subscription id to its URL for display, falling back to the id if the subscription is no longer in the cache.
- **`statusColor(status)`** — maps `succeeded` → `success`, `exhausted` → `error`, everything else → `secondary`.
- **`handleSearch()`** — resets `filters.page` to 1, then emits `search`.
- **`handlePageChange(page)`** — sets the page and emits `search`.
- **Template slots** — per-column renderers using `formatDateTime`, `EMPTY_VALUE`, `statusLabel`, `subscriptionLabel`, and a replay button (disabled/loading when `replayingIds` contains the row id).

## Relationships

- **`src/modules/webhooks/views/WebhookDeliveries.vue`** — Parent view. Feeds all props (deliveries, pagination, subscriptions, loading, replayingIds, initialFilters) and listens for `search` and `replay` emits to perform fetching, URL-sync, and the replay API call.
- **`src/modules/webhooks/types.ts`** — Source of the `WebhookDeliveryFilters` type that shapes the `filters` reactive object and the `search` emit payload.
- **`src/modules/webhooks/tests/webhook-deliveries-rows.spec.ts`** — Integration/unit tests that mount this component (or the parent) and assert on row rendering, filter behavior, and replay-button state.

## Notes

- The "all" option in both selects uses `value: null`, **not** `undefined`. Vuetify treats an `undefined` item-value as "use the title string", which would silently post the translated label as the filter value. The `useAnyFilterChoice` composable handles the `null` ↔ `undefined` conversion so `filters.subscriptionId` / `filters.status` stay `undefined` when no filter is active.
- `handleSearch` always resets the page to 1; `handlePageChange` does **not** reset it. This prevents a stale page number from surviving a filter change.
- The component is deliberately presentational with respect to data: no `fetch`, no store access, no composable that triggers HTTP. All remote-side effects live in the parent view.
- `row-test="webhook-delivery-row"` and various `data-test` attributes are the stable selectors the test suite in `webhook-deliveries-rows.spec.ts` relies on.
