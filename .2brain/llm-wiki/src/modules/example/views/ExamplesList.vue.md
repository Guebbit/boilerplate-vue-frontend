---
source: src/modules/example/views/ExamplesList.vue
sha256: f1917e365d9d7104ba79690fea752193f7fc4676009cee0519df36b45e568ab3
generated_at: 2026-10-17T00:55:22.789396+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/views/ExamplesList.vue

## Purpose

The list screen for the Example module. It wires a filter form (text + status) and a paginated `DataTable` to the module's Pinia store, exposes per-row view/edit/delete actions, and keeps the current filter/page state in the URL so views are shareable and survive reloads.

## Key elements

- **`ExamplesListPage`** (named component block) — gives the SFC a stable name for DevTools and `<KeepAlive>`; required because `<script setup>` cannot set `name` itself.
- **`statusOptions`** (computed) — builds the status filter's select items from `EXAMPLE_STATUSES`; the "any" entry uses `null` (not `undefined`) to avoid Vuetify misreading the value.
- **`statusChoice`** — wraps `useAnyFilterChoice` to map the select's `null` "any" value to a cleared store filter.
- **`statusColor`** — static `Record<ExampleStatus, string>` mapping each status to a Vuetify chip colour.
- **`tableHeaders`** (computed) — localised column definitions; the `actions` column is marked `synthetic` because its cell is rendered via a slot, not a row field.
- **`syncUrl`** — from `useListUrlState`; syncs `filters`, `pageCurrent`, and `pageSize` into the route query so deep links reproduce the view.
- **`search`** — wraps the store's `watchExamplesSearch` action; failures surface as toasts (ambient), not blocking errors.
- **`handleSearch` / `handleReset`** — from `useListSearch`; reset page to 1, invoke `search`, then call `syncUrl`.
- **`handleDelete(example)`** — opens a confirm dialog via `useDialogStore`; on acceptance calls `deleteExample` from the store. Success → toast; failure → `reportRowActionError` (blocking alert above the table).
- **`rowActionError` / `reportRowActionError` / `clearRowActionError`** — from `useBlockingError`; single-instance alert for the one write operation (delete) in the table.
- **`rowActionSize`** — from `useTouchFriendlySize`; returns `"small"` on desktop, Vuetify's default size below `sm` for WCAG touch-target compliance.
- **`session.can(...)`** — gates the Create, Edit, and Delete buttons using the server-provided capability rules (never a hardcoded role name).

## Relationships

- **`src/modules/example/store.ts`** — primary data source. The component reads reactive state (`filters`, `pageItemList`, `pageCurrent`, `pageSize`, `pageTotal`, `loading`) via `storeToRefs` and calls the actions `watchExamplesSearch` and `deleteExample`.
- **`src/modules/example/domain/index.ts`** — provides `EXAMPLE_STATUSES` (the enum of valid statuses used for filter options and URL param validation) and the `ExampleStatus` type imported from `@types`.
- **`src/modules/example/domain/statuses.ts`** — source of the `EXAMPLE_STATUSES` constant and `ExampleStatus` union re-exported through `domain/index.ts`.
- **`src/infrastructure/utils/logger.ts`** — no direct import in this file; interaction (if any) is indirect through the store or error utilities.

## Notes

- Two `<script>` blocks are intentional: the plain block sets `name` (needed for `<KeepAlive>` / DevTools), the `<script setup>` block holds all logic. Don't merge them.
- Filter state lives in the URL, not in local component state. The "apply" button (`handleSearch`) is what writes to the store and syncs the URL; merely typing in a field does nothing until submitted or the status select changes.
- The status select's "any" option uses `value: null`, not `undefined`. Vuetify treats an `undefined` item value as "display the label as the value," which would POST the translated string to the store.
- Delete is the only row action that mutates data. Its error is shown as a blocking `InlineErrorAlert` above the table (not a toast) because the confirm dialog is already closed by the time the request fails. Search failures, by contrast, are non-blocking toasts.
- `data-test` attributes are on every interactive element and key data cells (status chip, row actions) for the E2E test suite.
- The component is permission-gated at the button level via `session.can('create'|'update'|'delete', 'Example')`. A user who lacks a capability simply does not see the corresponding button—there is no disabled-but-visible fallback.
