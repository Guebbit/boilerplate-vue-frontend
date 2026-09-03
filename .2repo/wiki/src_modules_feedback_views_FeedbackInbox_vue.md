# src/modules/feedback/views/FeedbackInbox.vue

## Purpose

Admin inbox view for the public contact/feedback form. On mount it loads the full ticket list from the feedback store, then renders each ticket as a card where an operator can change the ticket's status or delete it (GDPR erasure path). All user-facing strings go through `vue-i18n`.

## Key elements

- **`statusOptions`** (computed) — maps every `FeedbackRequestStatus` enum value to a labelled `{ value, title }` pair for the per-row `v-select`.
- **`handleStatus(requestId, status)`** — calls `updateStatus` from the feedback store; toasts success or errors via `notifyErrorMessages`.
- **`handleDelete(requestId, subject)`** — opens a confirmation dialog (`useDialogStore().confirm`) naming the ticket's subject; on acceptance calls `deleteRequest`, then toasts the result.
- **`onMounted(fetchRequests)`** — triggers the initial list fetch when the page mounts.
- **Template** — `v-empty-state` when no tickets; otherwise a `v-card` per ticket with subject, sender info, timestamp (`formatDateTime`), a compact `v-select` for status, a delete `v-btn`, and the message body (`whitespace-pre-line`).

## Relationships

- **`@/modules/feedback/store.ts`** (`useFeedbackStore`) — provides `requests`, `loading`, `fetchRequests`, `updateStatus`, `deleteRequest`.
- **`@/ui/dialog.ts`** (`useDialogStore`) — supplies the confirmation dialog before deletion.
- **`@/infrastructure/utils/errors.ts`** (`notifyErrorMessages`) — formats and dispatches error toasts.
- **`@/infrastructure/utils/formatters.ts`** (`formatDateTime`) — renders `createdAt` for display.
- **`@types`** (`FeedbackRequestStatus`) — the shared status enum/union used for both the select options and the handler signatures.
- **`@/app/layouts/LayoutDefault.vue`** — page chrome (header, id, title).
- **`@guebbit/vue-toolkit`** (`useNotificationsStore`) — toast messages.

The listed graph neighbor `src/infrastructure/utils/logger.ts` is **not** imported or referenced in this file's source.

## Notes

- The component name is set in a separate non-`setup` `<script>` block (`FeedbackInboxPage`) alongside `<script setup>` — a standard Vue 3 pattern for declaring `name` when using `setup`.
- Deletion is intentionally a two-step flow (confirm dialog → API call) to prevent accidental GDPR erasure; the subject is interpolated into both the confirm message and the button `aria-label`.
- The `v-select` uses `:model-value` + `@update:model-value` (not `v-model`) because the store's `requests` array is the single source of truth; the list is reloaded after a successful status change.
- `data-test` attributes are present on the card, status select, and delete button for E2E selectors.
