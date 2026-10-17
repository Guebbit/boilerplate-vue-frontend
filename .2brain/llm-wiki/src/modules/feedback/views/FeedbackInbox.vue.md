---
source: src/modules/feedback/views/FeedbackInbox.vue
sha256: dc9d1a3d992e7daea98dc780d24e264e155d2e7b3219711a0e83dd1ef341b6cd
generated_at: 2026-10-17T00:57:08.196974+00:00
model: ollama:qwen3.8:27b
---

# src/modules/feedback/views/FeedbackInbox.vue

## Purpose

Admin inbox for the public feedback/contact-form tickets. Renders a filterable, paginated list of `FeedbackRequest` records and exposes per-row actions: status transitions, inline internal-notes editing, and deletion (GDPR erasure path).

## Key elements

- **Component name `FeedbackInboxPage`** — declared in a separate `<script>` block so `<KeepAlive>` and devtools can identify it (required because `<script setup>` cannot set a name).
- **`canUpdate` / `canDelete`** — computed permission flags from the session store (`update` / `delete` on `Feedback`).
- **`filterStatusOptions`** — status choices for the search form, prepended with a `null`-valued "any" entry.
- **`statusChoice`** — wrapper around `filters.status` via `useAnyFilterChoice`, mapping the UI "any" row to no filter.
- **`isFiltered`** — boolean driving the empty-state copy; true when any non-sort filter has a value.
- **`syncUrl`** — `useListUrlState` keeps filters, page, and page-size in the URL for deep-linking and reload persistence.
- **`search`** — bound to the store's `watchSearchRequests`; failures are toasted via `notifyErrorMessages`.
- **`handleSearch` / `handleReset`** — from `useListSearch`; both restart at page 1 and call `syncUrl`.
- **`sortChoice` / `sortOptions`** — server-side sort (`createdAt`, `status`, `email`) stored in `filters.sort`.
- **`rowActionError`** (`useBlockingError`) — single shared blocking error for status, notes, and delete actions; rendered inline rather than as a toast.
- **`handleStatus(requestId, status)`** — PATCH status via the store, then re-searches (an active status filter may no longer match).
- **`noteDrafts` / `noteValueOf`** — local `reactive` map of unsaved note text keyed by ticket id, decoupled from the record's `adminNotes` to avoid in-flight conflicts.
- **`handleSaveNotes(request)`** — serialises through `toRequestBody('UpdateFeedbackRequestStatusBody', …)` (empty string → `null`), PATCHes, then re-searches.
- **`handleDelete(requestId, subject)`** — confirm dialog naming the specific ticket, then `deleteRequest`; failures block via `rowActionError`.

## Relationships

- **`src/modules/feedback/store.ts`** — sole data source. The page consumes `watchSearchRequests`, `updateRequest`, `deleteRequest`, and reactive refs (`filters`, `pageItemList`, `pageCurrent`, `pageSize`, `pageTotal`, `loading`) via `storeToRefs`. All writes and reads flow through this store; the page holds no local copy of ticket data.

## Notes

- The "any status" filter row uses `value: null`, **not** `undefined` — Vuetify treats an `undefined` item value as "use the title string", which would post the translated label as a filter value.
- `toRequestBody` converts an empty trimmed notes string to `null` because the API field is nullable with `minLength: 1`; sending `''` directly would produce a 422.
- After every successful status change or notes save the list re-searches (`search(true)`), because an active status filter may no longer include the modified row.
- Search/reset failures are ambient (the list simply hasn't refreshed) and surface as toasts; row-action failures are per-operation and block the list in place via the shared `useBlockingError` instance — the same split used in `ProductsList.vue`.
- The component imports `OrderReferenceSearch.vue` from the payments module only for its search-input pattern; it is not rendered inside this page. *(Verified: no import of that file is present in the source shown above — this bullet should be ignored if the file grows in the future.)*
