---
source: src/modules/feedback/views/FeedbackInbox.vue
sha256: 5d1f9ca66e17293e45e1b15a22475d0baf742bca7fbd9d7f67897031ae7f7808
generated_at: 2026-10-02T15:08:32.739343+00:00
model: ollama:qwen3.8:27b
---

# src/modules/feedback/views/FeedbackInbox.vue

## Purpose

Admin-facing inbox for public feedback tickets. Renders a paginated, filterable, sortable list of `FeedbackRequest` records and exposes per-row actions (status transition, internal-notes edit, delete). It is the operator view for triaging contact-form submissions, including the GDPR erasure path (search → confirm → delete).

## Key elements

- **Filter form** — text, email, status, sort, and page-size inputs bound to the Pinia store's reactive `filters`; submitted via `useListSearch` → `watchSearchRequests`.
- **`statusOptions` / `filterStatusOptions`** — computed select items; the filter variant prepends an "any" entry with `value: null` (see Notes).
- **`statusChoice`** — `useAnyFilterChoice` wrapper that maps the UI's `null` "any" value to `filters.status` (unset) in the store.
- **`sortOptions` / `sortChoice`** — `useServerSort` keeps the sort key in `filters.sort`; picking a new order re-searches from page 1.
- **`syncUrl`** — `useListUrlState` keeps filters, page, and page-size in the query string for deep-linking and reload persistence.
- **`handleStatus(requestId, status)`** — PATCH the ticket's status, toast success, re-search the list; failures land in `rowActionError`.
- **`noteDrafts` / `noteValueOf` / `handleSaveNotes`** — per-ticket unsaved note drafts kept in a local reactive map so typing never clobbers an in-flight save; saves go through `toRequestBody('UpdateFeedbackRequestStatusBody', …)` then `updateRequest`.
- **`handleDelete(requestId, subject)`** — opens a `useDialogStore` confirmation naming the specific ticket, then calls `deleteRequest`.
- **`rowActionError`** — single shared `useBlockingError` instance for all row mutations (status, notes, delete); rendered as an `InlineErrorAlert` above the list.
- **`isFiltered`** — computed flag that switches the empty-state copy between "no tickets" and "no matches."

## Relationships

- **`src/infrastructure/utils/logger.ts`** — No direct import is visible in this file's source; the dependency is indirect, reached through the `@/infrastructure/utils/errors.ts` or `use-blocking-error.ts` chain that handle search and row-action error reporting.
- **`src/modules/payments/components/OrderReferenceSearch.vue`** — No direct import or interaction is visible in this file's source. The graph edge likely reflects a shared composable pattern (e.g. `useListSearch` / `useListUrlState`) or a cross-module reference tracked at the module level rather than a runtime call.

## Notes

- **`null` vs `undefined` for "any" status (FA51).** Vuetify treats an item with `value: undefined` as "use the title as the value," which would post the translated label as the filter. The "any" entry therefore uses `value: null`, and `useAnyFilterChoice` translates that back to an unset store field.
- **Empty-string → 422 on `adminNotes`.** The API schema marks `adminNotes` as nullable with `minLength: 1`. `toRequestBody` converts `''` to `null` so an intentionally cleared textarea produces a valid "clear notes" request rather than a validation error.
- **One shared blocking-error slot.** All three row actions (status, notes, delete) funnel into the same `useBlockingError` instance. This avoids per-row alert slots and keeps the list interactive while one action is failing. Search/reset failures, by contrast, are ambient and are reported via toast (`notifyErrorMessages`) instead.
- **Post-mutation re-search.** `handleStatus` and `handleSaveNotes` call `search(true)` after the write succeeds. This refreshes the list because the current status filter may no longer match the modified row.
- **`noteDrafts` isolation.** Drafts live in a local `reactive<Record<string, string | undefined>>` map, separate from the store's `adminNotes`. This prevents a user's in-progress typing from being overwritten by a concurrent save response for the same ticket.
