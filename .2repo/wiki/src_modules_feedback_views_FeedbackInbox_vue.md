# src/modules/feedback/views/FeedbackInbox.vue

## Purpose

Admin inbox page for the public contact/feedback form. On mount it fetches the full ticket list and renders each ticket as a card with a status dropdown, letting an admin move a ticket through its lifecycle in a single click.

## Key elements

- **`FeedbackInboxPage`** (named default export) — the page component; wraps content in `LayoutDefault`.
- **`statusOptions`** (computed) — maps every `FeedbackRequestStatus` enum value to `{ value, title }` pairs, labelling each via the i18n key `feedback-inbox-page.status-<value>`.
- **`handleStatus(requestId, status)`** — calls `updateStatus` from the feedback store; on success toasts a message, on failure delegates to `notifyErrorMessages`.
- **`onMounted(fetchRequests)`** — triggers the initial list fetch from the store.
- **Template** — `v-empty-state` (with lucide `Inbox` icon) when the list is empty; otherwise a `v-for` of `v-card` rows, each containing subject, sender info, timestamp (`formatDateTime`), message body, and a `v-select` bound to `request.status`.
- **Store refs** — `requests` and `loading` are pulled from `useFeedbackStore` via `storeToRefs`; a single `loading` flag is shared across all selects.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — Indirect dependency. This page dispatches error toasts through `notifyErrorMessages` (from `@/infrastructure/utils/errors.ts`), which is expected to use the project logger internally. No direct import of `logger.ts` exists in this file.

## Notes

- The component uses the dual-script pattern (`<script>` for the `name` option, `<script setup>` for logic) so that devtools and i18n can resolve a stable component name.
- The `v-select` `@update:model-value` handler casts the emitted value to `TFeedbackRequestStatus` inline; there is no runtime validation beyond the enum options list.
- All user-facing strings are i18n keys under the `feedback-inbox-page.*` namespace — adding a new status requires both a new enum member and a matching translation key.
- `data-test` attributes (`feedback-item`, `feedback-status`) are present for E2E test selectors.
