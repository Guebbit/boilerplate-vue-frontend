---
source: src/modules/tasks/views/TaskInbox.vue
sha256: 12bc07afaf00f25f63ffc1fccdb2e05f9a2597b2e39e1aaa733aa8bf3211ce67
signature: 12bc07afaf00f25f63ffc1fccdb2e05f9a2597b2e39e1aaa733aa8bf3211ce67
generated_at: 2026-11-10T06:02:09.533346+00:00
model: ollama:qwen3.8:27b
---

# src/modules/tasks/views/TaskInbox.vue

## Purpose

Staff-facing inbox for the public contact-form tasks. Wires the tasks Pinia store's paginated search to a filter form (text, email, status, category, assignee, source, kind, overdue), a server-side sort select, and a pager. Each row exposes the status transitions the server permits (resolve, mark-spam, reopen) plus "take" (assign-to-self) and a GDPR delete, with results synced to the URL for deep-linking.

## Key elements

- **Named component block (`export default { name: 'TaskInboxPage' }`)** — Gives the SFC a stable name for DevTools / `<KeepAlive>`; required because `<script setup>` cannot declare one.
- **`statusOptions` / `filterStatusOptions`** — Computed select items for the per-row status door and the filter-form status select (latter prepends a `null`-valued "any" row).
- **`filterCategoryOptions`, `filterSourceOptions`, `filterKindOptions`, `filterAssigneeOptions`** — Same pattern: a `null` "any" row plus one entry per enum value, i18n-labelled.
- **`useAnyFilterChoice`** — Bridges each filter select's `null` "any" sentinel to the store's `undefined`/absent filter value.
- **`isFiltered`** — Computed; true when any non-sort filter is set. Drives the empty-state wording.
- **`useListUrlState`** — Syncs `filters`, `pageCurrent`, `pageSize` to/from the URL query string so reloads and deep links restore the view.
- **`useListSearch` → `handleSearch` / `handleReset`** — Applies or clears filters, resets to page 1, and calls `syncUrl`.
- **`useServerSort` → `sortChoice`** — Binds the sort select to `filters.sort`; picking a new order re-searches from page 1.
- **`sortOptions`** — The four sort orders a triager reaches for: `createdAt`, `dueAt`, `status`, `email`.
- **`useBlockingError` + `useRowActions`** — Shared blocked state for row-write failures (status move, take, delete). Search/reset failures toast separately via `notifyErrorMessages`.
- **`handleDoor`** — Runs one status transition (`resolve`, `markSpam`, `reopen`) then re-fetches the current page (an active filter may no longer match the row).
- **`handleTake`** — Assigns the task to `session.viewer?.id` and re-fetches.
- **`handleDelete`** — `runConfirmed` path: explicit confirmation naming the subject, then `deleteRequest`.

## Relationships

- **`src/modules/tasks/store.ts`** — Primary data source. Destructures `filters`, `pageItemList`, `pageCurrent`, `pageSize`, `pageTotal`, `loading` via `storeToRefs`, and calls `watchSearchRequests`, `resolve`, `markSpam`, `reopen`, `assign`, `deleteRequest` for all row actions.
- **`src/modules/tasks/task-kind.ts`** — Imports `taskKindKey` (used to render the kind badge/label on each row).
- **`src/modules/tasks/task-ref.ts`** — Imports `taskRef` (used to build the deep link to a task's detail page).
- **`src/modules/tasks/tests/inbox-view.spec.ts`** — Unit/integration spec for this component; exercises the filter form, row actions, and URL-state sync described above.

## Notes

- **`null` vs `undefined` in "any" filter rows:** The "any" option's `value` is explicitly `null`, not `undefined`. Vuetify interprets an `undefined` item value as "use the `title` as the value," which would post the translated label string to the store instead of clearing the filter.
- **Row-action error is blocking; search error is ambient:** A failed status-move/take/delete sets `rowActionError` (rendered as an `InlineErrorAlert` above the list). A failed search/reset only toasts — the list stays visible with stale data.
- **Re-fetch after row action:** `handleDoor` and `handleTake` call `search(true)` after the write succeeds because an active filter (e.g. status = "open") may no longer match the row's new state, and the pager's total could shift.
- **Two `<script>` blocks:** The first is a plain `export default { name }` block (non-setup) required solely for the component name; all logic lives in `<script setup>`.
