---
source: src/modules/webhooks/components/WebhookDeliveriesFilters.vue
sha256: 1f80da89c091e6092a52c16e0247f3f6b135b01c27a370cfcfb2e6f2e4f102de
generated_at: 2026-10-17T01:50:26.929872+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/components/WebhookDeliveriesFilters.vue

## Purpose

Presentational filter bar, deliveries table, and pager for the webhook delivery log. Owns the filter form's local state and emits it upward; never fetches data itself. The parent view (`WebhookDeliveries.vue`) owns all fetching, URL-query sync, and the in-flight replay set. The pattern mirrors `admin/components/AdminAuditTab.vue` (filters + table + pager in one component).

## Key elements

- **Props** — `deliveries`, `total`, `pages`, `loading`, `subscriptions`, `replayingIds`, `initialFilters`. All data is fed in; the component renders declaratively.
- **Emits** — `search (WebhookDeliveryFilters)` and `replay (id: string)`. The parent handles the actual API call and URL sync.
- **`filters` (reactive)** — Local filter state (`subscriptionId`, `status`, `page`), seeded from `initialFilters` so deep links (e.g. subscription detail page) pre-apply the correct filter.
- **`subscriptionOptions` / `statusOptions`** — Computed select-option arrays. The "all" row uses `value: null` (not `undefined`) to avoid a Vuetify quirk where `undefined` causes the label string to be posted instead of a no-filter sentinel.
- **`subscriptionChoice` / `statusChoice`** — Built via `useAnyFilterChoice` composable, bridging the `null` ↔ `undefined` gap between the select model and the filter object.
- **`tableHeaders`** — Computed `CoreDataTableHeader<WebhookDelivery>[]`; re-translates on locale change.
- **`subscriptionLabel(id)`** — Resolves a delivery's `subscriptionId` to its URL for display; falls back to the raw id if the subscription is no longer in the cache.
- **`statusLabel` / `statusColor`** — Localized chip text and Vuetify color (`success` / `error` / `secondary`).
- **`handleSearch`** — Resets `filters.page` to 1, then emits `search`. Called on form submit and on either select change.
- **`handlePageChange`** — Sets `filters.page`, emits `search`. Bound to `ListPagination`.
- **Template slots** — `DataTable` item slots render `createdAt`, `subscriptionId`, `eventType`, `status` (chip), `responseCode`, `durationMs`, `error`, `nextAttemptAt`, and an `actions` slot with a Replay button (disabled while `in-flight` or already replaying).

## Relationships

- **`src/modules/webhooks/views/WebhookDeliveries.vue`** — Parent view. Passes all props down, handles `search` (fetch + URL query) and `replay` (API call + `replayingIds` set) emits upward.
- **`src/modules/webhooks/types.ts`** — Source of the `WebhookDeliveryFilters` type used for props, the reactive state, and the `search` emit payload.
- **`src/modules/webhooks/tests/webhook-deliveries-rows.spec.ts`** — Test file that exercises the row-rendering slots (`data-test` attributes: `webhook-delivery-row`, `webhook-delivery-status`, `webhook-delivery-event`, `webhook-delivery-replay`).

## Notes

- **`null` vs `undefined` in selects:** Both `subscriptionOptions` and `statusOptions` deliberately use `value: null` for the "all" entry. Vuetify interprets `undefined` as "use the item's title as the value," which would post the translated label string into the filter instead of clearing it.
- **Page reset on filter change:** Any change to subscription or status resets the page to 1 before emitting `search`, so the user never lands on an out-of-range page for the new filter set.
- **Replay button gating:** Disabled when the row's status is `in-flight` *or* the id is already in `replayingIds` (the set the parent tracks). Shows a loading spinner when in-flight via `replayingIds`.
- **Empty-value convention:** Missing numeric/optional fields render the shared `EMPTY_VALUE` constant rather than a blank cell.
- **Data-test attributes** are present on every filter input, status chip, event-type span, and replay button for e2e/Cypress selectors.
