---
source: src/modules/webhooks/views/WebhooksList.vue
sha256: ea0ad80be0d7a46dcb330f258f2b6b63313a385148943276bdc9878ba59731ff
generated_at: 2026-10-17T01:53:57.560566+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/views/WebhooksList.vue

## Purpose

Renders the webhook-subscriptions list page: a filter form (enabled status + page size), a paginated `DataTable` with per-row view/edit/delete actions, and URL-synced state so deep links and reloads preserve the current view.

## Key elements

- **`WebhooksListPage`** — Named component block (separate `<script>` block) giving the SFC a stable name for devtools and `<KeepAlive>`; required because `<script setup>` cannot declare one.
- **`enabledOptions` / `enabledChoice`** — The "enabled" filter select. Uses `useAnyFilterChoice` so the "any" row posts `null` (not `undefined`) to the store, avoiding Vuetify's title-as-value fallback.
- **`tableHeaders`** — Computed array of `CoreDataTableHeader<WebhookSubscription>` definitions; includes a `synthetic: true` "actions" column that renders via the `item.actions` slot.
- **`handleDelete(subscription)`** — Opens a confirm dialog (`useDialogStore().confirm`), then calls `deleteSubscription` from the store. Success toasts; failure surfaces in the inline `InlineErrorAlert` above the table via `useBlockingError`.
- **`syncUrl`** — From `useListUrlState`; keeps `filters`, `page`, and `pageSize` in the query string. `enabled` is explicitly typed as `'boolean'` for correct serialization.
- **`handleSearch` / `handleReset`** — From `useListSearch`; reset page to 1, call the store-bound `search`, then sync the URL.
- **`search`** — Wraps the store's `watchSubscriptionsSearch` with an `onError` that toasts via `notifyErrorMessages`.
- **`rowActionError` / `reportRowActionError` / `clearRowActionError`** — From `useBlockingError`; drives the `InlineErrorAlert` shown when a delete fails (distinct from ambient search errors which only toast).
- **`rowActionSize`** — From `useTouchFriendlySize`; `small` on desktop, default (larger) below `sm` to meet WCAG touch-target guidelines.

## Relationships

- **`src/modules/webhooks/store.ts`** — Primary data source. The component destructures `watchSubscriptionsSearch` and `deleteSubscription` actions, and reads reactive state (`subscriptionFilters`, `subscriptionPageItemList`, `subscriptionPageCurrent`, `subscriptionPageSize`, `subscriptionsPageTotal`, `loadingSubscriptions`) via `storeToRefs`. All list state lives in the store; this view is purely presentational plus the delete-confirmation flow.
- **`src/infrastructure/utils/logger.ts`** — Transitive dependency (not directly imported here). Likely consumed internally by `errors.ts` or `use-blocking-error.ts`, which this file imports for error formatting/blocking-error state.

## Notes

- The "any" filter value is deliberately `null`, **not** `undefined`. Vuetify treats an `undefined` item value as "use the title text," which would post the translated label as a filter value instead of clearing the filter.
- Delete errors use the inline `InlineErrorAlert` (above the table), while search/fetch errors use a toast. This split is intentional: the confirm dialog has already dismissed by the time the delete request resolves, so there is no per-row surface left to host the alert. See the inline comment referencing `docs/theory/request-flow.md`.
- The `actions` column header is marked `synthetic: true` because it maps to no field on `WebhookSubscription`; the cell content comes entirely from the named slot.
- The delete button uses `@click.stop` to prevent the table row (or any parent) from reacting to the event.
