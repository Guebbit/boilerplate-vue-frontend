---
source: src/modules/webhooks/views/WebhooksList.vue
sha256: 78bb784f5d7dc98bd3287ce209b3f85ffc26973c17c4d77feca80fa03cac0520
signature: 78bb784f5d7dc98bd3287ce209b3f85ffc26973c17c4d77feca80fa03cac0520
generated_at: 2026-11-10T06:18:30.984668+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/views/WebhooksList.vue

## Purpose

List/search page for webhook subscriptions. Wires the Pinia store's paginated search to a filter form (status + page size), renders results in a `DataTable` with per-row view/edit/delete actions, and keeps filters and pagination in sync with the URL for deep-linking.

## Key elements

- **`statusOptions`** (computed) — Localized select options for the status filter: `null` (any), `'enabled'`, `'paused'`, `'auto-disabled'`. Uses `null` (not `undefined`) for the "any" value to avoid a Vuetify quirk.
- **`statusChoice`** — `useAnyFilterChoice` binding that maps the 3-state UI select onto the two boolean server filters (`enabled`, `autoDisabled`) via `statusOfFilter` / `filterOfStatus`.
- **`tableHeaders`** (computed) — Localized column definitions for the `DataTable`, including a synthetic `actions` column rendered via slot.
- **`syncUrl`** — `useListUrlState` instance; writes `filters`, `pageCurrent`, and `pageSize` into the query string on apply/reset.
- **`search` / `handleSearch` / `handleReset`** — Store-bound search with error-toast on failure; `useListSearch` resets to page 1 on apply or clear.
- **`rowActionError` / `reportRowActionError` / `clearRowActionError`** — `useBlockingError` state for the delete flow; surfaced as an `InlineErrorAlert` above the table (the confirm dialog is already closed by the time the response arrives).
- **`handleDelete`** — `runConfirmed` pipeline: confirm dialog → `deleteSubscription` → success toast, or `reportRowActionError` on failure.
- **`rowActionSize`** — `useTouchFriendlySize` toggles between `small` (desktop) and Vuetify default (mobile) button sizing for WCAG touch-target compliance.

## Relationships

- **`src/modules/webhooks/store.ts`** — Primary data source. Destructures `watchSubscriptionsSearch`, `deleteSubscription`, and reactive refs (`subscriptionFilters`, `subscriptionPageItemList`, `subscriptionPageCurrent`, `subscriptionPageSize`, `subscriptionsPageTotal`, `loadingSubscriptions`) via `storeToRefs`.
- **`src/modules/webhooks/domain/subscription-status.ts`** — Provides the `SubscriptionStatus` type and the `filterOfStatus` / `statusOfFilter` mapping functions that translate between the 3-state UI and the 2-field API filter.
- **`src/modules/webhooks/components/SubscriptionStatusChip.vue`** — Rendered in the table's status column slot to display the per-row subscription status chip.

## Notes

- The file declares its component name in a separate `<script lang="ts">` block (not in `<script setup>`) so that `<KeepAlive>` and devtools can identify it.
- Status mapping is non-trivial: "paused" means `enabled: false` **and** `autoDisabled: false`; "auto-disabled" means `enabled: false` **and** `autoDisabled: true`. The chip reads the same two fields back.
- Delete errors are *not* toasted (unlike search errors); they surface in the `InlineErrorAlert` above the table because the confirm dialog has already closed and there is no row-level surface left. See `docs/theory/request-flow.md` for the distinction.
- `item.actions.update` / `item.actions.delete` are booleans on the row data that gate visibility of the edit and delete buttons respectively.
- The "Create" button navigates via `routerLinkI18n({ name: 'WebhookCreate' })`; it is not an action handled in this file.
