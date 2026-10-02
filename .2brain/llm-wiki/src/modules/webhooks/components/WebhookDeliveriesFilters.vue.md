---
source: src/modules/webhooks/components/WebhookDeliveriesFilters.vue
sha256: 2c5355792f8cf1ce0ff2e16c3e923793fb18e5a8cda42c2a4eea84c8e87fcf33
generated_at: 2026-10-02T15:54:30.845548+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/components/WebhookDeliveriesFilters.vue

## Purpose

Presents the webhook delivery log's filter bar, results table, and pager in a single presentational component. It owns the filter form's local state (subscription, status, page) and emits `search` / `replay` events to the parent view, which is responsible for all data fetching, URL query sync, and the in-flight replay set. No network calls are made here.

## Key elements

- **Props** — `deliveries`, `total`, `pages`, `loading`, `subscriptions`, `replayingIds`, optional `initialFilters`. The component is fully driven by parent-supplied data.
- **Emits** — `search` (filtered `WebhookDeliveryFilters`) and `replay` (delivery `id`).
- **`filters` (reactive)** — Local form state seeded from `initialFilters` for deep-link support; reset to page 1 on every search.
- **`subscriptionOptions` / `statusOptions` (computed)** — Select item arrays whose "all" entry uses `null` (not `undefined`) to avoid Vuetify treating the value as a missing key.
- **`subscriptionChoice` / `statusChoice`** — `useAnyFilterChoice` bindings that bridge the `null` ↔ `undefined` gap between the select model and the `filters` object.
- **`tableHeaders` (computed)** — Localized `CoreDataTableHeader<WebhookDelivery>[]` re-evaluated on locale change.
- **`subscriptionLabel` / `statusLabel` / `statusColor`** — Display helpers; subscriptions render by URL (falling back to raw id if not cached), status maps to a Vuetify chip color.
- **`handleSearch` / `handlePageChange`** — Mutate `filters.page`, then emit `search` with a shallow copy of `filters`.

## Relationships

No graph neighbors were provided. The component depends on shared UI (`DataTable`, `ListPagination`), the `useAnyFilterChoice` composable, and the `WebhookDelivery` / `WebhookDeliveryStatus` / `WebhookSubscription` types, but no parent or sibling file is listed in the dependency graph.

## Notes

- **FA51 / `null` vs `undefined` in select items** — The "all" option's value must be `null`. Vuetify interprets an `undefined` item value as "use the item's title as the value," which would POST the translated label string instead of clearing the filter.
- **Replay button state** — Disabled when the delivery is `in-flight` *or* its id is in `props.replayingIds`; shows a loading spinner while replaying.
- **Subscription display** — Shown by `url`, not `id`. If the subscription has been deleted and is absent from the cache, the raw id is rendered as a fallback.
- **Same pattern as `admin/components/AdminAuditTab.vue`** — Filter bar + table + pager co-located in one component; parent owns all side effects.
- **`initialFilters` is one-way** — It seeds the reactive state once at setup; subsequent filter changes are purely local until the user triggers a search.
