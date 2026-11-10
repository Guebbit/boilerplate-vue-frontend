---
source: src/modules/example/views/ExamplesList.vue
sha256: 036be57b8daa3849480bce153b187dc2196f4bf9821cab840104b40474e640ac
signature: 036be57b8daa3849480bce153b187dc2196f4bf9821cab840104b40474e640ac
generated_at: 2026-11-10T04:29:28.147812+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/views/ExamplesList.vue

## Purpose

List screen for the Example module. It wires the Pinia store's paginated search to a filter form and a server-sorted `DataTable`, keeps all list state (filters, page, sort) in the URL for shareable deep links, and renders per-row View / Edit / Delete actions plus a session-gated Create button.

## Key elements

- **`ExamplesListPage`** (named component block) — stable name for devtools and `<KeepAlive>`; `<script setup>` cannot declare one itself.
- **`statusOptions`** (computed) — localized filter choices; the "any" row uses `value: null` (not `undefined`) to avoid Vuetify's item-title fallback.
- **`statusChoice`** — `useAnyFilterChoice` adapter between the UI's `null` "any" sentinel and the store's absence of a `status` filter.
- **`statusColor`** — maps each `ExampleStatus` to a Vuetify theme color for the chip.
- **`tableHeaders`** (computed) — localized `CoreDataTableHeader<Example>[]`; the `actions` column is `synthetic: true` (no backing field).
- **`publicationText(example)`** — formats the row's publication state via `publicationOf` from the domain module.
- **`syncUrl`** — `useListUrlState` binding: syncs `filters`, `pageCurrent`, `pageSize`, and `sort` params to/from the URL.
- **`search`** — wraps `watchExamplesSearch` from the store; failed requests surface as toasts (ambient, non-blocking).
- **`handleSearch` / `handleReset`** — from `useListSearch`; both reset to page 1 and sync the URL.
- **`sortableKeys`** — derived from the `ExampleSortItem` enum; only these headers are clickable for server-side sort.
- **`sortBy`** — from `useServerSort`; lives inside `filters.sort` so it travels in the URL and the API request.
- **`rowActionError` / `reportRowActionError` / `clearRowActionError`** — `useBlockingError` state for the delete flow, rendered as an `InlineErrorAlert` above the table.
- **`handleDelete(example)`** — `useRowActions.runConfirmed`: confirm dialog → `deleteExample(id)` → success toast; failures set `rowActionError`.
- **`rowActionSize`** — `useTouchFriendlySize()`: `small` on desktop, Vuetify default below `sm` for WCAG touch-target compliance.

## Relationships

- **`src/modules/example/store.ts`** — primary data source. Provides `watchExamplesSearch`, `deleteExample`, and reactive state (`filters`, `pageItemList`, `pageCurrent`, `pageSize`, `pageTotal`, `loading`). The view never fetches directly; all reads and writes go through this store.
- **`src/modules/example/domain/index.ts`** — the import target (`import { publicationOf } from '../domain'`); re-exports the publication helper into the domain barrel.
- **`src/modules/example/domain/publication.ts`** — implements `publicationOf(example)`, which the view calls to derive the human-readable publication string shown in the `publishedAt` column.
- **`src/modules/example/tests/examples-list-view.spec.ts`** — the component's test spec; exercises the filter form, row actions, and delete confirmation flow described above.

## Notes

- **Two error channels.** Search failures are *ambient* (toast via `notifyErrorMessages`); the delete failure is *blocking* (inline `InlineErrorAlert` above the table). The confirm dialog closes before the request resolves, so the blocking alert must live outside the row.
- **`null` vs `undefined` in `statusOptions`.** Vuetify treats an `undefined` item value as "use the item's title," which would POST the translated label as a filter value. The "any" option deliberately uses `null`.
- **Create permission is row-less.** Edit and Delete permissions come from `item.actions.update` / `item.actions.delete` on each row. Create has no row, so it is gated by `session.can('create', 'Example')` at the button level.
- **Sort state lives in the URL.** Because `sortBy` is stored in `filters.sort`, a deep link reproduces the exact column order. Non-sortable headers remain inert (no re-fetch on click).
