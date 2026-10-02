---
source: src/modules/locales/views/LocaleEntries.vue
sha256: 5776911b293354f2795635e47b25dbfd58a156d416f11dbf6330eb66ea441f61
generated_at: 2026-10-02T15:16:50.094951+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/views/LocaleEntries.vue

## Purpose

Route view for `/locales/:tag` that lists, searches, and edits one language's translation entries with pagination. Every successful write (add, inline edit, delete, import) triggers `refreshRunningLocale` so the currently-running app picks up the change without a reload.

## Key elements

- **`tag`** (computed) – the language code read from `route.params.tag`; drives all store calls.
- **`capability`** (computed) – the manifest row for this language, shown in the page header.
- **`tenantChoice`** (computed getter/setter) – maps the "every tenant" sentinel (`''`) to `undefined` in the store and back, so the API receives no filter when "all" is selected.
- **`handleSearch`** – resets to page 1 and fires the store's cached search bound to `filters`.
- **`handleAdd`** – delegates to `localesStore.addEntry`, then refreshes the list and running locale; on failure blocks `EntryFormDialog` open via `applyServerErrors` / `reportAddError`.
- **`handleValueBlur`** – saves a single row's value if the draft differs from the stored value; shows a transient ✓ on the row rather than a toast.
- **`handleDelete`** – asks for confirmation via `useDialogStore().confirm`, then calls `localesStore.removeEntry`; failure surfaces in the shared `rowActionError` alert above the table.
- **`handleImport`** – executes a batch merge/replace through `localesStore.importEntries`, then refreshes the list, the manifest, and the running locale.
- **`tableHeaders`** (computed) – localised column definitions for `DataTable`; the `actions` column is synthetic (rendered via slot).
- **`useBlockingError` instances** – one per dialog (`addError`, `importError`) and one shared for row-level writes (`rowActionError`); stale messages are cleared on dialog open.
- **`drafts` / `savedRows`** – local `Record<string, …>` maps that let a blur handler distinguish a real edit from a click-through and show per-row save feedback.

## Relationships

No direct imports of the listed graph neighbors are visible in this file. The component interacts with:

- **`@/modules/locales/store.ts`** (`useLocalesStore`) – all reads and writes (search, add, edit, remove, import, fetch languages/tenants) flow through this Pinia store.
- **`@/infrastructure/locale-overrides.ts`** (`refreshRunningLocale`) – called after every successful write to re-hydrate the live dictionary.
- **`@/modules/locales/components/EntryFormDialog.vue`** and **`EntriesImportDialog.vue`** – child dialogs; this page owns their open/close state, feeds them success/failure, and reads their `applyServerErrors` method.
- **`@/ui/organisms/DataTable.vue`** – renders the entry rows; this page supplies headers, row actions, and the blocking-error alert.
- **`@/ui/molecules/ListPagination.vue`** – page navigation bound to `pageCurrent` / `entriesPageTotal`.
- **`@/infrastructure/utils/errors.ts`** (`notifyErrorMessages`) – toast-level error reporting for search failures.
- **`@/infrastructure/utils/use-blocking-error.ts`** – small composable backing each "stay-open" error state.

## Notes

- **Keys are identity, not editable.** The key column is disabled; the API treats a key change as delete + add, so the UI simply does not offer the shortcut.
- **"Every tenant" sentinel is `''`, not `undefined`.** Vuetify interprets a missing `value` as "use the title," which would have sent the label text to the API. The computed `tenantChoice` translates `''` ↔ `undefined` at the boundary.
- **`filters.tag` is set synchronously on component init** (before any `watch` fires) so the store's search-cache key includes the tag on the very first request.
- **Error-channel split:** ambient failures (search) → toast; blocking failures (add, import, inline edit, delete) → inline alert that keeps the dialog open or pins above the table. See the project's `docs/theory/request-flow.md` for the rationale.
- **Per-row save feedback uses a 1.5 s checkmark**, not a toast, to avoid flooding the notification area during bulk inline edits.
- **`downloadBlob`** is imported (from `@guebbit/js-toolkit`) and is used in the truncated portion for the export/download action visible via the `Download` icon.
